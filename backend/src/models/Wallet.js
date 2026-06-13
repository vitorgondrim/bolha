// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: models/Wallet.js
// Propósito: Modelo de Carteira de Usuário para Economia Interna.
//            Gerencia saldo de sopros, status VIP, multiplicadores
//            e histórico de transações com consistência atômica.
// ============================================================

const mongoose = require('mongoose');

// ============================================================
// SUB-SCHEMA: TRANSAÇÃO INDIVIDUAL (Audit Trail)
// ============================================================
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['purchase', 'consumption', 'bonus', 'refund', 'admin_adjustment'],
    required: [true, 'Tipo de transacao obrigatorio'],
  },
  amount: {
    type: Number,
    required: [true, 'Valor da transacao obrigatorio'],
  },
  balanceBefore: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  referenceModel: {
    type: String,
    enum: ['Bubble', 'User', 'Purchase', null],
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  _id: false, // Evita _id desnecessário em subdocumentos históricos
});

// ============================================================
// SCHEMA PRINCIPAL: WALLET
// ============================================================
const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // ============================================================
  // SALDO E ECONOMIA
  // ============================================================
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Saldo nao pode ser negativo'],
    validate: {
      validator: function (v) { return v >= 0; },
      message: 'Saldo invalido: nao pode ser negativo',
    },
  },
  lifetimePurchased: {
    type: Number,
    default: 0,
    min: 0,
  },
  lifetimeConsumed: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ============================================================
  // STATUS VIP E MULTIPLICADORES
  // ============================================================
  vipStatus: {
    type: String,
    enum: ['none', 'bronze', 'silver', 'gold'],
    default: 'none',
  },
  vipExpiresAt: {
    type: Date,
    default: null,
  },
  vipActivatedAt: {
    type: Date,
    default: null,
  },

  // Multiplicador de oxigênio por nível VIP
  // none = 1.0, bronze = 1.2, silver = 1.5, gold = 2.0
  oxygenMultiplier: {
    type: Number,
    default: 1.0,
    min: 1.0,
    max: 3.0,
  },

  // Limite diário de sopros (ajustado por VIP)
  // none = 3, bronze = 5, silver = 10, gold = 999 (ilimitado)
  dailySoproLimit: {
    type: Number,
    default: 3,
    min: 0,
    max: 999,
  },

  // ============================================================
  // HISTÓRICO DE TRANSAÇÕES (Audit Trail)
  // ============================================================
  transactionHistory: {
    type: [transactionSchema],
    default: [],
  },

  // Controle de versão para optimistic concurrency
  __v: {
    type: Number,
    select: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ============================================================
// ÍNDICES DE PERFORMANCE
// ============================================================
// Índice único para lookup rápido de carteira por usuário
walletSchema.index({ user: 1 }, { unique: true });

// Índice composto para consultas de VIP ativos
walletSchema.index({ vipStatus: 1, vipExpiresAt: 1 });

// Índice para auditoria: transações recentes por usuário
walletSchema.index({ 'transactionHistory.createdAt': -1 });

// ============================================================
// MÉTODOS DE INSTÂNCIA
// ============================================================

/**
 * Verifica se o VIP está ativo e não expirou.
 * Se expirou, rebaixa automaticamente para 'none'.
 */
walletSchema.methods.isVipActive = function () {
  if (this.vipStatus === 'none') return false;
  if (!this.vipExpiresAt) return false;
  if (new Date() > this.vipExpiresAt) {
    // Expirou — rebaixar (não salvamos aqui, apenas retornamos false)
    return false;
  }
  return true;
};

/**
 * Retorna o limite diário de sopros efetivo (considerando VIP).
 */
walletSchema.methods.getEffectiveDailyLimit = function () {
  if (this.isVipActive()) {
    return this.dailySoproLimit;
  }
  return 3; // Padrão para não VIP
};

/**
 * Retorna o multiplicador de oxigênio efetivo.
 */
walletSchema.methods.getEffectiveMultiplier = function () {
  if (this.isVipActive()) {
    return this.oxygenMultiplier;
  }
  return 1.0;
};

/**
 * Adiciona uma transação ao histórico com atomicidade.
 * Este método NÃO salva — apenas monta o objeto.
 */
walletSchema.methods.addTransaction = function ({
  type, amount, description, referenceId, referenceModel, metadata,
}) {
  const balanceBefore = this.balance;
  const balanceAfter = balanceBefore + amount;

  this.transactionHistory.push({
    type,
    amount,
    balanceBefore: Math.max(0, balanceBefore),
    balanceAfter: Math.max(0, balanceAfter),
    description: description || '',
    referenceId: referenceId || null,
    referenceModel: referenceModel || null,
    metadata: metadata || {},
    createdAt: new Date(),
  });

  return { balanceBefore, balanceAfter };
};

// ============================================================
// MÉTODOS ESTÁTICOS (Operações Atômicas)
// ============================================================

/**
 * Débito atômico de sopro da wallet.
 * Só executa se balance >= cost. Retorna null se saldo insuficiente.
 *
 * @param {ObjectId} userId - ID do usuário
 * @param {number} cost - Quantidade a debitar (padrão: 1)
 * @param {Object} transactionMeta - Metadados da transação
 * @returns {Object|null} Wallet atualizada ou null
 */
walletSchema.statics.atomicDebit = async function (userId, cost = 1, transactionMeta = {}) {
  const wallet = await this.findOneAndUpdate(
    {
      user: userId,
      balance: { $gte: cost },
    },
    {
      $inc: {
        balance: -cost,
        lifetimeConsumed: cost,
      },
      $push: {
        transactionHistory: {
          type: 'consumption',
          amount: -cost,
          balanceBefore: null, // será preenchido abaixo
          balanceAfter: null,
          description: transactionMeta.description || 'Consumo de sopro',
          referenceId: transactionMeta.referenceId || null,
          referenceModel: transactionMeta.referenceModel || null,
          metadata: transactionMeta.metadata || {},
          createdAt: new Date(),
        },
      },
    },
    {
      new: true,
      select: 'balance lifetimeConsumed transactionHistory',
    }
  );

  if (!wallet) {
    return null; // Saldo insuficiente
  }

  // Corrige balanceBefore e balanceAfter no último item do histórico
  // (o $push não permite calcular dinamicamente na mesma operação)
  const lastTx = wallet.transactionHistory[wallet.transactionHistory.length - 1];
  if (lastTx) {
    lastTx.balanceBefore = wallet.balance + cost;
    lastTx.balanceAfter = wallet.balance;
    await this.updateOne(
      { _id: wallet._id, 'transactionHistory.createdAt': lastTx.createdAt },
      {
        $set: {
          'transactionHistory.$.balanceBefore': lastTx.balanceBefore,
          'transactionHistory.$.balanceAfter': lastTx.balanceAfter,
        },
      }
    );
  }

  return wallet;
};

/**
 * Crédito atômico na wallet (compra, bônus, admin).
 *
 * @param {ObjectId} userId - ID do usuário
 * @param {number} amount - Quantidade a creditar
 * @param {Object} transactionMeta - Metadados da transação
 * @returns {Object} Wallet atualizada
 */
walletSchema.statics.atomicCredit = async function (userId, amount, transactionMeta = {}) {
  if (amount <= 0) {
    throw new Error('Valor do credito deve ser positivo');
  }

  const wallet = await this.findOneAndUpdate(
    { user: userId },
    {
      $inc: {
        balance: amount,
        lifetimePurchased: amount,
      },
      $push: {
        transactionHistory: {
          type: transactionMeta.type || 'purchase',
          amount,
          balanceBefore: null,
          balanceAfter: null,
          description: transactionMeta.description || 'Credito na carteira',
          referenceId: transactionMeta.referenceId || null,
          referenceModel: transactionMeta.referenceModel || null,
          metadata: transactionMeta.metadata || {},
          createdAt: new Date(),
        },
      },
    },
    {
      new: true,
      upsert: true, // Cria wallet se não existir
      select: 'balance lifetimePurchased transactionHistory',
    }
  );

  // Corrige balanceBefore e balanceAfter
  const lastTx = wallet.transactionHistory[wallet.transactionHistory.length - 1];
  if (lastTx) {
    lastTx.balanceBefore = wallet.balance - amount;
    lastTx.balanceAfter = wallet.balance;
    await this.updateOne(
      { _id: wallet._id, 'transactionHistory.createdAt': lastTx.createdAt },
      {
        $set: {
          'transactionHistory.$.balanceBefore': lastTx.balanceBefore,
          'transactionHistory.$.balanceAfter': lastTx.balanceAfter,
        },
      }
    );
  }

  return wallet;
};

/**
 * Aplica ou atualiza o status VIP de um usuário.
 */
walletSchema.statics.applyVipStatus = async function (userId, vipLevel, durationDays = 30) {
  const vipConfig = {
    bronze: { multiplier: 1.2, dailyLimit: 5 },
    silver: { multiplier: 1.5, dailyLimit: 10 },
    gold: { multiplier: 2.0, dailyLimit: 999 },
  };

  const config = vipConfig[vipLevel];
  if (!config) {
    throw new Error(`Nivel VIP invalido: ${vipLevel}`);
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const wallet = await this.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        vipStatus: vipLevel,
        vipExpiresAt: expiresAt,
        vipActivatedAt: new Date(),
        oxygenMultiplier: config.multiplier,
        dailySoproLimit: config.dailyLimit,
      },
      $push: {
        transactionHistory: {
          type: 'bonus',
          amount: 0,
          balanceBefore: null,
          balanceAfter: null,
          description: `VIP ${vipLevel.toUpperCase()} ativado por ${durationDays} dias`,
          referenceModel: 'User',
          referenceId: userId,
          metadata: { vipLevel, durationDays, expiresAt },
          createdAt: new Date(),
        },
      },
    },
    { new: true, upsert: true }
  );

  return wallet;
};

// ============================================================
// EXPORT
// ============================================================
const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: services/bubbleService.js
// Propósito: Serviço central de vitalidade (Oxygen Level) e
//            lógica de herança da Mente Coletiva.
// ============================================================

const Bubble = require('../models/Bubble');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');

// ============================================================
// CONSTANTES DO ECOSSISTEMA
// ============================================================
const OXYGEN = {
  MAX_DEFAULT: 100,
  DECAY_RATE_DEFAULT: 4.1667,   // 100 / 24h = ~4.17 O₂/hora
  CRITICAL_THRESHOLD: 0.15,     // 15% — zona crítica
  PROMOTION_BONUS: 20,          // O₂ ganho ao ser promovida de filha a mãe
  PROMOTION_MIN_RATIO: 0.30,    // Mínimo 30% de O₂ para ser promovida
  INJECTION: {
    LIKE: 8,       // ~2 horas de vida
    COMMENT: 12,   // ~3 horas de vida
    SOPRO: 40,     // ~10 horas de vida
    PROMOTION: 20, // ~5 horas de vida (bônus)
  },
  MAX_DEPTH: 5,                  // Profundidade máxima da árvore
};

// ============================================================
// 1. calculateVitality — Aplica decaimento sob demanda
// ============================================================

/**
 * Calcula e atualiza o oxygenLevel de uma bolha com base no tempo
 * desde a última verificação (lastOxygenDecayCheck).
 * 
 * Este método é IDEMPOTENTE: pode ser chamado quantas vezes quiser
 * sobre a mesma bolha sem efeitos colaterais duplicados.
 * 
 * @param {Object} bubble - Documento da bolha (mongoose ou POJO com _id)
 * @param {boolean} [save=true] - Se true, persiste as alterações no banco
 * @returns {Object} bubble atualizado com oxygenLevel recalculado
 */
const calculateVitality = async (bubble, save = true) => {
  const now = Date.now();
  const lastCheck = bubble.lastOxygenDecayCheck
    ? new Date(bubble.lastOxygenDecayCheck).getTime()
    : now;

  // Só recalcula se houve passagem de tempo significativa (>1s)
  const elapsedMs = now - lastCheck;
  if (elapsedMs < 1000) return bubble;

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const decayRate = bubble.oxygenDecayRate || OXYGEN.DECAY_RATE_DEFAULT;
  const decayAmount = elapsedHours * decayRate;

  const previousOxygen = bubble.oxygenLevel ?? OXYGEN.MAX_DEFAULT;
  const newOxygen = Math.max(0, previousOxygen - decayAmount);

  bubble.oxygenLevel = newOxygen;
  bubble.lastOxygenDecayCheck = new Date();

  // Sincroniza expiresAt como campo derivado (compatibilidade com queries existentes)
  const maxOxygen = bubble.maxOxygen || OXYGEN.MAX_DEFAULT;
  if (newOxygen > 0) {
    const hoursRemaining = newOxygen / decayRate;
    bubble.expiresAt = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);
  } else {
    bubble.expiresAt = new Date(); // Já expirou
  }

  if (save && bubble._id) {
    await Bubble.findByIdAndUpdate(bubble._id, {
      $set: {
        oxygenLevel: newOxygen,
        lastOxygenDecayCheck: bubble.lastOxygenDecayCheck,
        expiresAt: bubble.expiresAt,
      }
    });
  }

  return bubble;
};

// ============================================================
// 2. injectOxygen — Adiciona oxigênio e registra a injeção
// ============================================================

/**
 * Injeta oxigênio em uma bolha a partir de uma interação.
 * 
 * @param {Object} options - Parâmetros da injeção
 * @param {ObjectId} options.bubbleId - ID da bolha alvo
 * @param {ObjectId} options.userId - ID do usuário que realizou a interação
 * @param {string} options.source - 'like' | 'comment' | 'sopro' | 'promotion'
 * @param {number} [options.customAmount] - Quantidade customizada (opcional)
 * @param {boolean} [options.deductFromWallet=false] - Se true, debita 1 da wallet do usuário
 * @param {boolean} [options.applyVipMultiplier=false] - Se true, aplica multiplicador VIP
 * @returns {Object} bubble atualizado
 */
const injectOxygen = async ({
  bubbleId,
  userId,
  source,
  customAmount = null,
  deductFromWallet = false,
  applyVipMultiplier = false,
} = {}) => {
  let amount = customAmount || OXYGEN.INJECTION[source.toUpperCase()] || 0;
  if (amount <= 0) {
    logger.warn(`Tentativa de injecao de oxigenio com valor invalido: source=${source}, amount=${amount}`);
    return null;
  }

  try {
    // ============================================================
    // FASE 1: DÉBITO ATÔMICO DA WALLET (se aplicável)
    // ============================================================
    if (deductFromWallet) {
      const wallet = await Wallet.atomicDebit(userId, 1, {
        description: `Sopro na bolha ${bubbleId}`,
        referenceId: bubbleId,
        referenceModel: 'Bubble',
        metadata: { source },
      });

      if (!wallet) {
        logger.warn('Saldo insuficiente na wallet para sopro:', { userId, bubbleId });
        throw new Error('Saldo insuficiente na carteira');
      }

      // Aplica multiplicador VIP se solicitado
      if (applyVipMultiplier && wallet.oxygenMultiplier) {
        amount = Math.round(amount * wallet.oxygenMultiplier);
        logger.debug(`Multiplicador VIP aplicado: ${wallet.oxygenMultiplier}x -> amount=${amount}`);
      }
    }

    // ============================================================
    // FASE 2: APLICA DECAIMENTO PENDENTE
    // ============================================================
    let bubble = await Bubble.findById(bubbleId);
    if (!bubble) return null;

    // Aplica decaimento antes de injetar
    bubble = await calculateVitality(bubble, false);

    if (bubble.oxygenLevel <= 0) {
      logger.info(`Tentativa de injecao em bolha morta: ${bubbleId}`);
      return bubble;
    }

    // ============================================================
    // FASE 3: INJETA OXIGÊNIO NA BOLHA
    // ============================================================
    const maxOxygen = bubble.maxOxygen || OXYGEN.MAX_DEFAULT;
    const newOxygen = Math.min(maxOxygen, bubble.oxygenLevel + amount);

    const injection = {
      source: deductFromWallet ? 'sopro' : source,
      amount,
      byUser: userId,
      at: new Date(),
      metadata: deductFromWallet ? { deductedFromWallet: true, vipMultiplierApplied: applyVipMultiplier } : {},
    };

    const updatedBubble = await Bubble.findByIdAndUpdate(
      bubbleId,
      {
        $set: {
          oxygenLevel: newOxygen,
          lastOxygenDecayCheck: new Date(),
        },
        $push: { oxygenInjections: injection },
      },
      { new: true }
    );

    // Sincroniza expiresAt
    const decayRate = updatedBubble.oxygenDecayRate || OXYGEN.DECAY_RATE_DEFAULT;
    if (newOxygen > 0) {
      const hoursRemaining = newOxygen / decayRate;
      updatedBubble.expiresAt = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);
      await Bubble.findByIdAndUpdate(bubbleId, {
        $set: { expiresAt: updatedBubble.expiresAt }
      });
    }

    return updatedBubble;
  } catch (error) {
    logger.error('Erro ao injetar oxigenio:', { bubbleId, userId, source, error: error.message });
    throw error;
  }
};

// ============================================================
// 3. handleBubbleDeath — Morte com herança recursiva (Fila)
// ============================================================

/**
 * Processa a morte de uma bolha e decide o destino das filhas.
 * Usa uma fila (array como work queue) em vez de recursão direta
 * para evitar estouro de pilha em árvores profundas.
 * 
 * @param {ObjectId} deadBubbleId - ID da bolha que morreu
 * @param {Object} [io] - Instância do Socket.io para notificações
 * @param {Set} [processedIds] - Conjunto de IDs já processados (evita loops)
 * @returns {Object} Resultado com promoções e mortes
 */
const handleBubbleDeath = async (deadBubbleId, io = null, processedIds = new Set()) => {
  // Fila de processamento: { bubbleId, depth }
  const queue = [{ bubbleId: deadBubbleId, depth: 0 }];
  const result = {
    promoted: [],
    dead: [],
    totalProcessed: 0,
  };

  while (queue.length > 0) {
    const current = queue.shift();

    // Evita processar o mesmo ID duas vezes
    if (processedIds.has(current.bubbleId.toString())) continue;
    processedIds.add(current.bubbleId.toString());

    // Busca a bolha atual com suas filhas
    const currentBubble = await Bubble.findById(current.bubbleId)
      .select('oxygenLevel maxOxygen childrenBubbles depthLevel author hasLeaked parentBubble')
      .lean();

    if (!currentBubble) continue;

    // Se já está morta, só propaga para as filhas
    if (current.depth > 0 && currentBubble.oxygenLevel > 0 && currentBubble.oxygenLevel <= 0) {
      // Já marcada como morta, segue
    }

    // Marca a bolha como morta (hasLeaked = true, oxygenLevel = 0)
    if (currentBubble.oxygenLevel <= 0 || current.depth > 0) {
      await Bubble.findByIdAndUpdate(current.bubbleId, {
        $set: {
          oxygenLevel: 0,
          hasLeaked: true,
          expiresAt: new Date(),
        }
      });
      result.dead.push(current.bubbleId);

      // Notifica o autor (se não for notificação repetida)
      if (io && currentBubble.author) {
        io.to(`user_${currentBubble.author}`).emit('bubble_popped', {
          bubbleId: current.bubbleId,
          message: '💥 Sua bolha estourou por falta de oxigênio!'
        });
      }

      // Busca as FILHAS desta bolha e adiciona na fila
      const children = await Bubble.find({
        parentBubble: current.bubbleId,
        oxygenLevel: { $gt: 0 },
      })
        .select('_id oxygenLevel maxOxygen depthLevel')
        .lean();

      for (const child of children) {
        if (processedIds.has(child._id.toString())) continue;

        const childOxygen = child.oxygenLevel || 0;
        const childMaxOxygen = child.maxOxygen || OXYGEN.MAX_DEFAULT;
        const oxygenRatio = childMaxOxygen > 0 ? childOxygen / childMaxOxygen : 0;

        // Critério de promoção: oxigênio > 30% da capacidade
        if (oxygenRatio > OXYGEN.PROMOTION_MIN_RATIO) {
          // PROMOÇÃO: filha vira mãe independente
          result.promoted.push(child._id);

          const promotionBonus = OXYGEN.INJECTION.PROMOTION;
          const newOxygen = Math.min(childMaxOxygen, childOxygen + promotionBonus);

          await Bubble.findByIdAndUpdate(child._id, {
            $set: {
              parentBubble: null,
              parentBubbleAuthor: null,
              isOrphan: true,
              promotedFromChild: true,
              depthLevel: Math.max(0, (currentBubble.depthLevel || 0)),
              oxygenLevel: newOxygen,
              lastOxygenDecayCheck: new Date(),
            },
            $push: {
              inheritanceChain: {
                originalParent: current.bubbleId,
                promotedAt: new Date(),
                inheritedOxygenAtPromotion: childOxygen,
              },
              oxygenInjections: {
                source: 'promotion',
                amount: promotionBonus,
                byUser: null,
                at: new Date(),
              },
            },
          });

          if (io) {
            io.to(`bubble_${child._id}`).emit('bubble_promoted', {
              bubbleId: child._id,
              message: '🆙 Sua bolha sobreviveu à mãe e agora é independente! +20 de oxigênio.',
            });
          }
        } else {
          // MORTE EM CASCATA: coloca na fila para processar
          queue.push({ bubbleId: child._id, depth: current.depth + 1 });
        }
      }
    }

    result.totalProcessed = processedIds.size;
  }

  logger.info(`Morte processada para bolha ${deadBubbleId}: ${result.promoted.length} promocoes, ${result.dead.length} mortes.`);
  return result;
};

// ============================================================
// 4. checkAndProcessExpiredBubbles — Varredura de expiradas
// ============================================================

/**
 * Varre todas as bolhas com oxygenLevel <= 0 e hasLeaked = false,
 * e processa a morte com herança para cada uma.
 * Chamado periodicamente pelo job.
 * 
 * @param {Object} [io] - Instância do Socket.io
 * @param {number} [batchSize=100] - Tamanho do lote de processamento
 * @returns {Object} Resultado agregado
 */
const checkAndProcessExpiredBubbles = async (io = null, batchSize = 100) => {
  const aggregatedResult = {
    promoted: [],
    dead: [],
    totalProcessed: 0,
    batches: 0,
  };

  try {
    // Aplica decaimento em todas as bolhas vivas primeiro (atualização em massa)
    const now = new Date();
    const bulkDecayResult = await Bubble.updateMany(
      {
        oxygenLevel: { $gt: 0 },
        lastOxygenDecayCheck: { $lt: new Date(now.getTime() - 60000) }, // >1min sem check
      },
      [
        {
          $set: {
            oxygenLevel: {
              $max: [
                0,
                {
                  $subtract: [
                    '$oxygenLevel',
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $subtract: [now, '$lastOxygenDecayCheck'] },
                            3600000, // 1h em ms
                          ],
                        },
                        { $ifNull: ['$oxygenDecayRate', OXYGEN.DECAY_RATE_DEFAULT] },
                      ],
                    },
                  ],
                },
              ],
            },
            lastOxygenDecayCheck: now,
          },
        },
      ]
    );

    logger.info(`Decaimento em massa aplicado para ${bulkDecayResult.modifiedCount} bolhas.`);

    // Busca bolhas que morreram (oxygenLevel <= 0) e ainda não foram processadas
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const deadBubbles = await Bubble.find({
        oxygenLevel: { $lte: 0 },
        hasLeaked: false,
      })
        .select('_id')
        .limit(batchSize)
        .skip(skip)
        .lean();

      if (deadBubbles.length === 0) {
        hasMore = false;
        break;
      }

      const processedIds = new Set();
      for (const dead of deadBubbles) {
        const result = await handleBubbleDeath(dead._id, io, processedIds);
        aggregatedResult.promoted.push(...result.promoted);
        aggregatedResult.dead.push(...result.dead);
        aggregatedResult.totalProcessed += result.totalProcessed;
        aggregatedResult.batches++;
      }

      skip += deadBubbles.length;
    }

    logger.info(`Varredura de expiradas concluida: ${aggregatedResult.dead.length} mortas, ${aggregatedResult.promoted.length} promocoes.`);
  } catch (error) {
    logger.error('Erro na varredura de bolhas expiradas:', { error: error.message, stack: error.stack });
  }

  return aggregatedResult;
};

// ============================================================
// 5. getBubbleTree — Retorna a árvore hierárquica de uma bolha
// ============================================================

/**
 * Monta a árvore completa de uma bolha (mãe → filhas → netas...)
 * respeitando o limite de profundidade.
 * 
 * @param {ObjectId} bubbleId - ID da bolha raiz
 * @param {number} [maxDepth=3] - Profundidade máxima
 * @returns {Object} Árvore hierárquica
 */
const getBubbleTree = async (bubbleId, maxDepth = 3) => {
  const buildTree = async (nodeId, depth) => {
    if (depth > maxDepth) return null;

    const node = await Bubble.findById(nodeId)
      .populate('author', 'username')
      .select('title content oxygenLevel maxOxygen depthLevel isOrphan promotedFromChild parentBubble author createdAt')
      .lean();

    if (!node) return null;

    // Aplica decaimento sob demanda
    const vitalNode = await calculateVitality(node, false);

    const children = await Bubble.find({ parentBubble: nodeId })
      .select('_id')
      .lean();

    const tree = {
      _id: vitalNode._id,
      title: vitalNode.title,
      content: vitalNode.content,
      author: vitalNode.author,
      oxygenLevel: vitalNode.oxygenLevel,
      oxygenPercentage: vitalNode.maxOxygen > 0
        ? Math.round((vitalNode.oxygenLevel / vitalNode.maxOxygen) * 100)
        : 0,
      isOrphan: vitalNode.isOrphan,
      promotedFromChild: vitalNode.promotedFromChild,
      depthLevel: depth,
      children: [],
    };

    for (const child of children) {
      const childTree = await buildTree(child._id, depth + 1);
      if (childTree) tree.children.push(childTree);
    }

    return tree;
  };

  return buildTree(bubbleId, 0);
};

// ============================================================
// 6. calculateGravityCenter — Atração temática para visualização
// ============================================================

/**
 * Calcula o centro de gravidade de um cluster de bolhas baseado
 * nos subjectVectors para posicionamento visual no frontend.
 * 
 * @param {string} subject - Tema do cluster
 * @returns {Array} Bolhas com coordenadas de posição
 */
const getClusterBySubject = async (subject) => {
  const bubbles = await Bubble.find({
    subject,
    oxygenLevel: { $gt: 0 },
    parentBubble: null,
  })
    .select('_id title subject oxygenLevel maxOxygen gravityCenter subjectVector')
    .sort({ oxygenLevel: -1 })
    .limit(50)
    .lean();

  // Aplica decaimento sob demanda em cada uma
  const enriched = [];
  for (const bubble of bubbles) {
    const vital = await calculateVitality(bubble, false);
    enriched.push({
      _id: vital._id,
      title: vital.title,
      subject: vital.subject,
      oxygenLevel: vital.oxygenLevel,
      oxygenPercentage: vital.maxOxygen > 0
        ? Math.round((vital.oxygenLevel / vital.maxOxygen) * 100)
        : 0,
      gravityCenter: vital.gravityCenter || { x: 0, y: 0 },
      keywords: (vital.subjectVector || []).map(k => k.keyword),
    });
  }

  return enriched;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  OXYGEN,
  calculateVitality,
  injectOxygen,
  handleBubbleDeath,
  checkAndProcessExpiredBubbles,
  getBubbleTree,
  getClusterBySubject,
};
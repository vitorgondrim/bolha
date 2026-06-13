// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: models/Notification.js
// Propósito: Modelo de Alertas e Sistema Auto-Limpável (Sênior)
// ============================================================

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Usuário alvo que receberá a notificação (Sempre Indexado)
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'O destinatário da notificação é obrigatório.'] 
  },
  
  // Ator que gerou a ação (Opcional - null significa sistema/global)
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  
  // Tipo estrito mapeado no ecossistema da aplicação
  type: { 
    type: String, 
    enum: [
      'leak',                // 💨 Bolha vazou (bteu engajamento alto)
      'follow',              // 👥 Novo seguidor
      'trending',            // 📈 Bolha entrou nos assuntos do momento
      'badge',               // 🏆 Novo emblema conquistado
      'comment',             // 💬 Comentário recebido
      'sopro',               // 🫧 Sopro recebido
      'ten_minutes_warning', // ⏰ Aviso crítico de 10 minutos para expirar
      'expired',             // 💥 Bolha estourou completamente
      'saved_from_expiry',   // 🎉 Milagre: Bolha salva no limite do tempo
      'daily_reminder'       // ⏰ Lembrete matinal diário (10h)
    ],
    required: [true, 'O tipo de notificação é obrigatório.'] 
  },
  
  // Entidade da bolha acoplada (Permite clique para abrir a bolha no frontend)
  bubbleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bubble',
    default: null
  },
  
  // Metadado opcional para renderizar ícones ou imagens específicas de conquistas
  badgeName: { 
    type: String,
    trim: true,
    default: null
  },
  
  // Mensagem textual que será exibida em push ou na listagem da UI
  content: { 
    type: String, 
    required: [true, 'O conteúdo de texto da notificação é obrigatório.'],
    trim: true,
    maxlength: 350
  },
  
  // Controle de leitura
  read: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true // Gera createdAt e updatedAt nativos
});

// ============================================================
// ÍNDICES DE PERFORMANCE E ARQUITETURA DE DADOS
// ============================================================

// Sênior: Índice composto definitivo para a aba de notificações do app.
// Cobre a paginação, ordenação cronológica decrescente e contagem de não-lidas de forma instantânea.
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Sênior: Mecanismo de Descarte Automático (Anti-Bloat de Infraestrutura).
// Redes sociais geram gigabytes de notificações que perdem o valor após semanas.
// Este índice TTL remove fisicamente do banco de dados qualquer notificação após 30 dias da sua criação.
// Fórmula: 30 dias = 30 * 24 * 60 * 60 = 2.592.000 segundos.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
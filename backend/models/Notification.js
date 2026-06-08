// ============================================================
// MODEL: NOTIFICATION
// Armazena notificações para cada usuário.
// 11 tipos diferentes cobrem todo o ciclo de vida de uma bolha.
// ============================================================

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Usuário que recebe a notificação
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Usuário que gerou a notificação (opcional, ex: notificações do sistema)
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Tipo da notificação (determina ícone e cor no frontend)
  type: { 
    type: String, 
    enum: [
      'leak',               // 💨 Bolha vazou
      'follow',             // 👥 Novo seguidor
      'expiring',           // ⚠️ Bolha próxima de expirar
      'trending',           // 📈 Bolha está bombando
      'badge',              // 🏆 Novo emblema conquistado
      'comment',            // 💬 Comentário na bolha
      'sopro',              // 🫧 Sopro recebido
      'ten_minutes_warning', // ⏰ 10 minutos restantes
      'expired',            // 💥 Bolha estourou
      'saved_from_expiry',  // 🎉 Bolha salva no último minuto
      'daily_reminder'      // ⏰ Lembrete diário (10h)
    ],
    required: true 
  },
  
  // Bolha relacionada (se aplicável)
  bubbleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bubble' 
  },
  
  // Nome do emblema (para notificações de conquista)
  badgeName: { 
    type: String 
  },
  
  // Texto da notificação
  content: { 
    type: String 
  },
  
  // Se o usuário já leu
  read: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Índice composto para buscar notificações não lidas rapidamente
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
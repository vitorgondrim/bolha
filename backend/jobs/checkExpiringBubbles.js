// ============================================================
// JOB: MONITORAMENTO DE BOLHAS
// Sistema de watchers que roda em intervalos regulares:
//   1. Aviso de 10 minutos (⚠️ bolha vai estourar)
//   2. Bolhas que estouraram (💥 expiradas)
//   3. Bolhas salvas no limite (🎉 milagre)
//   4. Lembrete diário (⏰ 10h da manhã)
//
// Cada verificação tem proteção anti-duplicidade:
// só envia notificação se não enviou recentemente.
// ============================================================

const Notification = require('../models/Notification');
const Bubble = require('../models/Bubble');

// ============================================================
// 1. AVISO DE 10 MINUTOS
// Encontra bolhas que vão expirar em ~10 minutos.
// Só envia se não houver notificação desse tipo na última hora.
// ============================================================
const checkTenMinuteWarning = async (io) => {
  try {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    
    const expiringBubbles = await Bubble.find({
      expiresAt: { $lte: tenMinutesFromNow, $gt: now },
      hasLeaked: false  // Bolhas vazadas não recebem esse aviso
    }).populate('author', 'username');

    for (const bubble of expiringBubbles) {
      const minutesLeft = Math.floor((bubble.expiresAt.getTime() - now.getTime()) / 60000);
      
      // Só envia se estiver entre 9 e 11 minutos (evita múltiplos envios)
      if (minutesLeft <= 11 && minutesLeft >= 9) {
        // Verifica se já enviamos essa notificação na última hora
        const existingNotification = await Notification.findOne({
          recipient: bubble.author._id,
          bubbleId: bubble._id,
          type: 'ten_minutes_warning',
          createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) } // 1 hora
        });

        if (!existingNotification) {
          const content = `⚠️ SUA BOLHA VAI ESTOURAR em 10 minutos! "${bubble.content.substring(0, 50)}..." - Corra para conseguir sopros ou comentários para salvá-la!`;

          await Notification.create({
            recipient: bubble.author._id,
            type: 'ten_minutes_warning',
            bubbleId: bubble._id,
            content
          });

          if (io) {
            io.to(`user_${bubble.author._id}`).emit('new_notification', {
              type: 'ten_minutes_warning',
              content,
              bubbleId: bubble._id
            });
          }

          console.log(`⚠️ Alerta 10min → @${bubble.author.username}`);
        }
      }
    }
  } catch (error) {
    console.error('Erro checkTenMinuteWarning:', error);
  }
};

// ============================================================
// 2. BOLHAS QUE ESTOURARAM
// Encontra bolhas que expiraram nos últimos 2 minutos.
// Só envia se não houver notificação nas últimas 24h.
// ============================================================
const checkExpiredBubbles = async (io) => {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const expiredBubbles = await Bubble.find({
      expiresAt: { $lte: now, $gte: twoMinutesAgo },
      hasLeaked: false  // Vazadas não "estouram" da mesma forma
    }).populate('author', 'username');

    for (const bubble of expiredBubbles) {
      const existingNotification = await Notification.findOne({
        recipient: bubble.author._id,
        bubbleId: bubble._id,
        type: 'expired',
        createdAt: { $gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // 24 horas
      });

      if (!existingNotification) {
        const content = `💥 SUA BOLHA ESTOUROU! "${bubble.content.substring(0, 50)}..." não resistiu ao tempo. Que tal criar uma nova? Cada tentativa conta para o emblema "O Estouro"!`;

        await Notification.create({
          recipient: bubble.author._id,
          type: 'expired',
          bubbleId: bubble._id,
          content
        });

        if (io) {
          io.to(`user_${bubble.author._id}`).emit('new_notification', {
            type: 'expired',
            content,
            bubbleId: bubble._id
          });
        }

        console.log(`💥 Estouro → @${bubble.author.username}`);
      }
    }
  } catch (error) {
    console.error('Erro checkExpiredBubbles:', error);
  }
};

// ============================================================
// 3. BOLHAS SALVAS NO LIMITE
// Detecta bolhas que receberam sopro quando estavam críticas.
// Verifica se a bolha foi atualizada nos últimos 2 minutos.
// ============================================================
const checkSavedBubbles = async (io) => {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const savedBubbles = await Bubble.find({
      sopros: { $exists: true, $not: { $size: 0 } },  // Tem pelo menos 1 sopro
      updatedAt: { $gte: twoMinutesAgo },              // Atualizada recentemente
      hasLeaked: false
    }).populate('author', 'username');

    for (const bubble of savedBubbles) {
      // Verifica se estava crítica ANTES do sopro (menos de 10 minutos)
      const wasCritical = bubble.expiresAt.getTime() - bubble.updatedAt.getTime() < 10 * 60 * 1000;
      
      if (wasCritical) {
        const existingNotification = await Notification.findOne({
          recipient: bubble.author._id,
          bubbleId: bubble._id,
          type: 'saved_from_expiry',
          createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) } // 1 hora
        });

        if (!existingNotification) {
          const soproCount = bubble.sopros.length;
          const content = `🎉 MILAGRE! Sua bolha foi SALVA quando estava prestes a estourar! +${soproCount * 120} minutos de vida! Compartilhe essa vitória!`;

          await Notification.create({
            recipient: bubble.author._id,
            type: 'saved_from_expiry',
            bubbleId: bubble._id,
            content
          });

          if (io) {
            io.to(`user_${bubble.author._id}`).emit('new_notification', {
              type: 'saved_from_expiry',
              content,
              bubbleId: bubble._id
            });
          }

          console.log(`🎉 Salva no limite → @${bubble.author.username}`);
        }
      }
    }
  } catch (error) {
    console.error('Erro checkSavedBubbles:', error);
  }
};

// ============================================================
// 4. LEMBRETE DIÁRIO
// Enviado às 10h da manhã para usuários com bolhas ativas.
// Só envia uma vez por dia.
// ============================================================
const sendDailyReminder = async (io) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Só executa entre 10h e 11h
    if (currentHour === 10) {
      const User = require('../models/User');
      const users = await User.find();
      
      for (const user of users) {
        // Verifica se já enviamos hoje
        const todayReminder = await Notification.findOne({
          recipient: user._id,
          type: 'daily_reminder',
          createdAt: { $gt: new Date(now.setHours(0, 0, 0, 0)) } // Desde meia-noite
        });

        if (!todayReminder) {
          const activeBubbles = await Bubble.countDocuments({
            author: user._id,
            expiresAt: { $gt: new Date() }
          });

          if (activeBubbles > 0) {
            const content = `⏰ BOM DIA! Você tem ${activeBubbles} bolha(s) ativa(s) hoje. Use seus sopros sabiamente e não deixe elas estourarem!`;

            await Notification.create({
              recipient: user._id,
              type: 'daily_reminder',
              content
            });

            if (io) {
              io.to(`user_${user._id}`).emit('new_notification', {
                type: 'daily_reminder',
                content
              });
            }

            console.log(`⏰ Lembrete → @${user.username} (${activeBubbles} bolhas)`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro sendDailyReminder:', error);
  }
};

// ============================================================
// INICIAR WATCHERS
// Retorna os intervalos para graceful shutdown.
// ============================================================
const startExpiryWatcher = (io) => {
  console.log('⏰ Sistema de monitoramento de bolhas iniciado!');
  
  // Verificações urgentes: a cada 60 segundos
  const interval = setInterval(async () => {
    await checkTenMinuteWarning(io);
    await checkExpiredBubbles(io);
    await checkSavedBubbles(io);
  }, 60 * 1000);
  
  // Lembrete diário: verificar a cada hora (só dispara às 10h)
  const reminderInterval = setInterval(async () => {
    await sendDailyReminder(io);
  }, 60 * 60 * 1000);
  
  return { interval, reminderInterval };
};

module.exports = {
  startExpiryWatcher,
  checkTenMinuteWarning,
  checkExpiredBubbles,
  checkSavedBubbles,
  sendDailyReminder
};
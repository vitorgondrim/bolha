// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: jobs/bubbleWatcher.js
// Propósito: Background Workers de Alta Performance e Baixo I/O (Sênior)
// ============================================================

const Notification = require('../models/Notification');
const Bubble = require('../models/Bubble');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Função auxiliar para despachar notificações em lote (bulk).
 * Em vez de criar 1 notificação por vez (N queries), acumula e insere todas de uma vez.
 * Retorna array de notificações criadas para emissão via Socket.io.
 */
const bulkDispatchAlerts = async (io, alerts) => {
  if (alerts.length === 0) return;

  try {
    const notificationDocs = alerts.map(({ recipientId, type, content, bubbleId }) => ({
      recipient: recipientId,
      type,
      content,
      bubbleId
    }));

    const result = await Notification.insertMany(notificationDocs, { ordered: false });
    
    // Emite notificações via Socket.io (em background, sem bloquear)
    if (io) {
      for (const notif of result) {
        io.to(`user_${notif.recipient}`).emit('new_notification', notif);
      }
    }
  } catch (error) {
    // ordered: false permite que documentos válidos sejam inseridos mesmo se algum falhar
    logger.error('Falha ao despachar alertas em lote:', { error: error.message, count: alerts.length });
  }
};

// ============================================================
// 1. AVISO DE 10 MINUTOS (Otimizado com bulkWrite)
// ============================================================
const checkTenMinuteWarning = async (io) => {
  try {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Busca bolhas no range de expiração
    const expiringBubbles = await Bubble.find({
      expiresAt: { $lte: tenMinutesFromNow, $gt: now },
      hasLeaked: false
    }).select('author content expiresAt').lean();

    if (expiringBubbles.length === 0) return;

    // Busca todas as notificações já enviadas nestas bolhas na última hora (1 query ao invés de N)
    const bubbleIds = expiringBubbles.map(b => b._id);
    const existingNotifs = await Notification.find({
      bubbleId: { $in: bubbleIds },
      type: 'ten_minutes_warning',
      createdAt: { $gt: oneHourAgo }
    }).select('bubbleId').lean();

    const alreadyNotifiedSet = new Set(existingNotifs.map(n => n.bubbleId.toString()));

    // Monta array de alertas para inserção em lote
    const alerts = [];
    for (const bubble of expiringBubbles) {
      if (alreadyNotifiedSet.has(bubble._id.toString())) continue;

      const textSnippet = bubble.content.length > 40 ? `${bubble.content.substring(0, 40)}...` : bubble.content;
      alerts.push({
        recipientId: bubble.author,
        type: 'ten_minutes_warning',
        content: `⚠️ SUA BOLHA VAI ESTOURAR EM BREVE! "${textSnippet}" - Consiga sopros ou comentários rápidos para mantê-la viva!`,
        bubbleId: bubble._id
      });
    }

    await bulkDispatchAlerts(io, alerts);
  } catch (error) {
    logger.error('Erro no Job checkTenMinuteWarning:', { error: error.message });
  }
};

// ============================================================
// 2. BOLHAS QUE ESTOURARAM (Otimizado com bulkWrite)
// ============================================================
const checkExpiredBubbles = async (io) => {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const expiredBubbles = await Bubble.find({
      expiresAt: { $lte: now, $gte: twoMinutesAgo },
      hasLeaked: false
    }).select('author content').lean();

    if (expiredBubbles.length === 0) return;

    // 1 query: busca todas as notificações de expiração já enviadas para essas bolhas
    const bubbleIds = expiredBubbles.map(b => b._id);
    const existingNotifs = await Notification.find({
      bubbleId: { $in: bubbleIds },
      type: 'expired'
    }).select('bubbleId').lean();

    const alreadyNotifiedSet = new Set(existingNotifs.map(n => n.bubbleId.toString()));

    const alerts = [];
    for (const bubble of expiredBubbles) {
      if (alreadyNotifiedSet.has(bubble._id.toString())) continue;

      const textSnippet = bubble.content.length > 40 ? `${bubble.content.substring(0, 40)}...` : bubble.content;
      alerts.push({
        recipientId: bubble.author,
        type: 'expired',
        content: `💥 SUA BOLHA ESTOUROU! "${textSnippet}" não resistiu ao tempo. Crie uma nova e tente novamente!`,
        bubbleId: bubble._id
      });
    }

    await bulkDispatchAlerts(io, alerts);
  } catch (error) {
    logger.error('Erro no Job checkExpiredBubbles:', { error: error.message });
  }
};

// ============================================================
// 3. BOLHAS SALVAS NO LIMITE (Otimizado com bulkWrite)
// ============================================================
const checkSavedBubbles = async (io) => {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Filtra bolhas modificadas nos últimos 2 min que possuem sopros ativos
    const potentialSaved = await Bubble.find({
      sopros: { $exists: true, $not: { $size: 0 } },
      updatedAt: { $gte: twoMinutesAgo },
      hasLeaked: false
    }).select('author sopros expiresAt updatedAt').lean();

    if (potentialSaved.length === 0) return;

    // 1 query: busca todas as notificações "saved_from_expiry" já enviadas
    const bubbleIds = potentialSaved.map(b => b._id);
    const existingNotifs = await Notification.find({
      bubbleId: { $in: bubbleIds },
      type: 'saved_from_expiry',
      createdAt: { $gt: twoMinutesAgo }
    }).select('bubbleId').lean();

    const alreadyNotifiedSet = new Set(existingNotifs.map(n => n.bubbleId.toString()));

    const alerts = [];
    for (const bubble of potentialSaved) {
      if (alreadyNotifiedSet.has(bubble._id.toString())) continue;

      const timeRemaining = bubble.expiresAt.getTime() - now.getTime();
      const earnedTime = 120 * 60 * 1000;
      const wasCritical = timeRemaining < (earnedTime + (10 * 60 * 1000));

      if (wasCritical) {
        alerts.push({
          recipientId: bubble.author,
          type: 'saved_from_expiry',
          content: `🎉 MILAGRE! Sua bolha recebeu um sopro vital e foi SALVA no último segundo! +120 minutos de vida.`,
          bubbleId: bubble._id
        });
      }
    }

    await bulkDispatchAlerts(io, alerts);
  } catch (error) {
    logger.error('Erro no Job checkSavedBubbles:', { error: error.message });
  }
};

// ============================================================
// 4. LEMBRETE DIÁRIO (Otimizado com bulkWrite)
// ============================================================
const sendDailyReminder = async (io) => {
  try {
    const now = new Date();
    if (now.getHours() !== 10) return;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Busca autores com bolhas ativas
    const activeAuthors = await Bubble.distinct('author', { expiresAt: { $gt: now } });
    if (activeAuthors.length === 0) return;

    // 1 query: busca todas as notificações de lembrete diário já enviadas hoje
    const existingReminders = await Notification.find({
      recipient: { $in: activeAuthors },
      type: 'daily_reminder',
      createdAt: { $gte: startOfToday }
    }).select('recipient').lean();

    const alreadyNotifiedSet = new Set(existingReminders.map(n => n.recipient.toString()));

    // Conta bolhas ativas por autor em uma única query via aggregation
    const bubbleCounts = await Bubble.aggregate([
      { $match: { author: { $in: activeAuthors }, expiresAt: { $gt: now } } },
      { $group: { _id: '$author', count: { $sum: 1 } } }
    ]);

    const bubbleCountMap = new Map(bubbleCounts.map(doc => [doc._id.toString(), doc.count]));

    const alerts = [];
    for (const authorId of activeAuthors) {
      if (alreadyNotifiedSet.has(authorId.toString())) continue;

      const activeCount = bubbleCountMap.get(authorId.toString()) || 0;
      alerts.push({
        recipientId: authorId,
        type: 'daily_reminder',
        content: `⏰ BOM DIA! Você tem ${activeCount} bolha(s) flutuando hoje. Cuide delas para que não estourem!`,
        bubbleId: null
      });
    }

    await bulkDispatchAlerts(io, alerts);
  } catch (error) {
    logger.error('Erro no Job sendDailyReminder:', { error: error.message });
  }
};

// ============================================================
// ORQUESTRAÇÃO DE DISPAROS
// ============================================================
const startExpiryWatcher = (io) => {
  logger.info('[Background Worker] Monitoramento de bolhas ativo e escalavel.');
  
  // Execuções dinâmicas a cada 60 segundos
  const interval = setInterval(async () => {
    await checkTenMinuteWarning(io);
    await checkExpiredBubbles(io);
    await checkSavedBubbles(io);
  }, 60 * 1000);
  
  // Monitoramento do lembrete diário (checa a cada hora se entrou na janela das 10h)
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
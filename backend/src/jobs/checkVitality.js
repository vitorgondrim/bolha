// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: jobs/checkVitality.js
// Propósito: Background Workers de Vitalidade e Herança (Mente Coletiva)
//            Substitui checkExpiringBubbles.js com lógica de Oxygen Level
//            e morte em cascata usando fila (queue) para evitar estouro de pilha.
// ============================================================

const Notification = require('../models/Notification');
const Bubble = require('../models/Bubble');
const User = require('../models/User');
const logger = require('../utils/logger');

const {
  OXYGEN,
  calculateVitality,
  injectOxygen,
  handleBubbleDeath,
  checkAndProcessExpiredBubbles,
  getBubbleTree,
} = require('../services/bubbleService');

// ============================================================
// FUNÇÃO AUXILIAR: Despacho de notificações em lote (bulk)
// ============================================================
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
    
    if (io) {
      for (const notif of result) {
        io.to(`user_${notif.recipient}`).emit('new_notification', notif);
      }
    }
  } catch (error) {
    logger.error('Falha ao despachar alertas em lote:', { error: error.message, count: alerts.length });
  }
};

// ============================================================
// 1. AVISO DE ZONA CRÍTICA (OxygenLevel ≤ 15%)
// Substitui checkTenMinuteWarning — baseado em % de oxigênio, não em expiresAt
// ============================================================
const checkCriticalOxygenWarning = async (io) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Busca bolhas em estado crítico (oxygenLevel ≤ 15% da capacidade máxima)
    // Usando aggregation para calcular a porcentagem no banco
    const criticalBubbles = await Bubble.aggregate([
      {
        $match: {
          oxygenLevel: { $gt: 0 },
          hasLeaked: false,
        }
      },
      {
        $addFields: {
          oxygenPercentage: {
            $cond: {
              if: { $gt: ['$maxOxygen', 0] },
              then: { $multiply: [{ $divide: ['$oxygenLevel', '$maxOxygen'] }, 100] },
              else: { $multiply: [{ $divide: ['$oxygenLevel', OXYGEN.MAX_DEFAULT] }, 100] }
            }
          }
        }
      },
      {
        $match: {
          oxygenPercentage: { $lte: 15 }
        }
      },
      {
        $project: {
          author: 1,
          content: 1,
          oxygenLevel: 1,
          maxOxygen: 1,
          oxygenPercentage: 1
        }
      }
    ]);

    if (criticalBubbles.length === 0) return;

    // Busca notificações já enviadas na última hora
    const bubbleIds = criticalBubbles.map(b => b._id);
    const existingNotifs = await Notification.find({
      bubbleId: { $in: bubbleIds },
      type: 'critical_oxygen_warning',
      createdAt: { $gt: oneHourAgo }
    }).select('bubbleId').lean();

    const alreadyNotifiedSet = new Set(existingNotifs.map(n => n.bubbleId.toString()));

    const alerts = [];
    for (const bubble of criticalBubbles) {
      if (alreadyNotifiedSet.has(bubble._id.toString())) continue;

      const textSnippet = bubble.content?.length > 40
        ? `${bubble.content.substring(0, 40)}...`
        : (bubble.content || 'sem conteudo');

      alerts.push({
        recipientId: bubble.author,
        type: 'critical_oxygen_warning',
        content: `⚠️ SUA BOLHA ESTÁ QUASE MORRENDO! "${textSnippet}" — Oxigênio em ${Math.round(bubble.oxygenPercentage)}%. Consiga sopros ou comentários para salvá-la!`,
        bubbleId: bubble._id
      });
    }

    await bulkDispatchAlerts(io, alerts);
    logger.info(`Aviso de oxigenio critico enviado para ${alerts.length} bolhas.`);
  } catch (error) {
    logger.error('Erro no Job checkCriticalOxygenWarning:', { error: error.message });
  }
};

// ============================================================
// 2. BOLHAS QUE MORRERAM (Processamento com Herança)
// Substitui checkExpiredBubbles — usa bubbleService.handleBubbleDeath com fila
// ============================================================
const checkExpiredVitality = async (io) => {
  try {
    const result = await checkAndProcessExpiredBubbles(io, 100);
    
    if (result.dead.length > 0 || result.promoted.length > 0) {
      // Notifica autores das bolhas promovidas
      for (const promotedId of result.promoted) {
        const promotedBubble = await Bubble.findById(promotedId)
          .select('author')
          .lean();

        if (promotedBubble && promotedBubble.author) {
          await bulkDispatchAlerts(io, [{
            recipientId: promotedBubble.author,
            type: 'promoted_from_child',
            content: '🆙 Sua bolha sobreviveu à mãe e agora é independente! +20 de oxigênio.',
            bubbleId: promotedId
          }]);
        }
      }

      logger.info(`Ciclo de vitalidade: ${result.dead.length} mortas, ${result.promoted.length} promocoes.`);
    }
  } catch (error) {
    logger.error('Erro no Job checkExpiredVitality:', { error: error.message });
  }
};

// ============================================================
// 3. BOLHAS SALVAS NO LIMITE (Injeção de Sopro)
// Adaptado de checkSavedBubbles — agora monitora oxygenLevel, não expiresAt
// ============================================================
const checkSavedBySopro = async (io) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Busca bolhas que receberam sopro (oxygenInjections) nos últimos 2 min
    // e estavam em estado crítico antes da injeção
    const recentInjections = await Bubble.find({
      'oxygenInjections.source': 'sopro',
      'oxygenInjections.at': { $gte: twoMinutesAgo },
      hasLeaked: false,
    })
      .select('author oxygenInjections oxygenLevel maxOxygen')
      .lean();

    if (recentInjections.length === 0) return;

    const bubbleIds = recentInjections.map(b => b._id);
    const existingNotifs = await Notification.find({
      bubbleId: { $in: bubbleIds },
      type: 'saved_from_expiry',
      createdAt: { $gt: twoMinutesAgo }
    }).select('bubbleId').lean();

    const alreadyNotifiedSet = new Set(existingNotifs.map(n => n.bubbleId.toString()));

    const alerts = [];
    for (const bubble of recentInjections) {
      if (alreadyNotifiedSet.has(bubble._id.toString())) continue;

      // Verifica se o nível de oxigênio atual ainda é crítico (< 15%)
      const maxOxy = bubble.maxOxygen || OXYGEN.MAX_DEFAULT;
      const oxygenPct = maxOxy > 0 ? (bubble.oxygenLevel / maxOxy) * 100 : 0;
      const wasCritical = oxygenPct <= 25; // Considera salva se estava abaixo de 25%

      if (wasCritical) {
        alerts.push({
          recipientId: bubble.author,
          type: 'saved_from_expiry',
          content: `🎉 MILAGRE! Sua bolha recebeu um sopro vital e foi SALVA! +${OXYGEN.INJECTION.SOPRO} de oxigênio.`,
          bubbleId: bubble._id
        });
      }
    }

    await bulkDispatchAlerts(io, alerts);
  } catch (error) {
    logger.error('Erro no Job checkSavedBySopro:', { error: error.message });
  }
};

// ============================================================
// 4. LEMBRETE DIÁRIO (Mantido do original)
// ============================================================
const sendDailyReminder = async (io) => {
  try {
    const now = new Date();
    if (now.getHours() !== 10) return;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Busca autores com bolhas vivas (oxygenLevel > 0)
    const activeAuthors = await Bubble.distinct('author', { oxygenLevel: { $gt: 0 } });
    if (activeAuthors.length === 0) return;

    const existingReminders = await Notification.find({
      recipient: { $in: activeAuthors },
      type: 'daily_reminder',
      createdAt: { $gte: startOfToday }
    }).select('recipient').lean();

    const alreadyNotifiedSet = new Set(existingReminders.map(n => n.recipient.toString()));

    // Conta bolhas ativas por autor
    const bubbleCounts = await Bubble.aggregate([
      { $match: { author: { $in: activeAuthors }, oxygenLevel: { $gt: 0 } } },
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
// 5. DECAIMENTO EM MASSA (Aplica decay em lote a cada ciclo)
// ============================================================
const applyMassDecay = async () => {
  try {
    const now = new Date();
    const result = await Bubble.updateMany(
      {
        oxygenLevel: { $gt: 0 },
        lastOxygenDecayCheck: { $lt: new Date(now.getTime() - 60000) },
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
                            3600000,
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

    if (result.modifiedCount > 0) {
      logger.debug(`Decaimento em massa: ${result.modifiedCount} bolhas atualizadas.`);
    }
  } catch (error) {
    logger.error('Erro no applyMassDecay:', { error: error.message });
  }
};

// ============================================================
// ORQUESTRAÇÃO DE DISPAROS
// ============================================================
const startVitalityWatcher = (io) => {
  logger.info('[Background Worker] Monitor de vitalidade (Mente Coletiva) ativo.');

  // Execuções dinâmicas a cada 60 segundos
  const interval = setInterval(async () => {
    try {
      // 1. Aplica decaimento em massa primeiro (mais eficiente que individual)
      await applyMassDecay();

      // 2. Verifica avisos de oxigênio crítico
      await checkCriticalOxygenWarning(io);

      // 3. Processa bolhas mortas com herança (fila)
      await checkExpiredVitality(io);

      // 4. Verifica bolhas salvas por sopro
      await checkSavedBySopro(io);
    } catch (error) {
      logger.error('Erro no ciclo de vitalidade:', { error: error.message });
    }
  }, 60 * 1000);

  // Lembrete diário (checa a cada hora se entrou na janela das 10h)
  const reminderInterval = setInterval(async () => {
    await sendDailyReminder(io);
  }, 60 * 60 * 1000);

  return { interval, reminderInterval };
};

module.exports = {
  startVitalityWatcher,
  checkCriticalOxygenWarning,
  checkExpiredVitality,
  checkSavedBySopro,
  sendDailyReminder,
  applyMassDecay,
};
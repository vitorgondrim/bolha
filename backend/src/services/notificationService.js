// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: services/notificationService.js
// Propósito: Serviço Centralizado de Notificações
//            Substitui as funções `createNotification` duplicadas
//            nos controllers bubbleController e userController.
// ============================================================

const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Cria uma notificação e a emite via Socket.io em tempo real.
 *
 * @param {Object} io - Instância do Socket.io (pode ser null/undefined)
 * @param {Object} data - Dados da notificação
 * @param {string} data.recipient - ID do usuário destinatário
 * @param {string} [data.sender] - ID do usuário remetente (opcional)
 * @param {string} data.type - Tipo da notificação (enum do schema)
 * @param {string} [data.bubbleId] - ID da bolha relacionada (opcional)
 * @param {string} data.content - Conteúdo textual da notificação
 * @returns {Promise<Object|null>} Documento da notificação ou null em caso de erro
 */
const createNotification = async (io, data) => {
  try {
    const notification = await Notification.create({
      recipient: data.recipient,
      sender: data.sender || undefined,
      type: data.type,
      bubbleId: data.bubbleId || undefined,
      content: data.content,
    });

    if (io) {
      io.to(`user_${data.recipient}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    // Sênior: Log estruturado sem quebrar o fluxo principal
    logger.error('[NotificationService] Falha ao criar notificação:', {
      recipient: data.recipient,
      type: data.type,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    return null;
  }
};

/**
 * Cria múltiplas notificações em lote (bulk insert) e emite via Socket.io.
 * Usado pelos jobs de background para notificações em massa.
 *
 * @param {Object} io - Instância do Socket.io
 * @param {Array<Object>} alerts - Array de notificações a criar
 * @returns {Promise<Array<Object>>} Array de notificações criadas
 */
const createNotificationsBulk = async (io, alerts) => {
  if (!alerts || alerts.length === 0) return [];

  try {
    const notificationDocs = alerts.map(({ recipientId, type, content, bubbleId }) => ({
      recipient: recipientId,
      type,
      content,
      bubbleId: bubbleId || undefined,
    }));

    const result = await Notification.insertMany(notificationDocs, { ordered: false });

    if (io) {
      for (const notif of result) {
        try {
          io.to(`user_${notif.recipient}`).emit('new_notification', notif);
        } catch (emitErr) {
          logger.warn('[NotificationService] Falha ao emitir notificação via Socket:', {
            notificationId: notif._id,
            error: emitErr.message,
          });
        }
      }
    }

    return result;
  } catch (error) {
    logger.error('[NotificationService] Falha ao criar notificações em lote:', {
      count: alerts.length,
      error: error.message,
    });
    return [];
  }
};

module.exports = {
  createNotification,
  createNotificationsBulk,
};

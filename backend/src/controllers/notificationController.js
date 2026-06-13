// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: controllers/notificationController.js
// Propósito: Controle de Notificações Otimizado, Seguro e Efêmero (Sênior)
// ============================================================

const Notification = require('../models/Notification');

// ============================================================
// 1. LISTAR NOTIFICAÇÕES (Otimizado com Lean, Projeção e Higienização)
// ============================================================
exports.getNotifications = async (req, res, next) => {
  try {
    // Sênior: Sanitização estrita contra ataques de sobrecarga de paginação
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    // Sênior: Uso de .lean() para transformar o retorno em objetos JS puros.
    const notifications = await Notification.find(query)
      .populate('sender', 'username')     
      .populate('bubbleId', 'title subject content expiresAt isAnonymous') // Sênior: Traz isAnonymous para validar regras de exibição na UI
      .sort({ createdAt: -1 })            
      .skip(skip)
      .limit(limit)
      .lean();

    // Tratamento Sênior de Privacidade: Se a bolha de origem era anônima, 
    // higienizamos o sender em tempo de execução para blindar a identidade do autor.
    const sanitizedNotifications = notifications.map(notification => {
      if (notification.bubbleId?.isAnonymous) {
        return {
          ...notification,
          sender: { username: 'Anônimo' }
        };
      }
      // Se o usuário foi deletado da plataforma, evita quebrar o front com valores nulos
      if (!notification.sender) {
        return {
          ...notification,
          sender: { username: 'Usuário Inativo' }
        };
      }
      return notification;
    });

    const total = await Notification.countDocuments(query);

    return res.json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      count: sanitizedNotifications.length,
      notifications: sanitizedNotifications
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 2. MARCAR UMA NOTIFICAÇÃO COMO LIDA
// ============================================================
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        recipient: req.user._id // Trava de segurança: impede que usuários alterem notificações alheias (Anti-IDOR)
      },
      { $set: { read: true } }, 
      { new: true }
    ).lean();
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada ou acesso negado.' });
    }
    
    return res.json({ success: true, message: 'Notificação marcada como lida.' });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 3. MARCAR TODAS COMO LIDAS (Otimizado em Massa)
// ============================================================
exports.markAllAsRead = async (req, res, next) => {
  try {
    const query = { recipient: req.user._id, read: false };

    // Sênior: Verifica se há necessidade de alteração antes de disparar escrita pesada no banco
    const hasUnread = await Notification.exists(query);
    if (!hasUnread) {
      return res.json({ message: 'Você não possui notificações pendentes de leitura.' });
    }

    // Atualização atômica em lote distribuído
    await Notification.updateMany(query, { $set: { read: true } });
    
    return res.json({ success: true, message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 4. CONTAR NOTIFICAÇÕES NÃO LIDAS (Velocidade Máxima)
// ============================================================
exports.countUnread = async (req, res, next) => {
  try {
    // Sênior: countDocuments usa índices nativos do MongoDB combinando (recipient + read). Operação instantânea.
    const count = await Notification.countDocuments({ 
      recipient: req.user._id, 
      read: false 
    });
    
    return res.json({ count });
  } catch (error) {
    return next(error);
  }
};
// ============================================================
// CONTROLLER: NOTIFICAÇÕES
// Gerencia o sistema de notificações do usuário:
//   - Listar notificações (paginado)
//   - Marcar como lida (individual ou todas)
//   - Contar não lidas (para badge no frontend)
// ============================================================

const Notification = require('../models/Notification');

// ============================================================
// 1. LISTAR NOTIFICAÇÕES
// Retorna as notificações do usuário logado.
// Ordenadas da mais recente para a mais antiga.
// Paginadas (20 por página).
// Popula o sender (username) e a bolha (content).
// ============================================================
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username')     // Quem gerou a notificação
      .populate('bubbleId', 'content')    // Conteúdo da bolha relacionada
      .sort({ createdAt: -1 })            // Mais recentes primeiro
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: req.user._id });

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      notifications
    });
  } catch (error) {
    console.error('Erro getNotifications:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações.' });
  }
};

// ============================================================
// 2. MARCAR UMA NOTIFICAÇÃO COMO LIDA
// Usado quando o usuário clica em uma notificação específica.
// Verifica se a notificação pertence ao usuário (segurança).
// ============================================================
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        recipient: req.user._id  // Garante que só o dono pode marcar como lida
      },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada.' });
    }
    
    res.json({ message: 'Notificação marcada como lida.' });
  } catch (error) {
    console.error('Erro markAsRead:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificação.' });
  }
};

// ============================================================
// 3. MARCAR TODAS COMO LIDAS
// Botão "Marcar todas como lidas" no frontend.
// Atualiza em massa todas as notificações não lidas do usuário.
// ============================================================
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    
    res.json({ message: 'Todas notificações marcadas como lidas.' });
  } catch (error) {
    console.error('Erro markAllAsRead:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificações.' });
  }
};

// ============================================================
// 4. CONTAR NOTIFICAÇÕES NÃO LIDAS
// Usado para exibir o badge vermelho no ícone de sino.
// Chamado periodicamente pelo frontend e via Socket.IO.
// ============================================================
exports.countUnread = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user._id, 
      read: false 
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Erro countUnread:', error);
    res.status(500).json({ message: 'Erro ao contar notificações.' });
  }
};
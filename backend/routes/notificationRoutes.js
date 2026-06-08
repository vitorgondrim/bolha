// ============================================================
// ROTAS: NOTIFICAÇÕES
// Endpoints para o sistema de notificações:
//   - Listar notificações
//   - Contar não lidas (badge)
//   - Marcar como lida (individual ou todas)
// ============================================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação
router.get('/', protect, notificationController.getNotifications);
router.get('/count', protect, notificationController.countUnread);
router.patch('/read-all', protect, notificationController.markAllAsRead);
router.patch('/:id/read', protect, notificationController.markAsRead);

module.exports = router;
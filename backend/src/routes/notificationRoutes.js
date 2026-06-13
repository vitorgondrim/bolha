// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: routes/notificationRoutes.js
// Propósito: Roteamento de Notificações com Escopo Protegido (Sênior)
// ============================================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

// Sênior: Aplica o middleware de proteção globalmente para este roteador.
// Evita redundância de código e garante que nenhuma rota nova fique desprotegida por esquecimento.
router.use(protect);

// ============================================================
// ENDPOINTS DE NOTIFICAÇÃO
// ============================================================

// GET /api/notifications - Listar notificações paginadas
router.get('/', notificationController.getNotifications);

// GET /api/notifications/count - Contar notificações não lidas (Badge do ícone)
router.get('/count', notificationController.countUnread);

// PATCH /api/notifications/read-all - Marcar todas como lidas (Operação em Massa)
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read - Marcar uma notificação específica como lida
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: src/routes/userRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');

// 1. ROTAS ESTÁTICAS E ESPECÍFICAS
router.get('/me', protect, userController.getOwnProfile);
router.patch('/update', protect, userController.updateProfile);

// 2. RELACIONAMENTOS
router.post('/follow/:id', protect, userController.toggleFollow);

// 3. ROTAS DINÂMICAS / PÚBLICAS
router.get('/profile-by-id/:id', optionalAuth, userController.getPublicProfileById);
router.get('/:username', optionalAuth, userController.getPublicProfile);

module.exports = router;
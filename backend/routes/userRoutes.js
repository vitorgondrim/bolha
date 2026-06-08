// ============================================================
// ROTAS: USUÁRIOS
// Endpoints para perfis e relações sociais:
//   - Perfil próprio
//   - Perfil público (por username ou ID)
//   - Atualizar perfil
//   - Seguir/deixar de seguir
// ============================================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');

// ============================================================
// ROTAS PROTEGIDAS (exigem autenticação)
// ============================================================

// Perfil do próprio usuário logado
router.get('/me', protect, userController.getOwnProfile);

// Atualizar perfil (bio, emblema fixado)
router.patch('/update', protect, userController.updateProfile);

// Seguir / deixar de seguir
router.post('/follow/:id', protect, userController.toggleFollow);

// ============================================================
// ROTAS PÚBLICAS (autenticação opcional para incluir "isFollowing")
// ============================================================

// Buscar perfil público por username
router.get('/:username', optionalAuth, userController.getPublicProfile);

// Buscar perfil público por ID (útil para notificações)
router.get('/id/:id', optionalAuth, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id).select('-password -email');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json({ username: user.username, bio: user.bio, id: user._id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
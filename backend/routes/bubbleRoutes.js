// ============================================================
// ROTAS: BOLHAS
// Define todos os endpoints relacionados a bolhas:
//   - Feed geral (público)
//   - Bolhas vazadas (público)
//   - CRUD de bolhas (protegido)
//   - Interações: like, dislike, sopro, comentário (protegido)
//   - Feed de seguidos (protegido)
// ============================================================

const express = require('express');
const router = express.Router();
const bubbleController = require('../controllers/bubbleController');
const { protect } = require('../middlewares/authMiddleware');
const { bubbleExistsAndAlive } = require('../middlewares/bubbleMiddleware');
const { limits } = require('../middlewares/rateLimitPerUser');
const { validateBubble, validateComment } = require('../middlewares/sanitizeInput');
const upload = require('../middlewares/uploadMiddleware');

// ============================================================
// ROTAS PÚBLICAS (não exigem autenticação)
// ============================================================

// Feed geral: todas as bolhas ativas (inclui vazadas)
router.get('/', bubbleController.getAllBubbles);

// Bolhas vazadas: página dedicada
router.get('/leaked', bubbleController.getLeakedBubbles);

// ============================================================
// ROTAS PROTEGIDAS (exigem autenticação)
// ============================================================

// Criar bolha: rate limit → upload de imagem + validação
// A ordem é importante: upload.single('image') DEVE vir antes do validateBubble
// porque o Multer processa o multipart/form-data e disponibiliza req.body
router.post('/', protect, limits.bubbleCreation, upload.single('image'), validateBubble, bubbleController.createBubble);

// Minhas bolhas
router.get('/my', protect, bubbleController.getMyBubbles);

// Perfil do usuário logado (com emblemas)
router.get('/profile', protect, bubbleController.getProfile);

// Feed de seguidos: bolhas de quem o usuário segue
router.get('/following', protect, async (req, res, next) => {
  try {
    const Bubble = require('../models/Bubble');
    const User = require('../models/User');
    
    const user = await User.findById(req.user._id).select('following');
    
    if (!user || user.following.length === 0) {
      return res.json({ 
        message: 'Você ainda não segue ninguém.',
        bubbles: [] 
      });
    }
    
    const bubbles = await Bubble.find({
      author: { $in: user.following },
      expiresAt: { $gt: new Date() },
      parentBubble: null
    })
      .populate('author', 'username')
      .populate('comments.author', 'username')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ count: bubbles.length, bubbles });
  } catch (error) {
    console.error('Erro no feed following:', error);
    next(error);
  }
});

// ============================================================
// ROTAS COM PARÂMETRO :id (protegidas)
// ⚠️ ATENÇÃO: As rotas específicas (leaked, my, following, profile, user/:userId)
// DEVEM vir ANTES de /:id, senão o Express interpreta "leaked" como um :id
// ============================================================

// Histórico de bolhas de um usuário específico
router.get('/user/:userId', protect, bubbleController.getUserBubbles);

// Buscar bolha por ID
router.get('/:id', bubbleController.getBubbleById);

// Excluir bolha (apenas o autor)
router.delete('/:id', protect, bubbleExistsAndAlive, bubbleController.deleteBubble);

// Interações (protegidas + middleware de bolha + rate limit)
router.patch('/:id/like', protect, limits.like, bubbleExistsAndAlive, bubbleController.toggleLike);
router.patch('/:id/dislike', protect, limits.like, bubbleExistsAndAlive, bubbleController.toggleDislike);
router.post('/:id/sopro', protect, limits.sopro, bubbleExistsAndAlive, bubbleController.useSopro);
router.post('/:id/comment', protect, limits.comment, validateComment, bubbleExistsAndAlive, bubbleController.addComment);

module.exports = router;
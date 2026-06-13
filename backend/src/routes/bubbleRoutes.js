// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: routes/bubbleRoutes.js
// Propósito: Orquestração de Fluxos, Interações e Linha do Tempo (Sênior)
// ============================================================

const express = require('express');
const router = express.Router();
const bubbleController = require('../controllers/bubbleController');

// Importação Cirúrgica de Middlewares de Segurança e Sessão
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const { bubbleExistsAndAlive } = require('../middlewares/bubbleMiddleware');
const { limits } = require('../middlewares/rateLimitPerUser');
const { validateBubble, validateComment } = require('../middlewares/sanitizeInput');

// Sênior: Importamos os wrappers tratados do Multer para evitar quebras brutas de disco
const { uploadCover } = require('../middlewares/uploadMiddleware');

// ============================================================
// 1. ROTAS PÚBLICAS / HÍBRIDAS (Usa optionalAuth para ler estados de curtidas)
// ============================================================

// Feed Geral Vivo: Retorna as bolhas ativas mundiais. OpcionalAuth renderiza se o user curtiu ou não.
router.get('/', optionalAuth, bubbleController.getAllBubbles);

// Feed de Vazadas: Bolhas de alta relevância que furaram a bolha temporal.
router.get('/leaked', optionalAuth, bubbleController.getLeakedBubbles);

// ============================================================
// 2. ROTAS PROTEGIDAS (Exigem Autenticação Obrigatória)
// ============================================================

// Criar Bolha: Rate Limiter -> Processamento de arquivo seguro com tratamento -> Validação -> Controller
router.post('/', protect, limits.bubbleCreation, uploadCover, validateBubble, bubbleController.createBubble);

// Minhas Bolhas: Histórico de bolhas do próprio usuário (vivas e estouradas de até 7 dias)
router.get('/my', protect, bubbleController.getMyBubbles);

// Perfil do Usuário Logado: Dados consolidados e contadores de medalhas/emblemas
router.get('/profile', protect, bubbleController.getProfile);

// Feed de Seguidos: Sênior - Encaminhado para o Controller para manter as responsabilidades separadas!
router.get('/following', protect, bubbleController.getFollowingFeed);

// ============================================================
// 3. ROTAS COM PARÂMETRO DINÂMICO :id
// ⚠️ Nota de Engenharia: Posicionadas ao final para não colidir com caminhos estáticos.
// ============================================================

// Histórico Público de um Usuário: Permite ver as bolhas ativas de terceiros
router.get('/user/:userId', optionalAuth, bubbleController.getUserBubbles);

// Detalhe de uma Bolha específica: Traz a bolha e seus comentários embutidos
router.get('/:id', optionalAuth, bubbleController.getBubbleById);

// Exclusão de uma Bolha: Verifica se ela existe/está viva e deixa o controller validar o dono
router.delete('/:id', protect, bubbleExistsAndAlive, bubbleController.deleteBubble);

// ============================================================
// 4. INTERAÇÕES E ENGAJAMENTO (Protegidas + Rate Limit + Existência Lógica)
// ============================================================
router.patch('/:id/like', protect, limits.like, bubbleExistsAndAlive, bubbleController.toggleLike);
router.patch('/:id/dislike', protect, limits.like, bubbleExistsAndAlive, bubbleController.toggleDislike);
router.post('/:id/sopro', protect, limits.sopro, bubbleExistsAndAlive, bubbleController.useSopro);
router.post('/:id/comment', protect, limits.comment, validateComment, bubbleExistsAndAlive, bubbleController.addComment);

// Estourar Bolha: Interação direta entre usuários (Pop)
router.post('/:id/pop', protect, limits.pop, bubbleExistsAndAlive, bubbleController.popBubble);

module.exports = router;
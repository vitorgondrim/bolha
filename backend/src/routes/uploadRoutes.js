// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: routes/uploadRoutes.js
// Propósito: Roteamento Seguro e Semântico de Mídias (Sênior)
// ============================================================

const express = require('express');
const router = express.Router();
const { uploadAvatar, uploadCover } = require('../middlewares/uploadMiddleware');
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middlewares/authMiddleware');

// Sênior: Proteção global para todas as rotas deste arquivo.
// Ninguém envia arquivos para o servidor sem estar autenticado.
router.use(protect);

// ============================================================
// ENDPOINTS DE MÍDIA / PERFIL
// ============================================================

// PATCH /api/uploads/avatar - Atualizar foto de perfil (Arquivo físico)
// Sênior: Mudado para PATCH por se tratar de uma alteração parcial no documento do User.
router.patch('/avatar', uploadAvatar, uploadController.uploadAvatar);

// PATCH /api/uploads/cover - Atualizar imagem de capa (Arquivo físico)
router.patch('/cover', uploadCover, uploadController.uploadCover);

// PATCH /api/uploads/cover-url - Atualizar imagem de capa passando apenas uma URL string
router.patch('/cover-url', uploadController.updateCoverByUrl);

module.exports = router;
// ============================================================
// ROTAS: UPLOAD
// Endpoints para upload de imagens do usuário:
//   - Avatar (foto de perfil)
//   - Capa (banner) - arquivo ou URL
// ============================================================

const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middlewares/authMiddleware');

// Upload de avatar (arquivo)
router.post('/avatar', protect, upload.single('avatar'), uploadController.uploadAvatar);

// Upload de capa (arquivo)
router.post('/cover', protect, upload.single('cover'), uploadController.uploadCover);

// Atualizar capa por URL (sem upload)
router.post('/cover-url', protect, uploadController.updateCoverByUrl);

module.exports = router;
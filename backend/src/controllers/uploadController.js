// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: controllers/uploadController.js
// Propósito: Gerenciamento Seguro, Consistente e Eficiente de Mídias (Sênior)
// ============================================================

const User = require('../models/User');
const logger = require('../utils/logger');
const { deleteFromCloudinary } = require('../middlewares/uploadMiddleware');

/**
 * Remove mídia anterior do Cloudinary quando um novo arquivo é enviado.
 * Compatível com URLs do Cloudinary e com URLs legadas (/uploads/...).
 */
const deleteOldMedia = async (url) => {
  if (!url) return;
  try {
    if (url.includes('res.cloudinary.com')) {
      await deleteFromCloudinary(url);
    }
    // URLs legadas em /uploads/ não precisam mais de limpeza em disco
    // já que o storage local foi removido
  } catch (error) {
    logger.warn('Nao foi possivel deletar midia antiga:', { url, error: error.message });
  }
};

// ============================================================
// 1. UPLOAD DE AVATAR (Otimizado para Query Única)
// ============================================================
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    
    const newAvatarUrl = req.file.cloudinaryUrl;
    
    const oldUserDoc = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl: newAvatarUrl } },
      { new: false, select: 'avatarUrl' }
    ).lean();
    
    if (oldUserDoc && oldUserDoc.avatarUrl) {
      deleteOldMedia(oldUserDoc.avatarUrl);
    }
    
    return res.json({ 
      success: true,
      message: 'Avatar atualizado com sucesso!',
      avatarUrl: newAvatarUrl
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 2. UPLOAD DE CAPA (ARQUIVO - Otimizado para Query Única)
// ============================================================
exports.uploadCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    
    const newCoverUrl = req.file.cloudinaryUrl;
    
    const oldUserDoc = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { coverUrl: newCoverUrl } },
      { new: false, select: 'coverUrl' }
    ).lean();
    
    if (oldUserDoc && oldUserDoc.coverUrl) {
      deleteOldMedia(oldUserDoc.coverUrl);
    }
    
    return res.json({ 
      success: true,
      message: 'Capa atualizada com sucesso!',
      coverUrl: newCoverUrl
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 3. ATUALIZAR CAPA POR URL
// ============================================================
exports.updateCoverByUrl = async (req, res, next) => {
  try {
    const { coverUrl } = req.body;
    
    if (!coverUrl || !coverUrl.trim()) {
      return res.status(400).json({ message: 'URL da capa é obrigatória.' });
    }
    
    // Regex Sênior robusta para validação de URLs de imagens
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
    if (!urlPattern.test(coverUrl.trim())) {
      return res.status(400).json({ message: 'Por favor, forneça uma URL de imagem válida.' });
    }

    const cleanedUrl = coverUrl.trim();

    // Query única recuperando a capa anterior para o caso de precisar limpar disco
    const oldUserDoc = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { coverUrl: cleanedUrl } },
      { new: false, select: 'coverUrl' }
    ).lean();
    
    if (oldUserDoc && oldUserDoc.coverUrl) {
      deleteOldMedia(oldUserDoc.coverUrl);
    }
    
    return res.json({ 
      success: true,
      message: 'Capa atualizada com sucesso!', 
      coverUrl: cleanedUrl 
    });
  } catch (error) {
    return next(error);
  }
};

// Exporta a função de limpeza para uso em outros controllers (ex: deleteBubble)
exports.deleteOldFile = deleteOldMedia;

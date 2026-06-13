// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: controllers/uploadController.js
// Propósito: Gerenciamento Seguro, Consistente e Eficiente de Mídias (Sênior)
// ============================================================

const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Função Auxiliar Sênior: Limpeza de disco blindada
 * Remove de forma assíncrona o arquivo antigo evitando Path Traversal.
 */
const deleteOldFile = async (relativeUrl) => {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  
  try {
    // Sênior: path.basename isola apenas o nome do arquivo (ex: "foto.jpg"), 
    // neutralizando qualquer tentativa de injeção de diretório como "../"
    const filename = path.basename(relativeUrl);
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Verifica se o arquivo existe antes de tentar deletar
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    // Mantido como log seguro: não quebra a requisição do usuário se o arquivo físico sumiu
    logger.warn('Nao foi possivel deletar arquivo antigo:', { file: relativeUrl, error: error.message });
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
    
    const newAvatarUrl = `/uploads/${req.file.filename}`;
    
    // Sênior: Executa a operação em uma única chamada ao banco.
    // { new: false } faz o Mongoose retornar o objeto ANTES da modificação,
    // permitindo pegar o avatarUrl antigo sem precisar de um findById prévio.
    const oldUserDoc = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl: newAvatarUrl } },
      { new: false, select: 'avatarUrl' }
    ).lean();
    
    // Se ele já tinha um avatar salvo localmente, dispara a limpeza em background
    if (oldUserDoc && oldUserDoc.avatarUrl) {
      deleteOldFile(oldUserDoc.avatarUrl);
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
    
    const newCoverUrl = `/uploads/${req.file.filename}`;
    
    // Query única atômica recuperando o estado anterior
    const oldUserDoc = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { coverUrl: newCoverUrl } },
      { new: false, select: 'coverUrl' }
    ).lean();
    
    if (oldUserDoc && oldUserDoc.coverUrl) {
      deleteOldFile(oldUserDoc.coverUrl);
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
      deleteOldFile(oldUserDoc.coverUrl);
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
exports.deleteOldFile = deleteOldFile;

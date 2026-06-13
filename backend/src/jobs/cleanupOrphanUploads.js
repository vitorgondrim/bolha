// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: jobs/cleanupOrphanUploads.js
// Propósito: Limpeza periódica de arquivos órfãos no diretório de uploads
// ============================================================

const fs = require('fs').promises;
const path = require('path');
const Bubble = require('../models/Bubble');
const User = require('../models/User');
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Proteção: não deleta arquivos com menos de 24 horas
// para evitar conflitos com uploads recém-iniciados
const MIN_FILE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Coleta todas as URLs de mídia ativas no banco de dados
 * (Bubbles com mediaUrl + Users com avatarUrl/coverUrl)
 */
const collectActiveMediaUrls = async () => {
  const activeUrls = new Set();

  // Bolhas com mídia local (começa com /uploads/)
  const bubbles = await Bubble.find({ mediaUrl: { $ne: null } })
    .select('mediaUrl')
    .lean();
  
  for (const bubble of bubbles) {
    if (bubble.mediaUrl && bubble.mediaUrl.startsWith('/uploads/')) {
      activeUrls.add(path.basename(bubble.mediaUrl));
    }
  }

  // Usuários com avatar ou capa local
  const users = await User.find({
    $or: [
      { avatarUrl: { $ne: null } },
      { coverUrl: { $ne: null } }
    ]
  }).select('avatarUrl coverUrl').lean();

  for (const user of users) {
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      activeUrls.add(path.basename(user.avatarUrl));
    }
    if (user.coverUrl && user.coverUrl.startsWith('/uploads/')) {
      activeUrls.add(path.basename(user.coverUrl));
    }
  }

  return activeUrls;
};

/**
 * Função principal de limpeza
 * Compara arquivos no disco com URLs ativas no DB e remove orfãos
 */
const cleanupOrphanFiles = async () => {
  try {
    // Garante que o diretório existe
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      logger.warn('[CLEANUP] Diretorio de uploads nao existe. Pulando limpeza.');
      return;
    }

    const [files, activeUrls] = await Promise.all([
      fs.readdir(UPLOAD_DIR),
      collectActiveMediaUrls()
    ]);

    const now = Date.now();
    let deletedCount = 0;
    let skippedCount = 0;
    let protectedCount = 0;

    for (const file of files) {
      // Pula arquivos que estão sendo referenciados no DB
      if (activeUrls.has(file)) continue;

      const filePath = path.join(UPLOAD_DIR, file);

      try {
        const stat = await fs.stat(filePath);

        // Proteção: não deleta arquivos com menos de 24 horas
        const fileAge = now - stat.mtimeMs;
        if (fileAge < MIN_FILE_AGE_MS) {
          protectedCount++;
          continue;
        }

        await fs.unlink(filePath);
        deletedCount++;
      } catch (error) {
        // Arquivo pode ter sido removido entre a readdir e a unlink
        logger.warn('Erro ao processar arquivo no cleanup:', { file, error: error.message });
      }
    }

    logger.info('[CLEANUP] Limpeza de uploads concluida:', {
      totalFiles: files.length,
      activeInDB: activeUrls.size,
      deleted: deletedCount,
      protected: protectedCount,
      skipped: skippedCount
    });
  } catch (error) {
    logger.error('[CLEANUP] Erro na limpeza de arquivos orfaos:', { error: error.message });
  }
};

module.exports = { cleanupOrphanFiles };
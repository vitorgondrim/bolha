// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/uploadMiddleware.js
// Propósito: Interceptação Segura de Multipart Form-Data + Cloudinary
//            Pipeline resiliente com rollback de arquivos órfãos
// ============================================================

const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// ============================================================
// CONFIGURAÇÃO DO CLOUDINARY
// As variáveis CLOUDINARY_* devem estar definidas no .env
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// STORAGE EM MEMÓRIA (Substitui diskStorage)
// O buffer do arquivo fica em req.file.buffer para upload ao Cloudinary
// ============================================================
const storage = multer.memoryStorage();

// ============================================================
// FILTRO DE SEGURANÇA MULTI-CAMADA (MIME + EXTENSÃO)
// ============================================================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  const isExtensionValid = allowedExtensions.test(path.extname(file.originalname));
  const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);

  if (isMimeTypeValid && isExtensionValid) {
    return cb(null, true);
  }

  return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
};

// ============================================================
// INSTÂNCIA DO MULTER E CONFIGURAÇÃO DE LIMITES
// ============================================================
const uploadConfig = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024, // Limite físico de 5MB
    files: 1
  }
});

// ============================================================
// HELPER: UPLOAD DO BUFFER PARA O CLOUDINARY
// Retorna a URL segura (https) do arquivo hospedado
// ============================================================
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `bolha/${folder}`,
        resource_type: 'auto',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// ============================================================
// HELPER: DELETAR ARQUIVO DO CLOUDINARY POR URL
// ============================================================
const deleteFromCloudinary = async (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return;

  try {
    // Extrai o public_id da URL do Cloudinary
    // Formato: https://res.cloudinary.com/<cloud>/image/upload/v123/bolha/<folder>/<filename>.ext
    const parts = url.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return;

    // Pega tudo depois de "upload/" e antes da extensão
    const pathWithVersion = parts.slice(uploadIdx + 1).join('/');
    // Remove versão (v1234567/) se presente
    const publicId = pathWithVersion.replace(/^v\d+\//, '').replace(/\.[^.]+$/, '');

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Não quebra a requisição se a deleção falhar
    console.warn('Falha ao deletar arquivo do Cloudinary:', { url, error: error.message });
  }
};

// ============================================================
// HELPER: REMOVER ARQUIVO ÓRFÃO DO CLOUDINARY POR PUBLIC_ID
// Usado internamente para rollback quando a criação do registro no DB falha
// ============================================================
const rollbackCloudinaryUpload = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn('Falha no rollback de arquivo órfão do Cloudinary:', { publicId, error: error.message });
  }
};

// ============================================================
// WRAPPER SÊNIOR: INTERCEPTADOR DE ERROS DO MULTER + CLOUDINARY
// Traduz falhas do Multer e Cloudinary para respostas limpas
// Pipeline resiliente com rollback de arquivos órfãos
// ============================================================
const handleSingleUpload = (fieldName, folder) => {
  const uploadMiddleware = uploadConfig.single(fieldName);

  return (req, res, next) => {
    uploadMiddleware(req, res, async (err) => {
      // ─── FASE 1: Validação do Multer ─────────────────────────────
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              message: 'Arquivo grande demais. O limite máximo permitido é 5MB.',
              code: 'FILE_TOO_LARGE',
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              message: 'Formato inválido. Apenas mídias JPG, JPEG, PNG, GIF ou WEBP são permitidas.',
              code: 'INVALID_FILE_TYPE',
            });
          }
          return res.status(400).json({
            message: `Erro no upload do arquivo: ${err.message}`,
            code: 'UPLOAD_ERROR',
          });
        }
        return next(err);
      }

      // Se não veio arquivo, segue o fluxo normal
      if (!req.file) return next();

      // ─── FASE 2: Upload para Cloudinary ──────────────────────────
      let cloudinaryResult;
      try {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer, folder);
      } catch (uploadError) {
        // Graceful Degradation: não expõe detalhes de infraestrutura
        return res.status(502).json({
          message: 'Serviço de imagens temporariamente indisponível. Tente novamente em alguns instantes.',
          code: 'CLOUDINARY_UPLOAD_FAILED',
        });
      }

      // Enriquece req.file com dados do Cloudinary para uso nos controllers
      req.file.cloudinaryUrl = cloudinaryResult.secure_url;
      req.file.cloudinaryPublicId = cloudinaryResult.public_id;

      // ─── FASE 3: Interceptação do response para rollback ─────────
      // Wrapper no res.json original para detectar falha na criação do registro
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);
      let statusCode = 200;

      res.status = function (code) {
        statusCode = code;
        return originalStatus(code);
      };

      res.json = function (body) {
        // Se a resposta indicar erro do servidor (5xx) ou falha de validação crítica (422)
        // que impede a criação do registro, faz rollback do arquivo no Cloudinary
        if (statusCode >= 500 || (statusCode === 422 && !body?.success)) {
          rollbackCloudinaryUpload(req.file.cloudinaryPublicId);
        }

        // Restaura os métodos originais para evitar interferência em chamadas subsequentes
        res.status = originalStatus;
        res.json = originalJson;

        return originalJson(body);
      };

      return next();
    });
  };
};

module.exports = {
  // uploadAvatar: para avatares de usuário (pasta "avatars")
  uploadAvatar: handleSingleUpload('avatar', 'avatars'),
  // uploadCover: para capas de bubbles e de usuário (pasta "covers")
  uploadCover: handleSingleUpload('cover', 'covers'),
  // Utilitários expostos para uso em controllers
  cloudinary,
  deleteFromCloudinary,
};
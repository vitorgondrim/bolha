// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/uploadMiddleware.js
// Propósito: Interceptação Segura de Multipart Form-Data (Sênior)
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Sênior: Inicialização assíncrona/imediata da pasta de uploads.
// É executado apenas uma vez quando o processo do servidor sobe, garantindo que o disco esteja pronto.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================================
// CONFIGURAÇÃO DE ARMAZENAMENTO EM DISCO
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Sênior: Limpa caracteres especiais do nome original (higienização contra caminhos maliciosos)
    const cleanedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    
    // Concatena o sufixo único garantindo que a extensão original permaneça em letras minúsculas
    cb(null, `${uniqueSuffix}-${cleanedOriginalName}`);
  }
});

// ============================================================
// FILTRO DE SEGURANÇA MULTI-CAMADA (MIME + EXTENSÃO)
// ============================================================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  // Sênior: Validação defensiva dupla. Checa o MimeType E valida a extensão real do arquivo via Regex.
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  const isExtensionValid = allowedExtensions.test(path.extname(file.originalname));
  const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);

  if (isMimeTypeValid && isExtensionValid) {
    return cb(null, true);
  }

  // Passamos um erro customizado para o Multer interceptar
  return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
};

// ============================================================
// INSTÂNCIA DO MULTER E CONFIGURAÇÃO DE LIMITES
// ============================================================
const uploadConfig = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024, // Limite físico estrito de 5MB por imagem
    files: 1 // Permite o upload de apenas 1 arquivo por requisição nessa rota (evita spam de I/O)
  }
});

// ============================================================
// WRAPPER SÊNIOR: INTERCEPTADOR DE ERROS DO MULTER
// Traduz falhas de baixo nível do Multer para respostas limpas (400/413)
// ============================================================
const handleSingleUpload = (fieldName) => {
  const uploadMiddleware = uploadConfig.single(fieldName);

  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return next();

      // Tratamento customizado de erros específicos do Multer
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'Arquivo grande demais. O limite máximo permitido é 5MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Formato inválido. Apenas mídias JPG, JPEG, PNG, GIF ou WEBP são permitidas.' });
        }
        return res.status(400).json({ message: `Erro no upload do arquivo: ${err.message}` });
      }

      // Repassa erros desconhecidos para o fluxo centralizador da API
      return next(err);
    });
  };
};

module.exports = {
  uploadAvatar: handleSingleUpload('avatar'),
  uploadCover: handleSingleUpload('cover')
};
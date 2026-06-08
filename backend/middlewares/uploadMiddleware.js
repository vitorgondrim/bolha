// ============================================================
// MIDDLEWARE: UPLOAD DE ARQUIVOS
// Configuração do Multer para upload de imagens.
// 
// Segurança:
//   - Apenas formatos de imagem permitidos (jpeg, png, gif, webp)
//   - Limite de 5MB por arquivo
//   - Nome único gerado (timestamp + random)
//   - Pasta uploads/ criada automaticamente
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================
// CONFIGURAÇÃO DE ARMAZENAMENTO
// ============================================================
const uploadDir = 'uploads/';

// Cria a pasta uploads/ se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  // Define a pasta de destino
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // Gera nome único: timestamp + número aleatório + extensão original
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// ============================================================
// FILTRO DE TIPO DE ARQUIVO
// Só permite formatos de imagem seguros.
// ============================================================
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato não suportado. Use JPG, PNG ou GIF.'), false);
  }
};

// ============================================================
// CONFIGURAÇÃO DO MULTER
// ============================================================
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024  // 5MB máximo
  }
});

module.exports = upload;
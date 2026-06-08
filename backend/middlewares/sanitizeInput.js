// ============================================================
// MIDDLEWARE: SANITIZAÇÃO E VALIDAÇÃO DE INPUT
// Usa express-validator para limpar e validar todos os dados
// que entram na API. Protege contra:
//   - XSS (Cross-Site Scripting) → .escape()
//   - Injeção de código → .trim() + validações de formato
//   - Dados maliciosos → validações de tipo e tamanho
// ============================================================

const { body, validationResult } = require('express-validator');

// ============================================================
// VALIDAÇÃO: CRIAÇÃO DE BOLHA
// Título: obrigatório, máximo 60 caracteres
// Conteúdo: obrigatório, máximo 500 caracteres
// Assunto: opcional, máximo 30 caracteres
// MediaUrl: opcional, valida se é URL de imagem/GIF
// ============================================================
const validateBubble = [
  body('title')
    .trim()
    .escape()
    .notEmpty().withMessage('Título é obrigatório')
    .isLength({ max: 60 }).withMessage('Título: máximo 60 caracteres'),
  
  body('content')
    .trim()
    .escape()
    .notEmpty().withMessage('Conteúdo é obrigatório')
    .isLength({ max: 500 }).withMessage('Conteúdo: máximo 500 caracteres'),
  
  body('subject')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 30 }).withMessage('Assunto: máximo 30 caracteres'),
  
    body('mediaUrl')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      // Se for string vazia (upload direto), ignora validação de URL
      if (!value || value.trim() === '') return true;
      
      // Valida se é URL de imagem/GIF permitida
      const regex = /^https?:\/\/(i\.imgur\.com|media\d?\.giphy\.com|.*\.(jpg|jpeg|png|gif|webp))/i;
      if (!regex.test(value)) {
        throw new Error('URL de mídia não permitida');
      }
      return true;
    }),
  
  // Middleware que verifica os resultados da validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// ============================================================
// VALIDAÇÃO: COMENTÁRIO
// Texto: obrigatório, máximo 280 caracteres (estilo Twitter)
// ============================================================
const validateComment = [
  body('text')
    .trim()
    .escape()
    .notEmpty().withMessage('Comentário não pode estar vazio')
    .isLength({ max: 280 }).withMessage('Comentário: máximo 280 caracteres'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// ============================================================
// VALIDAÇÃO: REGISTRO
// Username: 3-20 caracteres, apenas letras/números/_
// Email: formato válido, normalizado (minúsculas)
// Senha: mínimo 6 caracteres, deve conter letras e números
// ============================================================
const validateRegister = [
  body('username')
    .trim()
    .escape()
    .notEmpty().withMessage('Username é obrigatório')
    .isLength({ min: 3, max: 20 }).withMessage('Username: 3-20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: apenas letras, números e _'),
  
  body('email')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 }).withMessage('Senha: mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z]?)(?=.*\d)/).withMessage('Senha deve conter letras e números'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// ============================================================
// VALIDAÇÃO: LOGIN
// Email: formato válido, normalizado
// Senha: obrigatória (não validamos complexidade no login)
// ============================================================
const validateLogin = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateBubble,
  validateComment,
  validateRegister,
  validateLogin
};
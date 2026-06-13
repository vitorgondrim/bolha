// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/sanitizeInput.js
// Propósito: Blindagem e Sanitização Avançada de Payloads (Sênior)
// ============================================================

const { body, validationResult } = require('express-validator');

/**
 * Função Auxiliar Sênior (DRY): Centraliza a interceptação de erros do express-validator.
 * Formata os erros de maneira limpa para o frontend.
 */
const validateResultInterceptor = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Retorna um status 422 (Unprocessable Entity) ou 400. 422 é semanticamente perfeito para erros de validação.
    return res.status(422).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  return next();
};

// ============================================================
// 1. VALIDAÇÃO: CRIAÇÃO DE BOLHA
// ============================================================
const validateBubble = [
  body('title')
    .trim()
    .notEmpty().withMessage('Título é obrigatório')
    .isLength({ max: 60 }).withMessage('Título: máximo 60 caracteres'),
  
  body('content')
    .trim()
    .notEmpty().withMessage('Conteúdo é obrigatório')
    .isLength({ max: 500 }).withMessage('Conteúdo: máximo 500 caracteres'),
  
  body('subject')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Assunto: máximo 30 caracteres'),
  
  body('mediaUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true }).withMessage('URL de mídia inválida')
    .custom((value) => {
      // Sênior: Regex seguro contra ataques ReDoS (Regex Denial of Service)
      const allowedDomainsAndExtensions = /^(https?:\/\/)?(i\.imgur\.com|media\d?\.giphy\.com|[\w-]+(\.[\w-]+)+)(\/[\w-./?%&=]*)?\.(jpg|jpeg|png|gif|webp)$/i;
      if (!allowedDomainsAndExtensions.test(value)) {
        throw new Error('Hospedagem de imagem ou formato de arquivo não permitido.');
      }
      return true;
    }),
  
  validateResultInterceptor
];

// ============================================================
// 2. VALIDAÇÃO: COMENTÁRIO
// ============================================================
const validateComment = [
  body('text')
    .trim()
    .notEmpty().withMessage('Comentário não pode estar vazio')
    .isLength({ max: 280 }).withMessage('Comentário: máximo 280 caracteres'),
  
  validateResultInterceptor
];

// ============================================================
// 3. VALIDAÇÃO: REGISTRO
// ============================================================
const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username é obrigatório')
    .isLength({ min: 3, max: 20 }).withMessage('Username deve ter entre 3 e 20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username deve conter apenas letras, números e underlines (_)'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Por favor, insira um email válido')
    .normalizeEmail({ gmail_remove_dots: false }), // Sênior: Manter pontos no Gmail evita quebras de login se o user cadastrou com ponto.

  body('password')
    .custom((value) => {
      if (!value || value.includes(' ')) {
        throw new Error('A senha não pode conter espaços em branco.');
      }
      return true;
    })
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*\d)/i).withMessage('A senha deve conter pelo menos uma letra e um número'),
  
  validateResultInterceptor
];

// ============================================================
// 4. VALIDAÇÃO: LOGIN
// ============================================================
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail({ gmail_remove_dots: false }),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória'),
  
  validateResultInterceptor
];

module.exports = {
  validateBubble,
  validateComment,
  validateRegister,
  validateLogin
};
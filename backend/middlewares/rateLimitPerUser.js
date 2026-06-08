// ============================================================
// MIDDLEWARE: RATE LIMITING POR USUÁRIO
// Protege a API contra abusos e ataques de força bruta.
// 
// Estratégia:
//   - Usuário logado: limite baseado no ID do usuário
//   - Visitante: limite baseado no IP
//
// Limites diferentes por tipo de ação:
//   - Ações sensíveis (criar bolha): 10/min
//   - Interações (like, sopro): 15-30/min
//   - Autenticação (login): 10/15min
// ============================================================

const rateLimit = require('express-rate-limit');

/**
 * Cria um rate limiter personalizado por usuário.
 * 
 * @param {Object} options
 * @param {number} options.windowMs - Janela de tempo em ms
 * @param {number} options.max - Máximo de requisições na janela
 * @param {string} options.message - Mensagem de erro
 */
const createUserRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,  // 1 minuto padrão
    max = 30,              // 30 requisições por minuto padrão
    message = 'Muitas requisições. Aguarde um momento.'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { message },
    keyGenerator: (req) => {
      // Usa ID do usuário se logado (mais preciso), senão usa IP
      return req.user?._id?.toString() || req.ip;
    },
    // express-rate-limit v7+ usa validate configurações
    validate: { xForwardedForHeader: false },
  });
};

// ============================================================
// LIMITES PRÉ-CONFIGURADOS POR TIPO DE AÇÃO
// ============================================================
const limits = {
  // Criação de bolha: 10 por minuto (evita spam)
  bubbleCreation: createUserRateLimiter({ windowMs: 60 * 1000, max: 10 }),
  
  // Sopro: 15 por minuto (usuário pode soprar várias bolhas rápido)
  sopro: createUserRateLimiter({ windowMs: 60 * 1000, max: 15 }),
  
  // Like: 30 por minuto (interação rápida e leve)
  like: createUserRateLimiter({ windowMs: 60 * 1000, max: 30 }),
  
  // Comentário: 20 por minuto (já tem anti-spam de 30s no controller)
  comment: createUserRateLimiter({ windowMs: 60 * 1000, max: 20 }),
  
  // Follow: 20 por minuto
  follow: createUserRateLimiter({ windowMs: 60 * 1000, max: 20 }),
  
  // Autenticação: 10 tentativas a cada 15 minutos
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
    skipSuccessfulRequests: true,
    validate: { xForwardedForHeader: false },
  })
};

module.exports = { createUserRateLimiter, limits };
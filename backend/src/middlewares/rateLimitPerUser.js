// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/rateLimiter.js
// Propósito: Proteção Distribuída contra Flood e Abuso de API (Sênior)
// ============================================================

const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const logger = require('../utils/logger');

// Sênior: Validação da URI do banco. O limiter precisa gravar os estados de forma centralizada.
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!MONGO_URI) {
  logger.error('ERRO CRITICO: MONGO_URI nao configurada. O Rate Limiter centralizado falhou.');
  process.exit(1);
}

/**
 * Fábrica Sênior de Rate Limiters baseados em Estado Centralizado (MongoDB).
 * Garante consistência de limites mesmo operando com múltiplas instâncias da API.
 * * @param {Object} options
 * @param {number} options.windowMs - Janela de tempo de monitoramento
 * @param {number} options.max - Limite máximo de requisições dentro da janela
 * @param {string} options.message - Resposta customizada ao estourar o limite
 */
const createUserRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    max = 30,
    message = 'Sua taxa de cliques está muito alta. Respire fundo e aguarde um momento.'
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Retorna os headers 'RateLimit-Limit' e 'RateLimit-Remaining'
    legacyHeaders: false,  // Desativa os headers antigos 'X-RateLimit-*'
    message: { status: 429, message },
    
    // Sênior: Armazenamento centralizado no MongoDB para consistência multi-servidor
    store: new MongoStore({
      uri: MONGO_URI,
      expireTimeMs: windowMs,
      collectionName: 'rate_limits', // Cria uma tabela leve dedicada no Mongo Atlas
      errorHandler: (err) => logger.error('Falha no Store do Rate Limiter:', { error: err.message })
    }),

    // Identificador Inteligente: Identifica o ator da requisição
    keyGenerator: (req) => {
      // Prioriza ID do usuário logado (imune a trocas de rede). Fallback seguro para IP.
      return req.user?._id?.toString() || req.ip;
    },

    // Sênior: Deixa ativo o validador para avisar o desenvolvedor se o "trust proxy" foi esquecido no server.js
    validate: { xForwardedForHeader: true },
  });
};

// ============================================================
// COMPOSIÇÃO DE POLÍTICAS DE USO POR CRITICIDADE
// ============================================================
const limits = {
  // Criação de bolha: 10/min. Evita scripts postando milhares de bolhas fantasmas.
  bubbleCreation: createUserRateLimiter({ 
    windowMs: 60 * 1000, 
    max: 10,
    message: 'Você está soprando bolhas novas rápido demais! Aguarde um minuto.'
  }),
  
  // Sopro: 15/min. Permite engajamento em rajadas curtas.
  sopro: createUserRateLimiter({ windowMs: 60 * 1000, max: 15 }),
  
  // Like: 30/min. Interação rápida de UI.
  like: createUserRateLimiter({ windowMs: 60 * 1000, max: 30 }),

  // Pop: 20/min. Interação direta para estourar bolhas.
  pop: createUserRateLimiter({ windowMs: 60 * 1000, max: 20 }),
  
  // Comentário: 20/min. Previne injeção de spam em conversas.
  comment: createUserRateLimiter({ windowMs: 60 * 1000, max: 20 }),
  
  // Follow: 20/min. Bloqueia bots de "follow/unfollow" em massa.
  follow: createUserRateLimiter({ windowMs: 60 * 1000, max: 20 }),
  
  // Autenticação: Ataques de força bruta são barrados agressivamente aqui.
  // 5 tentativas erradas bloqueiam o par IP/Identificador por 15 minutos.
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Muitas tentativas de login malsucedidas. Bloqueado por segurança por 15 minutos.' },
    skipSuccessfulRequests: true, // Se o usuário acertar a senha, ele não gasta esse limite.
    store: new MongoStore({
      uri: MONGO_URI,
      expireTimeMs: 15 * 60 * 1000,
      collectionName: 'auth_rate_limits'
    }),
    keyGenerator: (req) => req.body.email?.trim().toLowerCase() || req.ip, // Trava no email digitado! Ataque direcionado cai aqui.
    validate: { xForwardedForHeader: true },
  })
};

module.exports = { createUserRateLimiter, limits };
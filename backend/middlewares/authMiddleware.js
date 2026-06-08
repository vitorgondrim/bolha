// ============================================================
// MIDDLEWARE: AUTENTICAÇÃO
// Protege rotas que exigem usuário logado.
// 
// Fluxo:
//   1. Busca o token no cookie httpOnly (mais seguro)
//   2. Fallback: busca no header Authorization
//   3. Verifica e decodifica o JWT
//   4. Busca o usuário no banco e anexa ao req
//
// optionalAuth: versão que não bloqueia a requisição
// (usada em rotas que funcionam com ou sem login)
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Cache do JWT_SECRET para evitar leitura repetida do .env
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ JWT_SECRET não definido no .env');
    throw new Error('JWT_SECRET não configurado');
  }
  return secret;
};

// ============================================================
// PROTECT: MIDDLEWARE OBRIGATÓRIO
// Bloqueia a requisição se o usuário não estiver autenticado.
// ============================================================
const protect = async (req, res, next) => {
  try {
    let token;
    
    // PRIORIDADE 1: Cookie httpOnly (mais seguro, inacessível via JS)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // PRIORIDADE 2: Header Authorization (fallback para apps mobile/testes)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Faça login.' });
    }

    // Decodifica o token e busca o usuário
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    next();
  } catch (error) {
    console.error('Erro de autenticação:', error.message);
    
    // Token expirado → frontend deve usar refresh token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    }
    
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

const getJwtSecretForOptional = () => {
  try { return getJwtSecret(); } catch { return 'fallback-secret'; }
};

// ============================================================
// OPTIONAL AUTH: MIDDLEWARE OPCIONAL
// Tenta autenticar, mas não bloqueia se falhar.
// Útil para rotas que mostram conteúdo público mas
// precisam saber se o usuário está logado (ex: "seguindo?").
// ============================================================
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, getJwtSecretForOptional());
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (error) {
    // Silenciosamente ignora erros (usuário simplesmente não fica logado)
  }
  next();
};

module.exports = { protect, optionalAuth };
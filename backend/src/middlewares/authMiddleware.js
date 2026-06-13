// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/authMiddleware.js
// Propósito: Interceptação e Validação de Sessões em Alta Performance (Sênior)
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Sênior: Validação fail-fast na inicialização do arquivo. 
// Evita funções de getter repetitivas e impede que a aplicação rode vulnerável.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('ERRO CRITICO: JWT_SECRET nao esta definido nas variaveis de ambiente!');
  process.exit(1); // Encerra o processo imediatamente se a segurança estiver comprometida
}

/**
 * Função Auxiliar Interna para extração de Token (DRY)
 */
const extractToken = (req) => {
  // Prioridade 1: Cookie httpOnly
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  // Prioridade 2: Bearer Header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// ============================================================
// 1. PROTECT (Autenticação Obrigatória)
// ============================================================
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    // Verifica a assinatura do token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Sênior: Projeta apenas os campos vitais da sessão para não inflar a memória do Node.js
    req.user = await User.findById(decoded.id)
      .select('_id username role email totalSoprosGiven') 
      .lean();

    if (!req.user) {
      return res.status(401).json({ message: 'Sessão inválida. Usuário não encontrado.' });
    }

    return next();
  } catch (error) {
    logger.warn('Falha na validacao do token:', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sessão expirada. Por favor, reautentique.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido ou corrompido.' });
    }

    return next(error); // Erros desconhecidos vão para o tratador global
  }
};

// ============================================================
// 2. OPTIONAL AUTH (Autenticação Opcional Segura)
// ============================================================
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next(); // Sem token? Segue o fluxo como visitante sem gastar CPU
    }

    // Sênior: Decodifica primeiro sem validar a assinatura para checar a expiração.
    // Se o token já expirou, nós nem gastamos CPU validando a assinatura criptográfica.
    const decodedWithoutVerification = jwt.decode(token);
    if (!decodedWithoutVerification || (decodedWithoutVerification.exp && Date.now() >= decodedWithoutVerification.exp * 1000)) {
      return next(); // Token nitidamente expirado ou inválido, ignora silenciosamente de forma rápida
    }

    // Se o formato e expiração parecem válidos, fazemos a verificação real e segura
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = await User.findById(decoded.id)
      .select('_id username role email totalSoprosGiven')
      .lean();

    return next();
  } catch (error) {
    // Sênior: Qualquer erro de criptografia ou assinatura falsa faz o middleware 
    // ignorar o usuário sem lançar erro 500 ou travar a CPU do servidor.
    return next();
  }
};

module.exports = { protect, optionalAuth };
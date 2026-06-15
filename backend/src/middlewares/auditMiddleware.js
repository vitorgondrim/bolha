// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/auditMiddleware.js
// Propósito: Auditoria Estrutural de Operações (Sênior)
// NOTA: Convertido de ESM para CJS para consistência com o projeto.
// ============================================================

const { auditLog } = require('../utils/logger');

const auditAuth = (req, res, next) => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = function (body) {
    const duration = Date.now() - startTime;
    
    auditLog('AUTH', {
      event: req.path.includes('login') ? 'LOGIN_ATTEMPT' : 'AUTH_ACTION',
      userId: req.user?._id?.toString(),
      status: res.statusCode,
      duration,
      success: res.statusCode < 400
    });

    return originalSend.call(this, body);
  };

  next();
};

const auditBubbleActions = (req, res, next) => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = function (body) {
    const duration = Date.now() - startTime;
    
    if (req.path.includes('/bubbles')) {
      auditLog('BUBBLE', {
        action: req.method,
        bubbleId: req.params.id,
        userId: req.user?._id?.toString(),
        status: res.statusCode,
        duration,
        success: res.statusCode < 400
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

module.exports = { auditAuth, auditBubbleActions };
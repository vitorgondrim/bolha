import { auditLog } from '../utils/logger.js';

export const auditAuth = (req, res, next) => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = (body) => {
    const duration = Date.now() - startTime;
    
    auditLog('AUTH', {
      event: req.path.includes('login') ? 'LOGIN_ATTEMPT' : 'AUTH_ACTION',
      userId: req.user?._id,
      status: res.statusCode,
      duration,
      success: res.statusCode < 400
    });

    return originalSend.call(res, body);
  };

  next();
};

export const auditBubbleActions = (req, res, next) => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = (body) => {
    const duration = Date.now() - startTime;
    
    if (req.path.includes('/bubbles')) {
      auditLog('BUBBLE', {
        action: req.method,
        bubbleId: req.params.id,
        userId: req.user?._id,
        status: res.statusCode,
        duration,
        success: res.statusCode < 400
      });
    }

    return originalSend.call(res, body);
  };

  next();
};
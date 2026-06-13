// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: utils/logger.js
// Propósito: Logger centralizado com Winston (Console + Arquivo rotativo)
// ============================================================

const winston = require('winston');
const { combine, timestamp, json, printf, errors } = winston.format;
const DailyRotateFile = require('winston-daily-rotate-file');

// Formato customizado para console
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  const logData = {
    timestamp,
    level,
    message,
    ...(stack && { stack }),
    ...metadata
  };
  return JSON.stringify(logData);
});

// Configuração de transporte de arquivo
const fileTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    json()
  )
});

// Logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'http',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        errors({ stack: true }),
        consoleFormat
      )
    }),
    fileTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Middleware de logging HTTP — registra cada requisição com status, duração e metadados
const httpLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.http({
      type: 'HTTP',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id || 'anonymous',
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
};

// Função utilitária para logs de auditoria
const auditLog = (type, data) => {
  const logEntry = {
    type: `AUDIT:${type}`,
    ...data,
    timestamp: new Date().toISOString()
  };
  
  logger.info(logEntry);
};

module.exports = logger;
module.exports.httpLoggerMiddleware = httpLoggerMiddleware;
module.exports.auditLog = auditLog;
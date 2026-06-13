// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/errorMiddleware.js
// Propósito: Captura, Tratamento e Padronização de Erros Globais (Sênior)
// ============================================================

const errorHandler = (err, req, res, next) => {
  // Sênior: Se os cabeçalhos já foram enviados ao cliente, delega para o Express padrão
  // Evita o erro de "Cannot set headers after they are sent to the client"
  if (res.headersSent) {
    return next(err);
  }

  // Define o status code padrão: Erro interno do servidor (500) se nenhum foi setado antes
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.statusCode) statusCode = err.statusCode; // Captura status injetados no objeto de erro

  let message = err.message || 'Ocorreu um erro interno no servidor.';
  let errors = undefined;

  // ============================================================
  // TRATAMENTO TRADUTOR DE ERROS NATIVOS (MONGOOSE / MONGO)
  // ============================================================

  // 1. Erro de ID Inválido do MongoDB (Ex: Usuário passa um ID malformado na URL)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Recurso não encontrado com o ID especificado ou formato inválido (${err.value}).`;
  }

  // 2. Erro de Validação do Mongoose (Ex: Bio maior que o limite, campos obrigatórios ausentes)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Falha na validação dos dados enviados.';
    // Sênior: Mapeia todos os campos falhos para o front-end saber exatamente o que corrigir
    errors = Object.values(err.errors).map(el => ({
      field: el.path,
      message: el.message
    }));
  }

  // 3. Erro de Chave Duplicada do MongoDB (Código 11000 - Ex: Username ou Email já cadastrados)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `O valor para o campo [${field}] já está em uso na plataforma.`;
  }

  // 4. Erros de Token JWT expirado ou malformado
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token de autenticação inválido. Por favor, faça login novamente.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Sua sessão expirou. Por favor, refaça o login.';
  }

  // ============================================================
  // LOGS E RESPOSTA DA API
  // ============================================================

  const logger = require('../utils/logger');
  // Loga o erro completo para fins de depuração/observabilidade
  logger.error(`[API ERROR] [${req.method}] ${req.originalUrl}`, {
    message: err.message,
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Retorno padronizado em JSON para blindar a experiência do usuário
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }), // Só inclui a chave 'errors' no JSON se ela tiver dados (Mongoose Validation)
    // Sênior: O stack trace (linha exata onde o código quebrou) SÓ é exibido em ambiente local (development)
    // Em produção ele fica totalmente oculto para evitar engenharia reversa de atacantes
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
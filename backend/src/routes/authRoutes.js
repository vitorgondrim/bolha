// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: routes/authRoutes.js
// Propósito: Endpoints de Autenticação e Sessão Segura (Sênior)
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Injeção de Proteções Corporativas
const { validateRegister, validateLogin } = require('../middlewares/sanitizeInput');
const { limits, createUserRateLimiter } = require('../middlewares/rateLimitPerUser');

// Limiter dedicado para rota de atualização de sessão (Prevenção de DoS de decodificação)
const refreshRateLimit = createUserRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

// ============================================================
// ENDPOINTS DE AUTENTICAÇÃO LOCAL
// ============================================================

// Registro de Novos Usuários: Barrado por força bruta de IP e validado semanticamente
router.post('/register', limits.auth, validateRegister, authController.register);

// Login Tradicional: Trava agressiva por e-mail/IP contra ataques de dicionário
router.post('/login', limits.auth, validateLogin, authController.login);

// Refresh Token: Troca o Refresh Token (via HttpOnly Cookie) por um novo Access Token ativo
router.post('/refresh-token', refreshRateLimit, authController.refreshToken);

// Logout: Revogação imediata de credenciais de cookies do cliente
router.post('/logout', authController.logout);

// ============================================================
// ENDPOINTS DE AUTENTICAÇÃO FEDERADA (GOOGLE OAUTH)
// ============================================================

// Redirecionamento Inicial: Envia o usuário para a tela oficial de login do Google
router.get('/google', authController.googleAuth);

// Callback de Retorno: Endpoint seguro que o Google chama após o usuário dar permissão
router.get('/google/callback', authController.googleCallback);

module.exports = router;
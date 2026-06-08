// ============================================================
// ROTAS: AUTENTICAÇÃO
// Define os endpoints de autenticação:
//   - Registro local
//   - Login local
//   - Login com Google OAuth
//   - Refresh token
//   - Logout
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middlewares/sanitizeInput');
const { limits } = require('../middlewares/rateLimitPerUser');

// Registro: rate limit + validação de input
router.post('/register', limits.auth, validateRegister, authController.register);

// Login: rate limit + validação de input
router.post('/login', limits.auth, validateLogin, authController.login);

// Refresh token: renova o access token sem pedir senha
router.post('/refresh-token', authController.refreshToken);

// Logout: limpa os cookies
router.post('/logout', authController.logout);

// Google OAuth: redireciona para o Google
router.get('/google', authController.googleAuth);

// Google Callback: Google redireciona para cá após login
router.get('/google/callback', authController.googleCallback);

module.exports = router;
// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: controllers/authController.js
// Propósito: Controle de Autenticação Robusto, Federado e Seguro (Sênior)
// ============================================================

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// ============================================================
// FUNÇÕES AUXILIARES DE TOKEN (SÊNIOR: Segredos Isolados)
// ============================================================

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (userId) => {
  // Sênior: Uso obrigatório de chaves separadas para mitigar escalada de privilégios se o access token vazar
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ============================================================
// FUNÇÕES AUXILIARES DE USERNAME E HIGIENIZAÇÃO
// ============================================================

const sanitizeUsername = (value) => {
  if (!value) return 'bolhauser';
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos nativamente
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 15)
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'bolhauser';
};

const generateUniqueUsername = async (email, profileName) => {
  const baseUsername = sanitizeUsername(profileName || email.split('@')[0]);
  let candidate = baseUsername;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const exists = await User.findOne({ username: candidate }).lean();
    if (!exists) return candidate;
    
    attempts++;
    candidate = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`;
  }
  
  return `${baseUsername}_${Date.now().toString().slice(-4)}`;
};

const setTokenCookie = (res, token, isRefresh = false) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie(isRefresh ? 'refreshToken' : 'token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000,
    path: '/'
  });
};

// ============================================================
// 1. REGISTRO
// ============================================================
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedUsername = username.trim().toLowerCase();

    // Consulta atômica otimizada
    const userExists = await User.findOne({ 
      $or: [{ email: sanitizedEmail }, { username: sanitizedUsername }] 
    }).lean();
    
    if (userExists) {
      const field = userExists.email === sanitizedEmail ? 'E-mail' : 'Nome de usuário';
      return res.status(400).json({ message: `${field} já está em uso.` });
    }

    const newUser = await User.create({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password,
      authProvider: 'local'
    });

    const accessToken = generateToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);
    
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);

    return res.status(201).json({
      success: true,
      message: '🎉 Conta criada com sucesso!',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 2. LOGIN
// ============================================================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    if (user.authProvider === 'google') {
      return res.status(401).json({ 
        message: '⚠️ Esta conta foi cadastrada via Google. Use o botão "Entrar com Google".' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);

    return res.status(200).json({
      success: true,
      message: '🔓 Login realizado com sucesso!',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 3. REFRESH TOKEN
// ============================================================
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    }

    // Sênior: Decodifica usando a chave isolada de refresh tokens
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token inválido.' });
    }

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    const newAccessToken = generateToken(user._id);
    setTokenCookie(res, newAccessToken, false);

    return res.status(200).json({ success: true, message: 'Sessão renovada com sucesso.' });
  } catch (error) {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ message: 'Autenticação inválida.' });
  }
};

// ============================================================
// 4. LOGOUT
// ============================================================
exports.logout = async (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  return res.status(200).json({ success: true, message: 'Logout realizado com sucesso.' });
};

// ============================================================
// 5. GOOGLE AUTH - REDIRECIONAMENTO
// ============================================================
exports.googleAuth = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    logger.error('Configuracao de ambiente do Google OAuth ausente ou corrompida.');
    return res.status(500).json({ message: 'Erro de configuração interna do servidor.' });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// ============================================================
// 6. GOOGLE CALLBACK
// ============================================================
exports.googleCallback = async (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      logger.error('Falha na comunicacao com o Token Gateway do Google');
      return res.redirect(`${frontendUrl}/login?error=google_gateway_error`);
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    
    if (!idToken) {
      return res.redirect(`${frontendUrl}/login?error=invalid_id_token`);
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    
    if (!tokenInfoResponse.ok) {
      return res.redirect(`${frontendUrl}/login?error=google_token_invalid`);
    }

    const googleProfile = await tokenInfoResponse.json();

    if (googleProfile.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.redirect(`${frontendUrl}/login?error=unauthorized_client_app`);
    }

    if (googleProfile.email_verified !== 'true' && googleProfile.email_verified !== true) {
      return res.redirect(`${frontendUrl}/login?error=email_not_verified`);
    }

    const email = googleProfile.email.toLowerCase();
    const googleId = googleProfile.sub;
    const profileName = googleProfile.given_name || googleProfile.name || email.split('@')[0];

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const username = await generateUniqueUsername(email, profileName);
      
      // Sênior: Contas Google não salvam nenhuma string de password. Campo nulo por segurança!
      user = await User.create({
        username,
        email,
        googleId,
        authProvider: 'google'
      });
    } else if (!user.googleId) {
      // Se o usuário existia localmente, vincula o id do Google e desativa senha local
      user.googleId = googleId;
      user.authProvider = 'google';
      user.password = undefined; // Sênior: Força a remoção de senhas para migrar para login federado estrito
      await user.save();
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);

    return res.redirect(`${frontendUrl}/auth/google/success`);
    
  } catch (error) {
    logger.error('Erro critico no fluxo do Google Callback:', { error: error.message });
    return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};
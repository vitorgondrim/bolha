// ============================================================
// CONTROLLER: AUTENTICAÇÃO
// Gerencia todo o fluxo de autenticação do sistema:
//   - Registro local (email/senha)
//   - Login local
//   - Login com Google OAuth 2.0
//   - Refresh token (renovação silenciosa de sessão)
//   - Logout (limpeza de cookies)
// ============================================================

const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ============================================================
// FUNÇÕES AUXILIARES DE TOKEN
// ============================================================

/**
 * Gera um Access Token JWT.
 * Curta duração (15 minutos) por segurança.
 * Se roubado, o estrago é limitado no tempo.
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Gera um Refresh Token JWT.
 * Longa duração (7 dias) para manter o usuário logado.
 * Armazenado em cookie httpOnly (inacessível via JavaScript).
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Gera uma senha aleatória para usuários Google.
 * Eles não fazem login com senha, mas o campo existe no schema.
 * 16 bytes = 32 caracteres hexadecimais.
 */
const generateRandomPassword = () => {
  return crypto.randomBytes(16).toString('hex');
};

// ============================================================
// FUNÇÕES AUXILIARES DE USERNAME
// ============================================================

/**
 * Sanitiza uma string para formato de username válido:
 * - Converte para minúsculas
 * - Remove caracteres especiais (apenas letras, números e _)
 * - Limita a 18 caracteres (margem para sufixo numérico)
 * - Remove underlines consecutivos e das bordas
 * - Fallback 'bolhauser' se ficar vazio
 */
const sanitizeUsername = (value) => {
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 18)
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'bolhauser';
};

/**
 * Gera um username único baseado no email ou nome do perfil Google.
 * Se já existir, adiciona sufixo numérico (ex: joao, joao1, joao2...).
 * Máximo 100 tentativas antes de usar timestamp.
 */
const generateUniqueUsername = async (email, profileName) => {
  let baseUsername = sanitizeUsername(profileName || email.split('@')[0]);
  let candidate = baseUsername;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (await User.findOne({ username: candidate }) && attempts < maxAttempts) {
    attempts++;
    candidate = `${baseUsername}${attempts}`;
  }
  
  if (attempts >= maxAttempts) {
    candidate = `${baseUsername}${Date.now()}`;
  }
  
  return candidate;
};

// ============================================================
// FUNÇÃO AUXILIAR: SETAR COOKIE SEGURO
// ============================================================

/**
 * Configura um cookie httpOnly com o token JWT.
 * 
 * httpOnly: true  → Inacessível via JavaScript (protege contra XSS)
 * secure: true    → Só enviado em HTTPS (produção)
 * sameSite: 'lax' → Proteção contra CSRF, mas permite links externos
 * path: '/'       → Disponível em todas as rotas
 * maxAge:         → Tempo de vida do cookie (15min ou 7 dias)
 */
const setTokenCookie = (res, token, isRefresh = false) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000,
    path: '/'
  };
  
  res.cookie(isRefresh ? 'refreshToken' : 'token', token, cookieOptions);
};

// ============================================================
// 1. REGISTRO
// ============================================================
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validações manuais (reforço ao validateRegister middleware)
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    // Verifica se email ou username já existem (unique no MongoDB também garante)
    const userExists = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
    });
    
    if (userExists) {
      const field = userExists.email === email.toLowerCase() ? 'E-mail' : 'Username';
      return res.status(400).json({ message: `${field} já está em uso.` });
    }

    // Cria o usuário (a senha será hasheada pelo middleware 'pre save')
    const newUser = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      authProvider: 'local'
    });

    // Gera tokens e seta cookies
    const accessToken = generateToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);
    
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);

    res.status(201).json({
      message: '🎉 Conta criada com sucesso!',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno ao registrar usuário.' });
  }
};

// ============================================================
// 2. LOGIN
// ============================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ message: '❌ Usuário não encontrado.' });
    }

    // Se o usuário foi criado com Google, não pode fazer login local
    if (user.authProvider === 'google') {
      return res.status(401).json({ 
        message: '⚠️ Esta conta foi criada com o Google. Use "Entrar com Google".' 
      });
    }

    // Compara a senha com o hash armazenado
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '❌ Senha incorreta.' });
    }

    // Gera tokens e seta cookies
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);

    res.status(200).json({
      message: '🔓 Login realizado com sucesso!',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno ao fazer login.' });
  }
};

// ============================================================
// 3. REFRESH TOKEN
// Chamado silenciosamente pelo frontend quando o access token
// expira. O refresh token (7 dias) gera um novo access token.
// ============================================================
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token não encontrado.' });
    }

    // Verifica se o token é válido e do tipo 'refresh'
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token inválido.' });
    }

    // Verifica se o usuário ainda existe
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    // Gera novo access token (refresh token permanece o mesmo)
    const newAccessToken = generateToken(user._id);
    setTokenCookie(res, newAccessToken, false);

    res.json({ message: 'Token renovado com sucesso.' });
  } catch (error) {
    console.error('Erro no refresh token:', error);
    
    // Se o refresh token expirou, limpa o cookie
    if (error.name === 'TokenExpiredError') {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    }
    
    res.status(401).json({ message: 'Refresh token inválido.' });
  }
};

// ============================================================
// 4. LOGOUT
// Simplesmente limpa os cookies de token.
// O frontend também remove o estado local.
// ============================================================
exports.logout = async (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout realizado com sucesso.' });
};

// ============================================================
// 5. GOOGLE AUTH - INICIAR FLUXO
// Redireciona o usuário para a tela de login do Google.
// O Google retorna um código de autorização para o callback.
// ============================================================
exports.googleAuth = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    console.error('Configuração do Google OAuth incompleta');
    return res.status(500).json({ 
      message: 'Configuração do Google OAuth inválida.' 
    });
  }

  // Construção manual da URL de autorização do Google
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',        // Fluxo Authorization Code (mais seguro)
    scope: 'openid email profile', // Dados que solicitamos
    access_type: 'offline',        // Permite refresh token do Google
    prompt: 'select_account',      // Sempre mostra seletor de conta
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(googleAuthUrl);
};

// ============================================================
// 6. GOOGLE CALLBACK
// O Google redireciona para cá com um código de autorização.
// Fluxo:
//   1. Troca o código por tokens (access + id_token)
//   2. Valida o id_token com o Google
//   3. Cria ou encontra o usuário no banco
//   4. Gera tokens JWT e redireciona para o frontend
// ============================================================
exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: 'Código do Google OAuth não encontrado.' });
    }

    // Troca o código de autorização por tokens
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
      const errorText = await tokenResponse.text();
      console.error('❌ Falha ao trocar código:', errorText);
      return res.status(500).json({ message: 'Falha ao autenticar com Google.' });
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    
    if (!idToken) {
      return res.status(500).json({ message: 'Token de ID do Google não encontrado.' });
    }

    // Valida o id_token diretamente com o Google
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    const googleProfile = await tokenInfoResponse.json();

    if (googleProfile.error_description) {
      return res.status(401).json({ message: 'Token do Google inválido.' });
    }

    // Verifica se o token foi emitido para nosso aplicativo
    if (googleProfile.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: 'Token não emitido para este aplicativo.' });
    }

    // Verifica se o e-mail foi verificado pelo Google
    if (googleProfile.email_verified !== 'true' && googleProfile.email_verified !== true) {
      return res.status(401).json({ message: 'Seu e-mail do Google não está verificado.' });
    }

    const email = googleProfile.email.toLowerCase();
    const googleId = googleProfile.sub;
    const profileName = googleProfile.given_name || googleProfile.name || email.split('@')[0];

    // Procura usuário por googleId OU email (para vincular contas)
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // Novo usuário: cria conta com username único
      const username = await generateUniqueUsername(email, profileName);
      user = await User.create({
        username,
        email,
        password: generateRandomPassword(),
        googleId,
        authProvider: 'google'
      });
    } 
    else if (!user.googleId) {
      // Usuário existente (local): vincula conta Google
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save();
    }

    // Gera tokens JWT e seta cookies
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);

    // Redireciona para o frontend (rota de sucesso)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/google/success`);
    
  } catch (error) {
    console.error('❌ Erro no callback Google:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};
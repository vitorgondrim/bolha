// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: server.js
// Propósito: Ponto de entrada da aplicação.
//   - Inicializa o Express, Socket.IO, MongoDB e middlewares globais.
//   - Monta as rotas da API e inicia o sistema de monitoramento.
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// ✅ CARREGAR .env ANTES DE QUALQUER OUTRA COISA
require('dotenv').config();

// Jobs (tarefas agendadas)
const { startExpiryWatcher } = require('./jobs/checkExpiringBubbles');

// Rotas
const authRoutes = require('./routes/authRoutes');
const bubbleRoutes = require('./routes/bubbleRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// ============================================================
// INICIALIZAÇÃO DO EXPRESS E SERVIDOR HTTP
// ============================================================
const app = express();
const server = http.createServer(app);

// ============================================================
// SEGURANÇA: HELMET
// Define headers HTTP seguros para prevenir ataques comuns.
// - crossOriginResourcePolicy: permite carregar recursos de outros domínios (útil para uploads)
// - contentSecurityPolicy: desabilitado para não bloquear inline styles do React
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// ============================================================
// COOKIE PARSER
// Habilita leitura de cookies nas requisições.
// Essencial para autenticação JWT via cookies httpOnly.
// ============================================================
app.use(cookieParser());

// ============================================================
// CORS (Cross-Origin Resource Sharing)
// Permite requisições apenas das origens autorizadas.
// Em produção, apenas o domínio do frontend é permitido.
// ============================================================
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: Postman, apps mobile)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS bloqueou origem: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true, // Permite envio de cookies
  exposedHeaders: ['set-cookie'] // Expõe headers de cookie para o frontend
}));

// ============================================================
// SOCKET.IO
// Servidor de comunicação em tempo real.
// Usa a mesma política de CORS do Express.
// ============================================================
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS bloqueado (Socket)'));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true
  }
});

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================

// Parser de JSON e URL-encoded (limite de 10MB para uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting global - previne abuso e DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Máximo de 200 requisições por IP
  message: { message: 'Muitas requisições. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Middleware que injeta o objeto 'io' do Socket.IO em todas as requisições.
// Isso permite que qualquer controller emita eventos em tempo real.
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Servir arquivos estáticos da pasta 'uploads' (avatares, capas, imagens)
app.use('/uploads', express.static('uploads'));

// ============================================================
// ROTAS DA API
// ============================================================
app.use('/api/auth', authRoutes);           // Autenticação (registro, login, Google OAuth)
app.use('/api/bubbles', bubbleRoutes);      // Bolhas (CRUD, likes, sopros, comentários)
app.use('/api/users', userRoutes);          // Usuários (perfil, follow/unfollow)
app.use('/api/notifications', notificationRoutes); // Notificações
app.use('/api/upload', uploadRoutes);       // Upload de arquivos (avatar, capa)

// Rota de health check - útil para monitoramento
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================
// MIDDLEWARE DE ERRO GLOBAL (compatível Express 5)
// Captura qualquer erro não tratado nos controllers.
// Express 5 usa `err.statusCode` ao invés de `err.status`.
// Em produção, esconde detalhes do erro do cliente.
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err.stack || err.message || err);
  
  // Erro específico do Multer (arquivo muito grande)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Arquivo muito grande. Máximo 5MB.' });
  }
  
  // Erro de validação do Multer (formato não suportado)
  if (err.message && err.message.includes('Formato não suportado')) {
    return res.status(400).json({ message: err.message });
  }
  
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : (err.message || 'Erro interno do servidor')
  });
});

// ============================================================
// SOCKET.IO - GERENCIAMENTO DE CONEXÕES
// ============================================================
io.on('connection', (socket) => {
  console.log(`⚡ Usuário conectado: ${socket.id}`);
  
  // Entrar na sala de uma bolha específica (para receber updates em tempo real)
  socket.on('join_bubble', (bubbleId) => {
    socket.join(bubbleId);
    console.log(`📌 Socket ${socket.id} entrou na sala da bolha: ${bubbleId}`);
  });
  
  // Entrar na sala pessoal do usuário (para receber notificações)
  socket.on('join_user_canvas', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 Socket ${socket.id} entrou na sala do usuário: ${userId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Desconectado: ${socket.id}`);
  });
});

// ============================================================
// CONEXÃO COM MONGODB E INICIALIZAÇÃO DO SERVIDOR
// ============================================================
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🟢 MongoDB Atlas conectado com sucesso!');
    
    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
    
    // Iniciar sistema de monitoramento de bolhas (10min warning, estouro, lembrete diário)
    const watchers = startExpiryWatcher(io);
    console.log('⏰ Monitoramento de bolhas iniciado!');
    
    // Graceful shutdown - fecha conexões antes de encerrar
    const shutdown = () => {
      console.log('⚠️ Encerrando servidor...');
      clearInterval(watchers.interval);
      clearInterval(watchers.reminderInterval);
      server.close(() => {
        console.log('✅ Servidor encerrado com segurança');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('❌ Erro crítico ao conectar no MongoDB:', err.message);
    process.exit(1);
  });

// Captura rejeições de Promise não tratadas (evita crash silencioso)
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Rejeição não tratada:', reason);
});
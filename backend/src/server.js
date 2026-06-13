// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: server.js
// Propósito: Ponto de entrada, orquestração e segurança da aplicação (Sênior)
// ============================================================

const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');

// Força o DNS do Google para resolver SRV do MongoDB Atlas (DNS do Windows falha)
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Força o carregamento do arquivo .env que está na raiz (um nível acima de src)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const logger = require('./utils/logger');
const { httpLoggerMiddleware } = require('./utils/logger');

logger.info('Variaveis de ambiente carregadas com sucesso.');

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

// Importação do Middleware de Erro Centralizado (Sênior)
const errorHandler = require('./middlewares/errorMiddleware');

// Jobs e Monitoramento do Ciclo de Vida das Bolhas
const { startVitalityWatcher } = require('./jobs/checkVitality');
const cron = require('node-cron');
const { cleanupOrphanFiles } = require('./jobs/cleanupOrphanUploads');

// Importação de Rotas do Ecossistema
const authRoutes = require('./routes/authRoutes');
const bubbleRoutes = require('./routes/bubbleRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Inicialização do Express e do Servidor HTTP acoplado
const app = express();
const server = http.createServer(app);

// ============================================================
// CONFIGURAÇÃO CENTRALIZADA DE CORS (Blindagem de Origem)
// ============================================================
const allowedOrigins = new Set([
  process.env.FRONTEND_URL, // URL de produção (Ex: Vercel, Netlify)
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://bolha-frontend.vercel.app',
  'https://bolha-frontend.vercel.app/'
]);

const corsOptions = {
  origin: function (origin, callback) {
    // Sênior: Permite requisições sem origem apenas fora de produção (ex: Postman em desenvolvimento)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Acesso direto não permitido em ambiente de produção (CORS)'));
      }
      return callback(null, true);
    }
    
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    
    logger.warn(`CORS bloqueou origem nao autorizada: ${origin}`);
    return callback(new Error('Origem bloqueada pelas diretrizes de segurança do CORS'));
  },
  credentials: true,
  exposedHeaders: ['set-cookie']
};

// ============================================================
// MIDDLEWARES GLOBAIS DE SEGURANÇA E PARSING
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https://i.imgur.com", "https://media.giphy.com", "https://*.giphy.com"],
      mediaSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    }
  },
}));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging HTTP — registra cada requisição com status, duração e metadados
app.use(httpLoggerMiddleware);

// Rate Limiting Global: Proteção contra ataques de negação de serviço (DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 200, // Limite de requisições por IP
  message: { success: false, message: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ============================================================
// INICIALIZAÇÃO DO SOCKET.IO (Real-Time Gateway)
// ============================================================
const io = new Server(server, {
  cors: corsOptions, // Sênior: Compartilha estritamente os mesmos privilégios do CORS HTTP
  methods: ["GET", "POST", "PATCH", "DELETE"]
});

// Middleware Injetor: Disponibiliza a instância do Socket dentro de todos os controladores
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Entrega de Arquivos Estáticos Seguros (Pasta de uploads)
app.use('/uploads', express.static('uploads'));

// ============================================================
// DECLARAÇÃO DO PROTOCOLO DE ROTAS
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/bubbles', bubbleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Redirecionamentos estratégicos de compatibilidade para fluxos OAuth
app.get('/auth/google', (req, res) => res.redirect('/api/auth/google'));
app.get('/auth/google/callback', (req, res) => res.redirect('/api/auth/google/callback'));

// Health Check Endpoint (Vital para serviços com auto-healing em nuvem)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================
// WEBSOCKETS: ESCUTA E GERENCIAMENTO DE CANAIS REAL-TIME
// ============================================================
io.on('connection', (socket) => {
  logger.info(`Conexao WebSocket estabelecida: ${socket.id}`);
  
  // Conecta o usuário à sala isolada da bolha em que ele está navegando
  socket.on('join_bubble', (bubbleId) => {
    socket.join(bubbleId);
    logger.debug(`Canal de escuta ativado para Bolha ID: ${bubbleId}`);
  });
  
  // Remove o usuário da sala da bolha quando navega para outra página
  socket.on('leave_bubble', (bubbleId) => {
    socket.leave(bubbleId);
    logger.debug(`Canal de escuta removido para Bolha ID: ${bubbleId}`);
  });
  
  // Conecta o usuário à sua sala pessoal privada para receber notificações em tempo real
  socket.on('join_user_canvas', (userId) => {
    socket.join(`user_${userId}`);
    logger.debug(`Canal de notificacoes ativado para Usuario ID: ${userId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Conexao WebSocket encerrada: ${socket.id}`);
  });
});

// ============================================================
// MIDDLEWARE DE ERROS CENTRALIZADO (Padrão Sênior)
// Deve ser declarado estritamente DEPOIS de todas as rotas
// ============================================================
app.use(errorHandler);

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR E ORQUESTRAÇÃO DE BANCO
// ============================================================
const PORT = process.env.PORT || 5000;
let expiryWatchers;

logger.info('Iniciando conexoes com servicos de infraestrutura...');

// Sênior: Conecta ao MongoDB Atlas primeiro. O servidor HTTP só abre as portas
// para o público externo depois que a conexão com o banco de dados estiver validada.
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('[INFRA] MongoDB Atlas conectado com sucesso!');
    
    // Dispara o loop assíncrono do background worker de vitalidade (Mente Coletiva)
    expiryWatchers = startVitalityWatcher(io);
    logger.info('[WORKER] Monitor de vitalidade (Mente Coletiva) iniciado!');

    // Cron: Limpeza diária de arquivos órfãos (todo dia às 3h da manhã)
    cron.schedule('0 3 * * *', async () => {
      logger.info('[CRON] Iniciando limpeza de uploads orfaos...');
      await cleanupOrphanFiles();
    });
    logger.info('[CRON] Agendador de limpeza de uploads configurado (diario, 03:00).');

    // Sabe do banco? Agora sim abrimos o servidor para escutar tráfego da rede
    server.listen(PORT, () => {
      logger.info(`[SERVER] Bolha online na porta ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`[FATAL] Erro ao conectar no MongoDB: ${err.message}`);
    process.exit(1); // Encerra o processo imediatamente com código de falha
  });

// ============================================================
// SISTEMA DE RESILIÊNCIA E GRACEFUL SHUTDOWN (Desligamento Limpo)
// ============================================================

// Captura exceções assíncronas que falharam fora das rotas comuns (Previne quebras silenciosas)
process.on('unhandledRejection', (reason) => {
  logger.error('Rejeicao assincrona nao tratada capturada na raiz:', { reason: String(reason) });
});

const handleGracefulShutdown = (signal) => {
  logger.info(`Sinal de encerramento [${signal}] recebido. Desligando com seguranca...`);
  
  // Limpa os processos cíclicos em background do monitor para liberar memória
  if (expiryWatchers) {
    if (expiryWatchers.interval) clearInterval(expiryWatchers.interval);
    if (expiryWatchers.reminderInterval) clearInterval(expiryWatchers.reminderInterval);
  }

  // Fecha as portas do servidor HTTP para novas conexões recebidas
  server.close(async () => {
    logger.info('[SERVER] Servidor HTTP encerrado.');
    try {
      await mongoose.connection.close();
      logger.info('[INFRA] Conexao com MongoDB encerrada de forma limpa.');
      process.exit(0);
    } catch (err) {
      logger.error('Falha ao encerrar conexao com MongoDB durante o shutdown:', { error: err.message });
      process.exit(1);
    }
  });
};

// Vincula os escutadores de encerramento do sistema operacional
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
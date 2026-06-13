# ============================================================
# INSTRUÇÕES DE DEPLOY NO RENDER
# ============================================================

## 1. Preparar o projeto

### Criar repositório no GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/usuario/bolha.git
git push -u origin main
```

## 2. Deploy no Render

### Criar conta
- Acesse [render.com](https://render.com)
- Faça login com GitHub

### Criar novo serviço Web
1. Clique em "New" → "Web Service"
2. Conecte seu repositório GitHub
3. Selecione o repositório `bolha`

### Configurar o serviço
- **Name:** `bolha-backend`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free

### Configurar variáveis de ambiente
No painel do serviço, vá em "Environment" e adicione:

```
NODE_ENV=production
PORT=5000
MONGO_URI=sua_connection_string_mongodb_atlas
JWT_SECRET=sua_chave_secreta_jwt
JWT_REFRESH_SECRET=sua_chave_secreta_refresh_token
FRONTEND_URL=https://bolha-frontend.vercel.app
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_CALLBACK_URL=https://bolha-backend.onrender.com/api/auth/google/callback
LEAK_SCORE_THRESHOLD=12
```

### Deploy automático
- O Render detectará o `render.yaml` e configurará automaticamente
- O health check estará disponível em `https://bolha-backend.onrender.com/health`

## 3. Configurações importantes

### Health Check
O endpoint `/health` já está configurado no `server.js`:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### CORS
O CORS já está configurado para aceitar a URL do frontend:

```javascript
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://bolha-frontend.vercel.app',
  'https://bolha-frontend.vercel.app/'
]);
```

### WebSocket
O Socket.IO está configurado para usar o protocolo WebSocket:

```javascript
const io = new Server(server, {
  cors: corsOptions,
  methods: ["GET", "POST", "PATCH", "DELETE"]
});
```

## 4. Verificar deploy

### Testar a aplicação
1. Acesse a URL do Render (ex: `https://bolha-backend.onrender.com`)
2. Verifique o health check: `https://bolha-backend.onrender.com/health`
3. Teste os endpoints da API

### Verificar conexão com MongoDB
1. Acesse o painel do Render
2. Verifique os logs
3. Procure pela mensagem: `[INFRA] MongoDB Atlas conectado com sucesso!`

## 5. Troubleshooting

### Erro de CORS
- Verifique se `FRONTEND_URL` está correto no Render
- Verifique se a URL do frontend está correta no Vercel

### Erro de WebSocket
- Verifique se o backend está usando HTTPS
- Verifique se o frontend está usando a URL correta do backend

### Erro de autenticação
- Verifique se os JWT_SECRET são iguais no Render
- Verifique se os cookies estão sendo enviados corretamente

### Erro de MongoDB
- Verifique se o `MONGO_URI` está correto
- Verifique se o cluster do MongoDB Atlas está ativo
- Verifique se o IP do Render está na lista de IPs permitidos

## 6. Variáveis de ambiente

### Render
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://bolha-frontend.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://bolha-backend.onrender.com/api/auth/google/callback
LEAK_SCORE_THRESHOLD=12
```

## 7. URLs de Produção

- **Backend:** `https://bolha-backend.onrender.com`
- **Health Check:** `https://bolha-backend.onrender.com/health`
- **API:** `https://bolha-backend.onrender.com/api`
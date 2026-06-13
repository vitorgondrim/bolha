# ============================================================
# BOLHA - GUIA DE DEPLOY
# ============================================================

## 🚀 Backend (Render)

### 1. Criar conta no Render
- Acesse [render.com](https://render.com)
- Faça login com GitHub

### 2. Criar novo serviço Web
- Clique em "New" → "Web Service"
- Conecte seu repositório GitHub
- Selecione o repositório `bolha`

### 3. Configurar o serviço
- **Name:** `bolha-backend`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free

### 4. Configurar variáveis de ambiente
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

### 5. Deploy automático
- O Render detectará o `render.yaml` e configurará automaticamente
- O health check estará disponível em `https://bolha-backend.onrender.com/health`

---

## 🌐 Frontend (Vercel)

### 1. Criar conta no Vercel
- Acesse [vercel.com](https://vercel.com)
- Faça login com GitHub

### 2. Importar projeto
- Clique em "New Project"
- Selecione o repositório `bolha`
- Selecione a pasta `frontend` como raiz

### 3. Configurar variáveis de ambiente
No painel do projeto, vá em "Settings" → "Environment Variables" e adicione:

```
VITE_API_BASE_URL=https://bolha-backend.onrender.com/api
```

### 4. Configurações de build
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 5. Deploy
- Clique em "Deploy"
- O Vercel detectará o `vercel.json` automaticamente

---

## 🔧 Configurações Importantes

### CORS (Backend)
O CORS já está configurado para aceitar a URL do frontend:
- `FRONTEND_URL=https://bolha-backend.onrender.com/api`

### Cookies HttpOnly
O frontend já está configurado para enviar cookies automaticamente:
- `withCredentials: true` no Axios

### WebSocket
O Socket.IO está configurado para usar o protocolo WebSocket:
- `ws://` para desenvolvimento
- `wss://` para produção (automático)

---

## 📋 Checklist de Deploy

### Backend (Render)
- [ ] Criar serviço Web no Render
- [ ] Configurar variáveis de ambiente
- [ ] Verificar health check
- [ ] Testar endpoints da API
- [ ] Verificar conexão com MongoDB

### Frontend (Vercel)
- [ ] Importar projeto no Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Verificar build
- [ ] Testar rotas
- [ ] Verificar conexão com backend

---

## 🐛 Troubleshooting

### Erro de CORS
- Verifique se `FRONTEND_URL` está correto no Render
- Verifique se a URL do frontend está correta no Vercel

### Erro de WebSocket
- Verifique se o backend está usando HTTPS
- Verifique se o frontend está usando a URL correta do backend

### Erro de autenticação
- Verifique se os JWT_SECRET são iguais no Render
- Verifique se os cookies estão sendo enviados corretamente

---

## 📊 URLs de Produção

- **Backend:** `https://bolha-backend.onrender.com`
- **Frontend:** `https://bolha-frontend.vercel.app`
- **Health Check:** `https://bolha-backend.onrender.com/health`
- **API:** `https://bolha-backend.onrender.com/api`
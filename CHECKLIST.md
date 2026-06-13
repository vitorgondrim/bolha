# ============================================================
# 📋 CHECKLIST DE DEPLOY - BOLHA
# ============================================================

## 🚀 Backend (Render)

### Configuração Inicial
- [ ] Criar conta no Render
- [ ] Conectar repositório GitHub
- [ ] Criar serviço Web
- [ ] Configurar nome: `bolha-backend`
- [ ] Configurar runtime: Node
- [ ] Configurar build command: `npm install`
- [ ] Configurar start command: `npm start`
- [ ] Configurar plan: Free

### Variáveis de Ambiente
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `MONGO_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=...`
- [ ] `JWT_REFRESH_SECRET=...`
- [ ] `FRONTEND_URL=https://bolha-frontend.vercel.app`
- [ ] `GOOGLE_CLIENT_ID=...`
- [ ] `GOOGLE_CLIENT_SECRET=...`
- [ ] `GOOGLE_CALLBACK_URL=https://bolha-backend.onrender.com/api/auth/google/callback`
- [ ] `LEAK_SCORE_THRESHOLD=12`

### Verificação
- [ ] Health check funcionando: `https://bolha-backend.onrender.com/health`
- [ ] Conexão com MongoDB OK
- [ ] Logs sem erros
- [ ] CORS configurado corretamente

---

## 🌐 Frontend (Vercel)

### Configuração Inicial
- [ ] Criar conta no Vercel
- [ ] Importar repositório
- [ ] Configurar Framework Preset: Vite
- [ ] Configurar Root Directory: `frontend`
- [ ] Configurar Build Command: `npm run build`
- [ ] Configurar Output Directory: `dist`

### Variáveis de Ambiente
- [ ] `VITE_API_BASE_URL=https://bolha-backend.onrender.com/api`

### Verificação
- [ ] Build OK
- [ ] Deploy OK
- [ ] Rotas SPA funcionando
- [ ] Conexão com backend OK

---

## 🔧 Configurações Adicionais

### Google OAuth
- [ ] Configurar URLs no Google Cloud Console
- [ ] Adicionar URL de produção no `Authorized redirect URIs`:
  - `https://bolha-backend.onrender.com/api/auth/google/callback`
- [ ] Adicionar URL de produção no `Authorized JavaScript origins`:
  - `https://bolha-frontend.vercel.app`

### MongoDB Atlas
- [ ] Verificar se o cluster está ativo
- [ ] Verificar se o IP do Render está na lista de IPs permitidos
  - No painel do MongoDB Atlas → Network Access → Add IP
  - Adicionar `0.0.0.0/0` (permite qualquer IP) ou o IP específico do Render

### DNS (Opcional)
- [ ] Configurar domínio personalizado no Vercel
- [ ] Configurar domínio personalizado no Render
- [ ] Atualizar `FRONTEND_URL` no Render com o domínio personalizado

---

## 🐛 Troubleshooting

### Erro de CORS
- [ ] Verificar se `FRONTEND_URL` está correto no Render
- [ ] Verificar se a URL do frontend está correta no Vercel
- [ ] Verificar se o CORS está configurado no `server.js`

### Erro de WebSocket
- [ ] Verificar se o backend está usando HTTPS
- [ ] Verificar se o frontend está usando a URL correta do backend
- [ ] Verificar se o Socket.IO está configurado corretamente

### Erro de Autenticação
- [ ] Verificar se os `JWT_SECRET` são iguais no Render
- [ ] Verificar se os cookies estão sendo enviados corretamente
- [ ] Verificar se o Google OAuth está configurado corretamente

### Erro de MongoDB
- [ ] Verificar se o `MONGO_URI` está correto
- [ ] Verificar se o cluster do MongoDB Atlas está ativo
- [ ] Verificar se o IP do Render está na lista de IPs permitidos

---

## 📊 URLs de Produção

### Backend
- **URL:** `https://bolha-backend.onrender.com`
- **Health Check:** `https://bolha-backend.onrender.com/health`
- **API:** `https://bolha-backend.onrender.com/api`

### Frontend
- **URL:** `https://bolha-frontend.vercel.app`

---

## ✅ Pós-Deploy

### Testes
- [ ] Testar login
- [ ] Testar registro
- [ ] Testar criação de bolha
- [ ] Testar curtir/dislike
- [ ] Testar sopro
- [ ] Testar notificações
- [ ] Testar WebSocket
- [ ] Testar Google OAuth

### Monitoramento
- [ ] Verificar logs no Render
- [ ] Verificar métricas no Vercel
- [ ] Monitorar uso do MongoDB Atlas

---

## 📝 Notas

### Render Free Tier
- O serviço dorme após 15 minutos de inatividade
- Primeira requisição após dormir pode levar até 30 segundos
- Considere upgrade para plano pago se necessário

### Vercel Free Tier
- Limite de 100GB de bandwidth por mês
- Limite de 1000 build minutes por mês
- Considere upgrade para plano pago se necessário

### MongoDB Atlas Free Tier
- Limite de 512MB de armazenamento
- Limite de 100 conexões simultâneas
- Considere upgrade para plano pago se necessário
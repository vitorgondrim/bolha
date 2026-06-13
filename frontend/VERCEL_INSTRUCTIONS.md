# ============================================================
# INSTRUÇÕES DE DEPLOY NO VERCEL
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

## 2. Deploy no Vercel

### Criar conta
- Acesse [vercel.com](https://vercel.com)
- Faça login com GitHub

### Importar projeto
1. Clique em "New Project"
2. Selecione o repositório `bolha`
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Configurar variáveis de ambiente
No painel do projeto, vá em "Settings" → "Environment Variables" e adicione:

```
VITE_API_BASE_URL=https://bolha-backend.onrender.com/api
```

### Deploy
- Clique em "Deploy"
- O Vercel detectará o `vercel.json` automaticamente

## 3. Configurações importantes

### Rotas SPA
O `vercel.json` já está configurado para redirecionar todas as rotas para `index.html`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Headers de segurança
O `vercel.json` também configura headers de segurança:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

## 4. Verificar deploy

### Testar a aplicação
1. Acesse a URL do Vercel (ex: `https://bolha-frontend.vercel.app`)
2. Faça login
3. Teste as funcionalidades principais

### Verificar conexão com backend
1. Abra o console do navegador (F12)
2. Verifique se não há erros de CORS
3. Verifique se as requisições estão sendo feitas para o backend correto

## 5. Troubleshooting

### Erro de CORS
- Verifique se `VITE_API_BASE_URL` está correto no Vercel
- Verifique se o backend está rodando no Render

### Erro de WebSocket
- Verifique se o backend está usando HTTPS
- Verifique se o frontend está usando a URL correta do backend

### Erro de build
- Verifique se todas as dependências estão instaladas
- Verifique se não há erros de sintaxe no código

## 6. Variáveis de ambiente

### Vercel
```
VITE_API_BASE_URL=https://bolha-backend.onrender.com/api
```

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
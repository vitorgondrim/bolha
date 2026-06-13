# ============================================================
# 🫧 BOLHA - Rede Social Efêmera
# ============================================================

Uma rede social onde os pensamentos são bolhas que flutuam e estouram com o tempo.

## 🌟 Funcionalidades

- **Bolhas Efêmeras**: Pensamentos que duram 24h e estouram automaticamente
- **Mente Coletiva**: Sistema de oxigênio que mantém as bolhas vivas
- **Mapa Interativo**: Visualização 3D das bolhas em tempo real
- **Notificações Real-Time**: Via WebSocket
- **Autenticação Google OAuth 2.0**
- **Sistema de Seguidores**
- **Emblemas e Conquistas**

## 🏗️ Arquitetura

```
bolha/
├── backend/          # API RESTful + WebSockets (Node.js + Express)
├── frontend/         # Interface React (Vite + Tailwind CSS)
└── shared/           # Schemas compartilhados
```

## 🚀 Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 5
- **Database:** MongoDB Atlas (Mongoose)
- **Real-Time:** Socket.IO
- **Auth:** JWT + Google OAuth 2.0
- **Segurança:** Helmet, CORS, Rate Limiting

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Estilo:** Tailwind CSS 4
- **Animações:** Framer Motion
- **Roteamento:** React Router DOM
- **HTTP Client:** Axios
- **Real-Time:** Socket.IO Client

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- MongoDB Atlas (ou local)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente no .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Variáveis de Ambiente

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
LEAK_SCORE_THRESHOLD=12
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🚀 Deploy

### Backend (Render)
1. Crie uma conta no [Render](https://render.com)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Deploy automático

**Documentação:** [DEPLOY.md](DEPLOY.md)

### Frontend (Vercel)
1. Crie uma conta no [Vercel](https://vercel.com)
2. Importe o repositório
3. Configure a pasta `frontend` como raiz
4. Adicione a variável `VITE_API_BASE_URL`

**Documentação:** [frontend/VERCEL_INSTRUCTIONS.md](frontend/VERCEL_INSTRUCTIONS.md)

## 📁 Estrutura do Projeto

### Backend
```
backend/
├── src/
│   ├── controllers/    # Lógica de negócio
│   ├── middlewares/     # Validação, autenticação
│   ├── models/         # Schemas MongoDB
│   ├── routes/         # Rotas da API
│   ├── services/       # Serviços auxiliares
│   ├── utils/          # Utilitários
│   └── jobs/           # Tarefas agendadas
├── uploads/            # Arquivos enviados
└── package.json
```

### Frontend
```
frontend/
├── src/
│   ├── components/     # Componentes React
│   ├── contexts/       # Contextos globais
│   ├── hooks/          # Custom hooks
│   ├── layouts/        # Layouts de página
│   ├── pages/          # Páginas da aplicação
│   ├── services/       # Serviços API
│   └── utils/          # Utilitários
├── public/             # Arquivos estáticos
└── package.json
```

## 🔐 Segurança

- **CORS**: Configurado para aceitar apenas origens permitidas
- **Helmet**: Headers de segurança HTTP
- **Rate Limiting**: Proteção contra ataques DoS
- **JWT**: Tokens de acesso e refresh separados
- **Cookies HttpOnly**: Proteção contra XSS
- **Input Validation**: Validação de dados com Express Validator

## 📡 API

### Endpoints Principais

#### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Renovar token
- `GET /api/auth/google` - Login com Google

#### Bolhas
- `GET /api/bubbles` - Listar bolhas
- `POST /api/bubbles` - Criar bolha
- `GET /api/bubbles/:id` - Detalhes da bolha
- `POST /api/bubbles/:id/like` - Curtir
- `POST /api/bubbles/:id/dislike` - Dislike
- `POST /api/bubbles/:id/sopro` - Sopro

#### Usuários
- `GET /api/users/me` - Perfil do usuário
- `GET /api/users/:username` - Perfil público
- `POST /api/users/follow/:id` - Seguir/deixar de seguir

#### Notificações
- `GET /api/notifications` - Listar notificações
- `GET /api/notifications/count` - Contagem não lidas

## 🎨 Design System

### Paleta de Cores
- **Roxo Profundo:** `#7c3aed`
- **Azul Elétrico:** `#3b82f6`
- **Ciano Neon:** `#00f0ff`
- **Verde Neon:** `#39ff14`

### Gradientes
- **Primário:** `from-[#7c3aed] to-[#3b82f6]`
- **Neon:** `from-cyan-400 to-lime-400`

## 📄 Licença

MIT License

## 👨‍💻 Autor

**Vitor** - Desenvolvedor Full Stack
// ============================================================
// PONTO DE ENTRADA DO FRONTEND
// Arquivo: frontend/src/main.jsx
//
// Inicializa a aplicação React e monta a árvore de componentes.
//
// Ordem de envolvimento (provedores em cascata):
//   1. React.StrictMode     → Detecção de problemas em desenvolvimento
//   2. AuthProvider         → Estado global de autenticação
//   3. TimeProvider         → Relógio global (1 tick/segundo)
//   4. BrowserRouter        → Roteamento com URLs limpas
//   5. App                  → Rotas e páginas
//
// Cada provider encapsula o próximo, disponibilizando
// seus contextos para toda a árvore de componentes.
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { TimeProvider } from './context/TimeContext.jsx';

// ============================================================
// MONTAGEM DA APLICAÇÃO
// ============================================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 
      AuthProvider: deve ser o mais externo possível,
      pois quase todos os componentes dependem do estado
      de autenticação (usuário logado, socket, etc).
    */}
    <AuthProvider>
      {/* 
        TimeProvider: fornece um timestamp global atualizado
        a cada segundo. Usado pelo FloatingBubble e BubbleCard
        para calcular tempo restante de vida.
      */}
      <TimeProvider>
        {/* 
          BrowserRouter: habilita navegação SPA com URLs limpas.
          Ex: /feed, /profile, /bubble/:id
        */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TimeProvider>
    </AuthProvider>
  </React.StrictMode>
);
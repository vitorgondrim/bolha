// ============================================================
// PONTO DE ENTRADA DO FRONTEND
// Arquivo: frontend/src/main.jsx
//
// Inicializa a aplicação React e monta a árvore de componentes.
//
// Ordem de envolvimento (provedores em cascata):
//   1. React.StrictMode     → Detecção de problemas em desenvolvimento
//   2. AuthProvider         → Estado global de autenticação
//   3. SocketProvider       → WebSocket global
//   4. ToastProvider        → Notificações visuais
//   5. TimeProvider         → Relógio global (1 tick/segundo)
//   6. BrowserRouter        → Roteamento com URLs limpas
//   7. App                  → Rotas e páginas
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { TimeProvider } from './contexts/TimeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// ============================================================
// TANSTACK QUERY — CLIENTE GLOBAL
// Configuração padrão para toda a aplicação.
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s até dados serem "velhos"
      gcTime: 5 * 60_000,        // 5min no cache
      refetchOnWindowFocus: true, // Refetch ao voltar para aba
      retry: 2,                   // 2 tentativas antes de erro
    },
  },
});

// ============================================================
// MONTAGEM DA APLICAÇÃO
// ============================================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <TimeProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </TimeProvider>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// ============================================================
// SERVIÇO: API (AXIOS)
// Configuração centralizada do cliente HTTP.
//
// Responsabilidades:
//   - Definir a URL base da API
//   - Enviar cookies httpOnly automaticamente (withCredentials)
//   - Timeout de 30 segundos para todas as requisições
//   - Interceptor de refresh token automático
//   - Fila de requisições durante o refresh (evita múltiplos refreshes)
//
// Fluxo do interceptor:
//   1. Requisição falha com 401 (token expirado)
//   2. Tenta renovar o token via POST /auth/refresh-token
//   3. Se sucesso: reexecuta a requisição original
//   4. Se falha: redireciona para /login
//   5. Requisições simultâneas: entram em fila e são resolvidas juntas
// ============================================================

import axios from 'axios';

// ============================================================
// CONFIGURAÇÃO DA API
// ============================================================

// URL base (lê do .env ou usa fallback local)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos (evita requisições penduradas)
  withCredentials: true, // Envia cookies httpOnly automaticamente
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// INTERCEPTOR: REFRESH TOKEN AUTOMÁTICO
// ============================================================

// Estado do refresh (evita múltiplos refreshes simultâneos)
let isRefreshing = false;

// Fila de requisições que falharam enquanto o refresh está em andamento
let failedQueue = [];

/**
 * Processa a fila de requisições pendentes.
 * Se o refresh foi bem-sucedido, resolve todas.
 * Se falhou, rejeita todas.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ============================================================
// INTERCEPTOR DE RESPOSTA
// ============================================================
api.interceptors.response.use(
  // Sucesso: apenas retorna a resposta
  (response) => response,

  // Erro: tenta refresh token se for 401
  async (error) => {
    const originalRequest = error.config;

    // Só tenta refresh se:
    // - Erro for 401 (não autorizado)
    // - Não for a própria requisição de refresh (evita loop)
    // - Ainda não tentou refresh nesta requisição (_retry)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se já está refrescando, entra na fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Refresh concluído: reexecuta a requisição original
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Marca que já tentou refresh (evita loop)
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tenta renovar o token
        await api.post('/auth/refresh-token');

        // Sucesso: resolve a fila e reexecuta a requisição
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        // Falha: rejeita a fila e redireciona para login
        processQueue(refreshError, null);

        // Limpa o estado local e redireciona
        localStorage.removeItem('@Bolha:user');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Se não for 401, apenas rejeita o erro
    return Promise.reject(error);
  }
);

export default api;
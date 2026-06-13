// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: contexts/SocketContext.jsx
// Propósito: Contexto global de WebSocket com suporte a salas (Rooms)
// ============================================================

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { socket } = useAuth();

  // Entra na sala de uma bolha específica
  const joinBubble = useCallback((bubbleId) => {
    if (socket && bubbleId) {
      socket.emit('join_bubble', bubbleId);
    }
  }, [socket]);

  // Sai da sala de uma bolha específica
  const leaveBubble = useCallback((bubbleId) => {
    if (socket && bubbleId) {
      socket.emit('leave_bubble', bubbleId);
    }
  }, [socket]);

  // Entra na sala pessoal do usuário (para notificações)
  const joinUserCanvas = useCallback((userId) => {
    if (socket && userId) {
      socket.emit('join_user_canvas', userId);
    }
  }, [socket]);

  // Registra um listener para um evento e retorna função de cleanup
  const on = useCallback((event, handler) => {
    if (socket) {
      socket.on(event, handler);
      return () => socket.off(event, handler);
    }
    return () => {};
  }, [socket]);

  // Emite um evento para o servidor
  const emit = useCallback((event, ...args) => {
    if (socket) {
      socket.emit(event, ...args);
    }
  }, [socket]);

  const value = useMemo(() => ({
    socket,
    isConnected: socket?.connected || false,
    joinBubble,
    leaveBubble,
    joinUserCanvas,
    on,
    emit,
  }), [socket, joinBubble, leaveBubble, joinUserCanvas, on, emit]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser utilizado dentro de um SocketProvider');
  }
  return context;
};
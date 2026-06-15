// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: contexts/SocketContext.jsx
// Propósito: Contexto global de WebSocket com suporte a salas (Rooms)
//            Lifecycle Management rigoroso: listeners com namespace e cleanup explícito
// ============================================================

import { createContext, useContext, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

/**
 * Namespace constante para eventos do socket.
 * Define um prefixo para cada domínio de evento, prevenindo colisão
 * e permitindo cleanup granular por namespace.
 */
const EVENT_NAMESPACES = {
  BUBBLE: 'bubble:',
  AUTH: 'auth:',
  ROOM: 'room:',
};

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { socket } = useAuth();
  // Ref para armazenar listeners ativos e permitir cleanup em reconexão
  const activeListenersRef = useRef(new Map());

  // Entra na sala de uma bolha específica
  const joinBubble = useCallback((bubbleId) => {
    if (socket && bubbleId) {
      socket.emit(`${EVENT_NAMESPACES.ROOM}join_bubble`, bubbleId);
    }
  }, [socket]);

  // Sai da sala de uma bolha específica
  const leaveBubble = useCallback((bubbleId) => {
    if (socket && bubbleId) {
      socket.emit(`${EVENT_NAMESPACES.ROOM}leave_bubble`, bubbleId);
    }
  }, [socket]);

  // Entra na sala pessoal do usuário (para notificações)
  const joinUserCanvas = useCallback((userId) => {
    if (socket && userId) {
      socket.emit(`${EVENT_NAMESPACES.ROOM}join_user_canvas`, userId);
    }
  }, [socket]);

  /**
   * Registra um listener com namespace e retorna função de cleanup.
   * 
   * Lifecycle Management:
   * - O nome do evento é prefixado com o namespace (ex: bubble:update)
   * - A função retornada faz socket.off(event, handler) de forma explícita,
   *   garantindo que apenas aquele handler específico seja removido
   * - ActiveListeners são rastreados para cleanup adicional em reconexão
   * 
   * @param {string} event - Nome do evento (com ou sem namespace)
   * @param {Function} handler - Função callback
   * @returns {Function} cleanup function
   */
  const on = useCallback((event, handler) => {
    if (socket) {
      socket.on(event, handler);

      // Rastreia o listener ativo para permitir cleanup em reconexão
      const listenerKey = `${event}::${handler.name || 'anonymous'}`;
      if (!activeListenersRef.current.has(event)) {
        activeListenersRef.current.set(event, new Set());
      }
      activeListenersRef.current.get(event).add(handler);

      return () => {
        socket.off(event, handler);
        // Remove do rastreamento
        const handlers = activeListenersRef.current.get(event);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            activeListenersRef.current.delete(event);
          }
        }
      };
    }
    return () => {};
  }, [socket]);

  /**
   * Remove todos os listeners de um namespace específico.
   * Útil para cleanup global quando o usuário desloga.
   * 
   * @param {string} namespace - O namespace a ser limpo (ex: 'bubble:')
   */
  const offNamespace = useCallback((namespace) => {
    if (!socket || !namespace) return;

    activeListenersRef.current.forEach((handlers, event) => {
      if (event.startsWith(namespace)) {
        handlers.forEach((handler) => {
          socket.off(event, handler);
        });
        activeListenersRef.current.delete(event);
      }
    });
  }, [socket]);

  /**
   * Remove listeners de reconexão duplicados.
   * Chamado internamente quando o socket reconecta para garantir
   * que listeners não se acumulem.
   */
  const cleanupDuplicateListeners = useCallback(() => {
    if (!socket) return;

    activeListenersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        // Remove qualquer listener existente para este evento+handler
        socket.off(event, handler);
        // Re-registra
        socket.on(event, handler);
      });
    });
  }, [socket]);

  // Emite um evento para o servidor
  const emit = useCallback((event, ...args) => {
    if (socket) {
      socket.emit(event, ...args);
    }
  }, [socket]);

  // Monitora reconexões para limpar listeners duplicados
  useEffect(() => {
    if (!socket) return;

    const handleReconnect = () => {
      cleanupDuplicateListeners();
    };

    socket.on('connect', handleReconnect);

    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, cleanupDuplicateListeners]);

  const value = useMemo(() => ({
    socket,
    isConnected: socket?.connected || false,
    joinBubble,
    leaveBubble,
    joinUserCanvas,
    on,
    emit,
    offNamespace,
    cleanupDuplicateListeners,
    EVENT_NAMESPACES,
  }), [socket, joinBubble, leaveBubble, joinUserCanvas, on, emit, offNamespace, cleanupDuplicateListeners]);

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
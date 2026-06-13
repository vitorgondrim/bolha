// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: hooks/useBubbleEvents.js
// Propósito: Hook para inscrição em eventos real-time de uma bolha
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Hook que gerencia a inscrição em eventos real-time de uma bolha específica.
 * 
 * Funcionalidades:
 * - Entra na sala da bolha automaticamente ao montar
 * - Sai da sala ao desmontar (cleanup automático)
 * - Registra listeners com cleanup individual para evitar vazamento de memória
 * - Suporta reconnect automático (reativa listeners após reconexão)
 * 
 * @param {string|null} bubbleId - ID da bolha para receber eventos
 * @param {Object} handlers - Objeto com handlers para cada evento
 * @param {Function} handlers.onBubbleUpdated - Chamado em 'bubble_updated'
 * @param {Function} handlers.onBubblePopped - Chamado em 'bubble_popped'
 * @param {Function} handlers.onBubbleDeleted - Chamado em 'bubble_deleted'
 * @param {Function} handlers.onBubbleLeaked - Chamado em 'bubble_leaked'
 * @param {Function} handlers.onNewChildBubble - Chamado em 'new_child_bubble'
 */
export function useBubbleEvents(bubbleId, handlers = {}) {
  const { socket, joinBubble, leaveBubble } = useSocket();
  const handlersRef = useRef(handlers);

  // Mantém handlers atualizados sem causar re-registro de listeners
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Registra listeners de forma limpa
  const registerListeners = useCallback(() => {
    if (!socket || !bubbleId) return;

    // Lista de eventos e seus handlers
    const eventHandlers = [
      { event: 'bubble_updated', handler: (data) => handlersRef.current.onBubbleUpdated?.(data) },
      { event: 'bubble_popped', handler: (data) => handlersRef.current.onBubblePopped?.(data) },
      { event: 'bubble_deleted', handler: (data) => handlersRef.current.onBubbleDeleted?.(data) },
      { event: 'bubble_leaked', handler: (data) => handlersRef.current.onBubbleLeaked?.(data) },
      { event: 'new_child_bubble', handler: (data) => handlersRef.current.onNewChildBubble?.(data) },
    ];

    // Registra todos os listeners e coleta funções de cleanup
    const cleanups = eventHandlers.map(({ event, handler }) => {
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [socket, bubbleId]);

  // Efeito principal: join/leave da sala + registro de listeners
  useEffect(() => {
    if (!socket || !bubbleId) return;

    // Entra na sala da bolha
    joinBubble(bubbleId);

    // Registra listeners
    const cleanup = registerListeners();

    // Cleanup: sai da sala e remove listeners
    return () => {
      cleanup?.();
      leaveBubble(bubbleId);
    };
  }, [socket, bubbleId, joinBubble, leaveBubble, registerListeners]);
}

/**
 * Hook simplificado para ouvir eventos globais (fora de uma bolha específica).
 * Útil para componentes que precisam reagir a eventos como 'new_bubble' no feed.
 * 
 * @param {Object} handlers - Objeto com handlers para cada evento global
 * @param {Function} handlers.onNewBubble - Chamado em 'new_bubble'
 * @param {Function} handlers.onBubbleLeaked - Chamado em 'bubble_leaked'
 */
export function useGlobalBubbleEvents(handlers = {}) {
  const { socket } = useSocket();
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!socket) return;

    const eventHandlers = [
      { event: 'new_bubble', handler: (data) => handlersRef.current.onNewBubble?.(data) },
      { event: 'bubble_leaked', handler: (data) => handlersRef.current.onBubbleLeaked?.(data) },
    ];

    eventHandlers.forEach(({ event, handler }) => socket.on(event, handler));

    return () => {
      eventHandlers.forEach(({ event, handler }) => socket.off(event, handler));
    };
  }, [socket]);
}
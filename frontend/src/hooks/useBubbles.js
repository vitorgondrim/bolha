// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Hook: useBubbles
// Propósito: Gerenciamento de feed com paginação infinita
//            usando TanStack Query + Intersection Observer.
// ============================================================

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import api from '../services/api';

const BUBBLES_PER_PAGE = 20;

/**
 * Busca bolhas paginadas do backend.
 * @param {number} page - Número da página (1-indexed)
 * @returns {Promise<{bubbles: Array, pagination: Object}>}
 */
const fetchBubbles = async ({ pageParam = 1 }) => {
  const res = await api.get(`/bubbles?page=${pageParam}&limit=${BUBBLES_PER_PAGE}`);
  return res.data;
};

/**
 * Hook principal do feed com paginação infinita.
 * 
 * Exemplo de uso:
 *   const { bubbles, isLoading, isFetchingNextPage, ref } = useBubbles();
 *   // ref = sentinel element (Intersection Observer)
 * 
 * Retorna:
 *   - bubbles:    Array plano de todas as bolhas carregadas
 *   - isLoading:  true apenas no primeiro carregamento
 *   - isError:    true se houver erro
 *   - error:      objeto de erro
 *   - fetchNextPage: função para buscar próxima página manualmente
 *   - hasNextPage:   true se há mais páginas
 *   - isFetchingNextPage: true durante carregamento de próxima página
 *   - ref: ref para o elemento sentinel (último item + 1)
 */
export function useBubbles() {
  const queryClient = useQueryClient();
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px', // Pré-carrega 200px antes do final
  });

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['bubbles'],
    queryFn: fetchBubbles,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination?.hasMore) return undefined;
      return lastPage.pagination.page + 1;
    },
    staleTime: 30_000,          // 30s até considerar dados "velhos"
    gcTime: 5 * 60_000,        // 5min no cache após ficar sem referência
    refetchOnWindowFocus: true, // Refetch ao voltar para a aba
  });

  // Dispara fetch da próxima página quando o sentinel entra na viewport
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 🔥 Achata todas as páginas em um array único de bolhas
  const bubbles = data?.pages.flatMap((page) => page.bubbles ?? []) ?? [];

  /**
   * Invalida o cache e força refetch (ex: após criar bolha)
   */
  const invalidateBubbles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
  }, [queryClient]);

  return {
    bubbles,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    invalidateBubbles,
    ref, // 🔥 ref para o sentinel do Intersection Observer
  };
}

/**
 * Hook de mutações para ações em bolhas (like, dislike, sopro).
 * 
 * Exemplo:
 *   const { likeBubble, dislikeBubble, soproBubble } = useBubbleActions();
 *   likeBubble('abc123');
 */
export function useBubbleActions() {
  const queryClient = useQueryClient();

  /**
   * Callback executado após qualquer mutação: invalida o cache do feed
   * e também da bolha individual.
   */
  const onSettled = () => {
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
  };

  const likeMutation = useMutation({
    mutationFn: ({ bubbleId }) => api.post(`/bubbles/${bubbleId}/react`, { type: 'like' }),
    onSettled,
  });

  const dislikeMutation = useMutation({
    mutationFn: ({ bubbleId }) => api.post(`/bubbles/${bubbleId}/react`, { type: 'dislike' }),
    onSettled,
  });

  const soproMutation = useMutation({
    mutationFn: ({ bubbleId }) => api.post(`/bubbles/${bubbleId}/react`, { type: 'sopro' }),
    onSettled,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ bubbleId }) => api.delete(`/bubbles/${bubbleId}`),
    onSettled,
  });

  const commentMutation = useMutation({
    mutationFn: ({ bubbleId, text }) => api.post(`/bubbles/${bubbleId}/comment`, { text }),
    onSettled,
  });

  const likeBubble = (bubbleId) => likeMutation.mutate({ bubbleId });
  const dislikeBubble = (bubbleId) => dislikeMutation.mutate({ bubbleId });
  const soproBubble = (bubbleId) => soproMutation.mutate({ bubbleId });
  const deleteBubble = (bubbleId) => deleteMutation.mutate({ bubbleId });
  const commentOnBubble = (bubbleId, text) => commentMutation.mutate({ bubbleId, text });

  return {
    likeBubble,
    dislikeBubble,
    soproBubble,
    deleteBubble,
    commentOnBubble,
    isLiking: likeMutation.isPending,
    isDisliking: dislikeMutation.isPending,
    isSoproing: soproMutation.isPending,
  };
}
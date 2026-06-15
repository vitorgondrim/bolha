// ============================================================
// HAPTIC FEEDBACK — Padrões de vibração para interações táteis
// No desktop, usa feedback visual amplificado como fallback
// ============================================================

import { useCallback, useRef } from 'react';

/**
 * Padrões de vibração para cada tipo de interação.
 * Array de durações em ms alternando vibrar/pausar.
 */
const PATTERNS = {
  sopro: [40, 30, 40],           // pulso duplo — como soltar ar
  like: [30, 20, 30, 20, 30],     // batimento cardíaco
  dislike: [50, 20, 20],          // rejeição rápida
  pop: [100, 50, 30],             // desintegração (decrescente)
  spawn: [20, 30, 50, 80],        // crescendo — nascimento
  error: [30, 30, 30],            // alerta
  expandir: [15, 20, 15],         // leve — expansão
  colidir: [20],                  // toque sutil
};

export default function useHapticFeedback() {
  const lastVibrateRef = useRef(0);

  const vibrate = useCallback((pattern) => {
    // Throttle: no máximo 1 vibração a cada 100ms
    const now = Date.now();
    if (now - lastVibrateRef.current < 100) return;
    lastVibrateRef.current = now;

    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
    // No desktop, o feedback visual é gerenciado pelos componentes individualmente
  }, []);

  const sopro = useCallback(() => vibrate(PATTERNS.sopro), [vibrate]);
  const like = useCallback(() => vibrate(PATTERNS.like), [vibrate]);
  const dislike = useCallback(() => vibrate(PATTERNS.dislike), [vibrate]);
  const pop = useCallback(() => vibrate(PATTERNS.pop), [vibrate]);
  const spawn = useCallback(() => vibrate(PATTERNS.spawn), [vibrate]);
  const error = useCallback(() => vibrate(PATTERNS.error), [vibrate]);

  return { sopro, like, dislike, pop, spawn, error };
}

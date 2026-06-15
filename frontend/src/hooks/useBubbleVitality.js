// ============================================================
// useBubbleVitality — Hook de estados vitais da bolha
// 
// Responsabilidades:
//   - Calcular fase vital (spawning → stable → decaying → dying → popped)
//   - Derivar propriedades visuais (opacidade, glow, flicker, pulsação)
//   - Fornecer seeds de animação consistentes por bubbleId
//   - Gerenciar RAF para noise temporal (movimento orgânico)
//
// Não modifica estado global — apenas transforma visual baseado em glowIntensity
// ============================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { hashSeed, floatOffset, driftRotation, pulseScale } from '../utils/organicNoise';
import { getVitalityColor, getTextStyle } from '../utils/vitalityColors';

/**
 * Mapa de fases com thresholds e metadados
 */
const PHASE_THRESHOLDS = {
  popping: { max: -1, min: -1 },       // estado terminal transitório
  dying: { max: 0.1, min: 0 },          // 0–10%
  decaying: { max: 0.3, min: 0.1 },     // 10–30%
  fading: { max: 0.5, min: 0.3 },      // 30–50%
  stable: { max: 0.8, min: 0.5 },       // 50–80%
  blooming: { max: 1.0, min: 0.8 },     // 80–100% (apogeu)
};

/**
 * Determina a fase vital baseada no glowIntensity [0–1]
 */
const resolvePhase = (glowIntensity, hasLeaked) => {
  if (hasLeaked) return 'leaked';
  if (glowIntensity > PHASE_THRESHOLDS.blooming.min) return 'blooming';
  if (glowIntensity > PHASE_THRESHOLDS.stable.min) return 'stable';
  if (glowIntensity > PHASE_THRESHOLDS.fading.min) return 'fading';
  if (glowIntensity > PHASE_THRESHOLDS.decaying.min) return 'decaying';
  if (glowIntensity >= 0) return 'dying';
  return 'popped';
};

/**
 * Calcula a taxa de cintilação do glow baseada na fase.
 * Mais rápido em dying e blooming (pico de energia/agonia).
 */
const computeFlicker = (phase, time, seed) => {
  switch (phase) {
    case 'dying':
      return Math.sin(time * 8 + seed * 10) * 0.3 + 0.7;
    case 'blooming':
      return Math.sin(time * 3 + seed * 5) * 0.1 + 0.9;
    case 'decaying':
      return Math.sin(time * 4 + seed * 7) * 0.15 + 0.85;
    default:
      return Math.sin(time * 1.5 + seed * 3) * 0.05 + 0.95;
  }
};

/**
 * Retorna easing personalizado para a fase atual.
 * Usado nas transições do Framer Motion.
 */
const getPhaseEasing = (phase) => {
  switch (phase) {
    case 'dying':
    case 'popped':
      return [0.7, 0.0, 1.0, 0.2]; // implosão
    case 'blooming':
      return [0.34, 1.56, 0.64, 1]; // spring suave
    default:
      return [0.25, 0.1, 0.25, 1.0]; // fluido
  }
};

/**
 * useBubbleVitality — Hook principal
 * 
 * @param {Object} bubble - Dados da bolha (precisa de _id)
 * @param {number} glowIntensity - Valor 0–1 de vitalidade
 * @param {boolean} hasLeaked - Se a bolha está em estado de vazamento
 * @returns {Object} Propriedades visuais derivadas
 */
export default function useBubbleVitality(bubble, glowIntensity = 0.5, hasLeaked = false) {
  // ─── RAF timer para noise temporal ───
  const [time, setTime] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let running = true;
    const start = Date.now();

    const tick = () => {
      if (!running) return;
      setTime((Date.now() - start) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Seeds consistentes por bubbleId ───
  const seed = useMemo(
    () => hashSeed(bubble?._id || 'default'),
    [bubble?._id]
  );

  // ─── Fase vital ───
  const phase = useMemo(
    () => resolvePhase(glowIntensity, hasLeaked),
    [glowIntensity, hasLeaked]
  );

  // ─── Easing da fase ───
  const phaseEasing = useMemo(() => getPhaseEasing(phase), [phase]);

  // ─── Cintilação do glow ───
  const flicker = useMemo(
    () => computeFlicker(phase, time, seed),
    [phase, time, seed]
  );

  // ─── Paleta contínua de cor ───
  const vitalityColor = useMemo(
    () => getVitalityColor(glowIntensity, hasLeaked),
    [glowIntensity, hasLeaked]
  );

  // ─── Estilo do texto (dissolve com vitalidade) ───
  const textStyle = useMemo(() => getTextStyle(glowIntensity), [glowIntensity]);

  // ─── Opacidade da bolha ───
  const bubbleOpacity = useMemo(() => {
    if (phase === 'dying') {
      return 0.3 + Math.sin(time * 4 + seed * 7) * 0.2;
    }
    return Math.min(1, 0.4 + glowIntensity * 0.7);
  }, [phase, time, seed, glowIntensity]);

  // ─── Tamanho base — varia organicamente por seed ───
  const contentLength = bubble?.content?.length || bubble?.title?.length || 0;
  const baseSize = useMemo(() => {
    const raw = 120 + contentLength * 0.12 + glowIntensity * 40;
    const organicVar = 1 + (seed - 0.5) * 0.08;
    return Math.max(100, Math.min(260, raw * organicVar));
  }, [contentLength, glowIntensity, seed]);

  // ─── Offsets orgânicos (Perlin-like) ───
  const noiseY = useMemo(
    () => floatOffset(bubble?._id || 'default', time, 10 + glowIntensity * 6),
    [bubble?._id, time, glowIntensity]
  );
  const noiseRotate = useMemo(
    () => driftRotation(bubble?._id || 'default', time),
    [bubble?._id, time]
  );
  const noisePulse = useMemo(
    () => pulseScale(bubble?._id || 'default', time, 0.03 + glowIntensity * 0.04),
    [bubble?._id, time, glowIntensity]
  );

  // ─── Box shadow dinâmico ───
  const boxShadow = useMemo(() => {
    const glowRadius = 10 + glowIntensity * 40 * flicker;
    const insetGlow = 8 + glowIntensity * 20;
    return [
      `0 0 ${glowRadius}px ${vitalityColor.glow}`,
      `inset 0 0 ${insetGlow}px rgba(${vitalityColor.rgb}, ${0.02 + glowIntensity * 0.06 * flicker})`,
    ].join(', ');
  }, [glowIntensity, flicker, vitalityColor]);

  // ─── Propriedades de estilo do container ───
  const containerStyle = useMemo(() => ({
    width: baseSize,
    height: baseSize,
    zIndex: Math.round(glowIntensity * 100),
    backgroundColor: `rgba(8, 8, 15, ${0.10 + glowIntensity * 0.15})`,
    backdropFilter: `blur(${12 + glowIntensity * 20}px)`,
    WebkitBackdropFilter: `blur(${12 + glowIntensity * 20}px)`,
    borderColor: `rgba(${vitalityColor.rgb}, ${(0.06 + glowIntensity * 0.34) * flicker})`,
    boxShadow,
  }), [baseSize, glowIntensity, flicker, vitalityColor, boxShadow]);

  // ─── Anel cônico de vitalidade ───
  const conicRingStyle = useMemo(() => ({
    background: `conic-gradient(
      from 0deg,
      rgba(${vitalityColor.rgb}, ${0.08 + glowIntensity * 0.25}) 0deg,
      transparent ${60 + (1 - glowIntensity) * 150}deg,
      rgba(${vitalityColor.rgb}, 0.01) 360deg
    )`,
    opacity: 0.5 + glowIntensity * 0.5 * flicker,
  }), [vitalityColor, glowIntensity, flicker]);

  const conicRingRotate = useMemo(() => {
    if (phase === 'dying') return [0, 360];
    if (phase === 'blooming') return [0, 360];
    return 0;
  }, [phase]);

  const conicRingRotateDuration = useMemo(() => {
    if (phase === 'dying') return 3;
    if (phase === 'blooming') return 8;
    return 0;
  }, [phase]);

  return {
    // Identidade
    seed,
    phase,
    phaseEasing,
    time,

    // Métricas
    glowIntensity,
    flicker,
    baseSize,

    // Estilos
    vitalityColor,
    textStyle,
    containerStyle,
    bubbleOpacity,
    boxShadow,

    // Offsets animados
    noiseY,
    noiseRotate,
    noisePulse,

    // Anel conic
    conicRingStyle,
    conicRingRotate,
    conicRingRotateDuration,
  };
}

// ============================================================
// ORGANIC BUBBLE v7 — Paradigma Orgânico Modular
//
// Refatoração Fase 1: Vida Orgânica
//   - Hook useBubbleVitality para estado vital
//   - DyingParticles para vaporização
//   - ExpandedActions para menu de ações
//   - BubbleTextOverlay para conteúdo textual
//   - Feedback otimista (sopro infla antes da API)
//
// Componente enxuto — lógica delegada para hooks e subcomponentes
// ============================================================

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBubbleVitality from '../../hooks/useBubbleVitality';
import BubbleTextOverlay from './BubbleTextOverlay';
import ExpandedActions from './ExpandedActions';
import DyingParticles from '../effects/DyingParticles';
import { useRippleRings, RippleRingsRenderer } from '../effects/SoproRippleEffect';

export default function OrganicBubble({
  bubble,
  userId,
  glowIntensity = 0.5,
  onLike,
  onDislike,
  onSopro,
  onDelete,
  onComment,
  onOpen,
}) {
  const [expanded, setExpanded] = useState(false);
  const bubbleRef = useRef(null);
  const { rings, triggerSopro } = useRippleRings();

  // ─── Hook de vitalidade (estado + estilos derivados) ───
  const hasLeaked = bubble?.hasLeaked || false;
  const vitality = useBubbleVitality(bubble, glowIntensity, hasLeaked);

  // ─── Fecha ao clicar fora ───
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  // ─── Derivações de dados do bubble ───
  const { contentText, displayName, likesCount, soprosCount, isAuthor, bubbleId } = useMemo(() => ({
    contentText: bubble?.content || bubble?.title || '',
    displayName: bubble?.author?.username || 'anon',
    likesCount: bubble?.likes?.length || 0,
    soprosCount: bubble?.sopros?.length || 0,
    isAuthor: Boolean(
      userId &&
        bubble?.author &&
        String(bubble.author._id || bubble.author) === String(userId)
    ),
    bubbleId: bubble?._id,
  }), [bubble, userId]);

  // Tamanho expandido (12% maior)
  const bubbleSize = expanded ? vitality.baseSize * 1.12 : vitality.baseSize;

  // ─── Handlers de ação ───
  const handleSopro = useCallback(() => {
    triggerSopro(); // anel de onda otimista (antes da API)
    onSopro?.(bubbleId);
    setExpanded(false);
  }, [onSopro, triggerSopro, bubbleId]);

  const handleLike = useCallback(() => {
    onLike?.(bubbleId);
    setExpanded(false);
  }, [onLike, bubbleId]);

  const handleDislike = useCallback(() => {
    onDislike?.(bubbleId);
    setExpanded(false);
  }, [onDislike, bubbleId]);

  const handleDelete = useCallback(() => {
    onDelete?.(bubbleId);
    setExpanded(false);
  }, [onDelete, bubbleId]);

  const handleOpen = useCallback(() => {
    if (!expanded) {
      setExpanded(true);
    } else {
      onOpen?.(bubbleId);
    }
  }, [expanded, onOpen, bubbleId]);

  return (
    <motion.div
      ref={bubbleRef}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: vitality.noisePulse,
        opacity: vitality.bubbleOpacity,
        y: vitality.noiseY,
        rotate: vitality.noiseRotate,
        width: bubbleSize,
        height: bubbleSize,
      }}
      exit={{
        scale: 0,
        opacity: 0,
        transition: {
          duration: vitality.phase === 'dying' ? 0.8 : 0.4,
          ease: vitality.phaseEasing,
        },
      }}
      transition={{
        layout: { type: 'spring', stiffness: 80, damping: 12 },
        scale: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
        opacity: { duration: 0.4 },
        y: { duration: 0.2, ease: 'easeOut' },
        rotate: { duration: 0.3, ease: 'easeOut' },
        width: { duration: 0.3, ease: 'easeOut' },
        height: { duration: 0.3, ease: 'easeOut' },
      }}
      style={vitality.containerStyle}
      className={`
        rounded-full aspect-square
        flex flex-col items-center justify-center
        text-center p-3
        border
        cursor-pointer select-none
        relative
        overflow-hidden
      `}
      whileHover={{
        scale: vitality.noisePulse * 1.08,
        boxShadow: `0 0 ${30 + glowIntensity * 60}px rgba(${vitality.vitalityColor.rgb}, ${0.1 + glowIntensity * 0.25})`,
        transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
      }}
      whileTap={{ scale: 0.92 }}
      onClick={handleOpen}
    >
      {/* ─── ANEL DE VITALIDADE (gradiente conic girando) ─── */}
      {vitality.conicRingRotateDuration > 0 && (
        <motion.div
          className="absolute inset-[2px] rounded-full pointer-events-none"
          animate={{ rotate: vitality.conicRingRotate }}
          transition={{
            rotate: {
              duration: vitality.conicRingRotateDuration,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
          style={vitality.conicRingStyle}
        />
      )}

      {/* ─── PARTÍCULAS DE VAPORIZAÇÃO (estado dying) ─── */}
      <DyingParticles
        bubbleId={bubbleId}
        vitality={glowIntensity}
        colorRgb={vitality.vitalityColor.rgb}
      />

      {/* ─── ANÉIS DE RIPPLE (sopro/atenção) ─── */}
      <RippleRingsRenderer rings={rings} size={bubbleSize} />

      {/* ─── CONTEÚDO FLUTUANTE ─── */}
      <BubbleTextOverlay
        contentText={contentText}
        displayName={displayName}
        likesCount={likesCount}
        soprosCount={soprosCount}
        textStyle={vitality.textStyle}
        hasLeaked={hasLeaked}
      />

      {/* ─── AÇÕES EXPANDIDAS (floating abaixo da bolha) ─── */}
      <AnimatePresence>
        {expanded && (
          <ExpandedActions
            isAuthor={isAuthor}
            onLike={handleLike}
            onDislike={handleDislike}
            onSopro={handleSopro}
            onDelete={handleDelete}
            onSoproRing={triggerSopro}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
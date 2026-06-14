// ============================================================
// ORGANIC BUBBLE v5 — Paradigma Orgânico (Mente Coletiva)
// Forma: círculo puro (rounded-full) sem bg sólido.
// Integração: backdrop-filter: blur(20px) sobre o fundo.
// Tamanho, opacidade e brilho ditados pelo heat index.
// Comportamento: flutua, pulsa, expande no hover.
// Sem containers retangulares. Sem "card".
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Fecha ao clicar fora
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

  // === DERIVAÇÕES DE DADOS ===
  const isAuthor = Boolean(
    userId &&
      bubble?.author &&
      String(bubble.author._id || bubble.author) === String(userId)
  );
  const contentText = bubble?.content || bubble?.title || '';
  const displayName = bubble?.author?.username || 'anon';
  const likesCount = bubble?.likes?.length || 0;
  const soprosCount = bubble?.sopros?.length || 0;
  const hasLeaked = bubble?.hasLeaked || false;

  // Tamanho base proporcional ao conteúdo + heat
  // Bolhas mais quentes e com mais conteúdo são maiores
  const baseSize = Math.max(100, Math.min(260, 120 + contentText.length * 0.12 + glowIntensity * 40));

  // Se expandido, aumenta um pouco
  const bubbleSize = expanded ? baseSize * 1.12 : baseSize;

  // Cor do glow por intensidade
  const getGlowColor = (intensity) => {
    if (hasLeaked) return { rgb: '57, 255, 20', label: 'lime' };
    if (intensity > 0.7) return { rgb: '245, 158, 11', label: 'dourado' };
    if (intensity > 0.4) return { rgb: '124, 58, 237', label: 'roxo' };
    return { rgb: '59, 130, 246', label: 'azul' };
  };
  const glow = getGlowColor(glowIntensity);

  // Brilho da borda: suave para bolhas frias, intenso para quentes
  const borderOpacity = 0.06 + glowIntensity * 0.34;

  return (
    <motion.div
      ref={bubbleRef}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.4 } }}
      transition={{
        layout: { type: 'spring', stiffness: 80, damping: 12 },
      }}
      style={{
        width: bubbleSize,
        height: bubbleSize,
        zIndex: Math.round(glowIntensity * 100),
        // Sem cor de fundo sólida — apenas backdrop-filter
        // para integrar com o fundo espacial
        backgroundColor: `rgba(8, 8, 15, ${0.10 + glowIntensity * 0.15})`,
        backdropFilter: `blur(${12 + glowIntensity * 20}px)`,
        WebkitBackdropFilter: `blur(${12 + glowIntensity * 20}px)`,
        // Borda sutil que muda com o heat
        borderColor: `rgba(${glow.rgb}, ${borderOpacity})`,
        // Glow pulsante externo
        boxShadow: [
          `0 0 ${10 + glowIntensity * 40}px rgba(${glow.rgb}, ${0.04 + glowIntensity * 0.18})`,
          `inset 0 0 ${8 + glowIntensity * 20}px rgba(${glow.rgb}, ${0.02 + glowIntensity * 0.06})`,
        ].join(', '),
      }}
      className="
        rounded-full aspect-square
        flex flex-col items-center justify-center
        text-center p-3
        border
        cursor-pointer select-none
        relative
        overflow-hidden
        transition-shadow duration-500
      "
      whileHover={{
        scale: 1.08,
        boxShadow: `0 0 ${30 + glowIntensity * 60}px rgba(${glow.rgb}, ${0.1 + glowIntensity * 0.25})`,
        transition: { duration: 0.4, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        if (!expanded) setExpanded(true);
        else onOpen?.(bubble._id);
      }}
    >
      {/* === ANEL DE VITALIDADE (gradiente conic girando) === */}
      <div
        className="absolute inset-[2px] rounded-full pointer-events-none"
        style={{
          background: `conic-gradient(
            from 0deg,
            rgba(${glow.rgb}, ${0.08 + glowIntensity * 0.25}) 0deg,
            transparent ${60 + (1 - glowIntensity) * 150}deg,
            rgba(${glow.rgb}, ${0.01}) 360deg
          )`,
          opacity: 0.5 + glowIntensity * 0.5,
        }}
      />

      {/* === INDICADOR DE VAZAMENTO (bolha crítica) === */}
      {hasLeaked && (
        <div className="absolute top-1 right-1 z-20 w-2.5 h-2.5 rounded-full bg-lime-400 animate-ping opacity-75" />
      )}

      {/* === CONTEÚDO FLUTUANTE SOBRE O BLUR === */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full mask-soft-edge">
        {/* === AUTOR (mini, topo) === */}
        <span className="text-[9px] font-bold text-cyan-300/60 leading-none mb-0.5 truncate max-w-[85%]">
          @{displayName}
        </span>

        {/* === CONTEÚDO (central, truncado com gradiente) === */}
        <p className="text-xs text-slate-100/90 leading-tight line-clamp-4 px-1.5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
          {contentText}
        </p>

        {/* === MÉTRICAS MINIATURIZADAS (base) === */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] text-cyan-400/50 font-medium">
            ❤️{likesCount}
          </span>
          <span className="text-[8px] text-lime-400/50 font-medium">
            🫧{soprosCount}
          </span>
        </div>
      </div>

      {/* === AÇÕES EXPANDIDAS (animadas) — flutuam abaixo da bolha === */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 5 }}
            transition={{ duration: 0.2 }}
            className="
              absolute -bottom-12 left-1/2 -translate-x-1/2
              flex items-center gap-1
              px-2 py-1.5
              rounded-full
              backdrop-blur-2xl
              border border-slate-700/20
              shadow-xl
              z-30
            "
            style={{
              backgroundColor: 'rgba(8, 8, 15, 0.7)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { onLike?.(bubble._id); setExpanded(false); }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-cyan-500/20 hover:text-cyan-300 transition-all active:scale-90"
              title="Curtir"
            >
              ❤️
            </button>
            <button
              onClick={() => { onDislike?.(bubble._id); setExpanded(false); }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-rose-500/20 hover:text-rose-300 transition-all active:scale-90"
              title="Dislike"
            >
              💥
            </button>
            <button
              onClick={() => { onSopro?.(bubble._id); setExpanded(false); }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-lime-500/20 hover:text-lime-300 transition-all active:scale-90"
              title="Sopro"
            >
              🫧
            </button>
            {isAuthor && (
              <button
                onClick={() => { onDelete?.(bubble._id); setExpanded(false); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-rose-500/20 hover:text-rose-300 transition-all active:scale-90 ml-1 border-l border-slate-700/30 pl-2"
                title="Estourar"
              >
                🗑️
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

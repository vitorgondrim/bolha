// ============================================================
// EXPANDED ACTIONS — Floating action menu para bolhas orgânicas
//
// Aparece abaixo da bolha quando expandida (clique único).
// Ações: Curtir, Dislike, Sopro, Deletar (só autor)
//
// Feedback visual otimista:
//   - Sopro: escala com spring (infla instantaneamente)
//   - Curtir: flash de cor
//   - Dislike: feedback háptico
//   - Deletar: implosão
// ============================================================

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHapticFeedback from '../../hooks/useHapticFeedback';

const VARIANTS = {
  initial: { opacity: 0, scale: 0.7, y: 5 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.7, y: 5 },
};

const TRANSITION = {
  duration: 0.2,
  ease: [0.34, 1.56, 0.64, 1], // spring back
};

/**
 * Botão individual de ação com feedback otimista.
 */
const ActionBtn = memo(function ActionBtn({
  emoji,
  title = '',
  isActive = false,
  activeClass = '',
  className = '',
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-7 h-7 rounded-full flex items-center justify-center text-xs
        transition-all duration-200 active:scale-90
        ${isActive ? activeClass : 'hover:bg-white/10 hover:text-white'}
        ${className}
      `}
      title={title}
      aria-label={title}
    >
      {emoji}
    </button>
  );
});

/**
 * Floating action menu com feedback visual otimista.
 */
const ExpandedActions = memo(function ExpandedActions({
  isAuthor = false,
  onLike,
  onDislike,
  onSopro,
  onDelete,
  onSoproRing, // callback para disparar anel de onda visual
}) {
  const haptic = useHapticFeedback();
  const [justSoprou, setJustSoprou] = useState(false);
  const [justCurtiu, setJustCurtiu] = useState(false);

  const flash = useCallback((setter, ms = 500) => {
    setter(true);
    setTimeout(() => setter(false), ms);
  }, []);

  const handleLike = useCallback((e) => {
    e.stopPropagation();
    flash(setJustCurtiu, 400);
    haptic.like();
    onLike?.();
  }, [onLike, haptic, flash]);

  const handleSopro = useCallback((e) => {
    e.stopPropagation();
    flash(setJustSoprou, 600);
    haptic.sopro();
    onSoproRing?.(); // dispara anel de onda antes da resposta da API
    onSopro?.();
  }, [onSopro, onSoproRing, haptic, flash]);

  const handleDislike = useCallback((e) => {
    e.stopPropagation();
    haptic.dislike();
    onDislike?.();
  }, [onDislike, haptic]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    haptic.pop();
    onDelete?.();
  }, [onDelete, haptic]);

  return (
    <motion.div
      variants={VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={TRANSITION}
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
      <ActionBtn
        emoji="❤️"
        title="Curtir"
        isActive={justCurtiu}
        activeClass="bg-cyan-500/30 text-cyan-200 scale-110"
        onClick={handleLike}
      />

      <ActionBtn
        emoji="💥"
        title="Dislike"
        onClick={handleDislike}
      />

      <ActionBtn
        emoji="🫧"
        title="Sopro (dar vida)"
        isActive={justSoprou}
        activeClass="bg-lime-500/30 text-lime-200 scale-125"
        onClick={handleSopro}
      />

      {isAuthor && (
        <ActionBtn
          emoji="🗑️"
          title="Estourar (deletar)"
          className="ml-1 border-l border-slate-700/30 pl-2 rounded-l-none"
          onClick={handleDelete}
        />
      )}
    </motion.div>
  );
});

export default ExpandedActions;

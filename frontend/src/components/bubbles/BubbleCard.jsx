// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleCard (Orquestrador - Atomic Design)
// Propósito: Card de bolha — orquestra sub-componentes atômicos
// ============================================================

import { useMemo, useState, useContext } from 'react';
import { TimeContext } from '../../contexts/TimeContext.jsx';
import BubbleHeader from './BubbleHeader';
import BubbleContent from './BubbleContent';
import BubbleProgressBar from './BubbleProgressBar';
import BubbleMetrics from './BubbleMetrics';
import BubbleActions from './BubbleActions';
import BubbleComments from './BubbleComments';
import DeleteBubbleModal from './DeleteBubbleModal';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function BubbleCard({
  bubble,
  userId,
  onLike,
  onDislike,
  onSopro,
  onDelete,
  onComment,
  onOpen,
  showComments = false,
  showCommentForm = false,
}) {
  const { timeNow } = useContext(TimeContext);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isAuthor = userId && bubble?.author && String(bubble.author._id || bubble.author) === String(userId);

  // === Cálculos de vitalidade ===
  const remainingMs = Math.max(
    (bubble?.expiresAt ? new Date(bubble.expiresAt).getTime() : 0) - timeNow,
    0
  );

  const formatRemainingText = useMemo(() => {
    if (remainingMs <= 0) return 'Estourou! 💥';
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }, [remainingMs]);

  const percent = useMemo(() => {
    if (!bubble?.createdAt || !bubble?.expiresAt) return 0;
    const totalDuration =
      new Date(bubble.expiresAt).getTime() - new Date(bubble.createdAt).getTime();
    return totalDuration > 0 ? clamp((remainingMs / totalDuration) * 100, 0, 100) : 0;
  }, [bubble?.createdAt, bubble?.expiresAt, remainingMs]);

  const pressureLevel = useMemo(() => {
    if (percent <= 25) return 'critical';
    if (percent <= 55) return 'warning';
    return 'stable';
  }, [percent]);

  // === Estilo do card baseado na pressão ===
  const cardStyle = bubble.hasLeaked
    ? 'bg-slate-900/80 border-lime-400 shadow-lg shadow-lime-500/30 animate-pulse'
    : pressureLevel === 'critical'
      ? 'bg-slate-900/40 border-rose-500/60 opacity-85'
      : pressureLevel === 'warning'
        ? 'bg-slate-900/60 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
        : 'bg-slate-900/70 border-slate-700/60 shadow-lg shadow-cyan-500/5';

  return (
    <div
      onClick={() => onOpen?.(bubble._id)}
      className={`
        rounded-3xl p-6 backdrop-blur-md relative overflow-hidden
        transition-all duration-500 border
        ${cardStyle}
        ${onOpen ? 'cursor-pointer hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99]' : ''}
      `}
    >
      {/* Glow de fundo dinâmico */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {pressureLevel === 'critical' && <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />}
        {pressureLevel === 'warning' && <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />}
      </div>

      {/* Header */}
      <BubbleHeader
        bubble={bubble}
        formatRemainingText={formatRemainingText}
        pressureLevel={pressureLevel}
      />

      {/* Botão de deletar (só para o autor) */}
      {isAuthor && onDelete && (
        <div className="relative z-10 mb-3 text-right">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
            className="text-xs uppercase tracking-[0.2em] text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full hover:bg-rose-500/10 transition"
          >
            🗑️ Apagar
          </button>
        </div>
      )}

      {/* Conteúdo */}
      <BubbleContent bubble={bubble} />

      {/* Barra de progresso */}
      <BubbleProgressBar percent={percent} pressureLevel={pressureLevel} />

      {/* Métricas */}
      <BubbleMetrics bubble={bubble} />

      {/* Ações */}
      <BubbleActions
        bubbleId={bubble._id}
        onLike={onLike}
        onDislike={onDislike}
        onSopro={onSopro}
      />

      {/* Comentários */}
      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        <BubbleComments
          bubble={bubble}
          showComments={showComments}
          showCommentForm={showCommentForm}
          onComment={onComment}
        />
      </div>

      {/* Modal de exclusão */}
      <DeleteBubbleModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => { setIsDeleteModalOpen(false); onDelete?.(bubble._id); }}
      />
    </div>
  );
}
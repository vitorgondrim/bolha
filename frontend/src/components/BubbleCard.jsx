// ============================================================
// COMPONENTE: BUBBLE CARD
// Card completo de uma bolha para visualização detalhada.
// Usado em: Feed (grid), BubbleDetail, Explore, Trending.
//
// Funcionalidades:
//   - Barra de pressão (tempo de vida restante)
//   - Estados visuais: estável, alerta, crítico, vazado
//   - Interações: like, dislike, sopro, comentário
//   - Modal de exclusão (apenas para o autor)
//   - Exibição de mídia (imagem/GIF)
// ============================================================

import { useMemo, useState, useContext } from 'react';
import { TimeContext } from '../context/TimeContext.jsx';

/**
 * Limita um valor entre min e max.
 * Ex: clamp(75, 0, 100) → 75
 *     clamp(150, 0, 100) → 100
 *     clamp(-10, 0, 100) → 0
 */
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
  showCommentForm = false 
}) {
  const { timeNow } = useContext(TimeContext);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [imageError, setImageError] = useState(false);

  // ============================================================
  // HANDLERS DO MODAL DE EXCLUSÃO
  // ============================================================
  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);
  const confirmDelete = () => {
    closeDeleteModal();
    onDelete?.(bubble._id);
  };

  // ============================================================
  // COMENTÁRIOS
  // ============================================================
  const comments = useMemo(() => bubble.comments || [], [bubble.comments]);
  
  // Últimos 2 comentários (ordem inversa: mais recentes primeiro)
  const latestComments = useMemo(() => 
    comments.slice(-2).reverse(), 
    [comments]
  );

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    await onComment?.(bubble._id, trimmed);
    setCommentText('');
  };

  // ============================================================
  // CÁLCULOS DE TEMPO E PRESSÃO
  // ============================================================
  
  // Tempo restante em milissegundos (nunca negativo)
  const remainingMs = Math.max(
    new Date(bubble.expiresAt).getTime() - timeNow, 
    0
  );

  // Texto formatado: "5m 32s" ou "Estourou! 💥"
  const formatRemainingText = useMemo(() => {
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    if (remainingMs <= 0) return 'Estourou! 💥';
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }, [remainingMs]);

  // Percentual de vida restante (0-100)
  const percent = useMemo(() => {
    const totalDuration = 
      new Date(bubble.expiresAt).getTime() - 
      new Date(bubble.createdAt).getTime();
    return totalDuration > 0 
      ? clamp((remainingMs / totalDuration) * 100, 0, 100) 
      : 0;
  }, [bubble.createdAt, bubble.expiresAt, remainingMs]);

  // Nível de pressão baseado no percentual restante
  const pressureLevel = useMemo(() => {
    if (percent <= 25) return 'critical';  // 0-25%: vermelho, pulsando
    if (percent <= 55) return 'warning';   // 26-55%: ciano, alerta
    return 'stable';                        // 56-100%: verde, saudável
  }, [percent]);

  // Se tem mídia válida para exibir
  const hasMedia = bubble.mediaUrl && !imageError;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      onClick={() => onOpen?.(bubble._id)}
      className={`
        rounded-3xl p-6 backdrop-blur-md relative overflow-hidden 
        transition-all duration-500 border
        ${bubble.hasLeaked
          ? 'bg-slate-900/80 border-lime-400 shadow-lg shadow-lime-500/30 animate-pulse'
          : pressureLevel === 'critical'
            ? 'bg-slate-900/40 border-rose-500/60 opacity-75 animate-pulse'
            : pressureLevel === 'warning'
              ? 'bg-slate-900/60 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/70 border-slate-700/60 shadow-lg shadow-cyan-500/5'
        } 
        ${onOpen ? 'cursor-pointer hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20' : ''}
      `}
      style={pressureLevel === 'stable' ? { animation: 'none' } : {}}
    >
      {/* ============================================================
          OVERLAY DE FUNDO (ESTADOS CRÍTICO E ALERTA)
          Camada sutil que pulsa por trás do conteúdo.
          ============================================================ */}
      <div className="absolute inset-0 pointer-events-none">
        {pressureLevel === 'critical' && (
          <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />
        )}
        {pressureLevel === 'warning' && (
          <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
        )}
      </div>

      {/* ============================================================
          CABEÇALHO: AUTOR + STATUS
          ============================================================ */}
      <div className="relative z-10 flex justify-between items-start gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <span className="font-semibold text-cyan-300">
              @{bubble.author?.username}
            </span>
            {bubble.hasLeaked && (
              <span className="text-[0.65rem] uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-lime-500/20 text-lime-300 border border-lime-500/40 font-bold">
                ⚡ VAZOU
              </span>
            )}
          </div>
          <div className="text-slate-500 text-[0.75rem] mt-1">
            {new Date(bubble.createdAt).toLocaleString()}
          </div>
        </div>
        
        {/* Timer + Botão de exclusão (se for o autor) */}
        <div className="text-right text-[0.75rem] text-slate-400 flex flex-col items-end gap-2">
          {userId && bubble.author && bubble.author._id?.toString() === userId.toString() && onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openDeleteModal();
              }}
              className="text-xs uppercase tracking-[0.2em] text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full hover:bg-rose-500/10 transition"
            >
              🗑️ Apagar
            </button>
          )}
          <div className={`font-bold ${pressureLevel === 'critical' ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
            {formatRemainingText}
          </div>
          <div className={`mt-1 uppercase tracking-widest text-[0.65rem] font-bold ${
            pressureLevel === 'critical' ? 'text-rose-400' : 
            pressureLevel === 'warning' ? 'text-cyan-400' : 
            'text-lime-400'
          }`}>
            {pressureLevel === 'critical' ? '⚠️ ESTOURANDO' : 
             pressureLevel === 'warning' ? '🫧 TREME' : 
             '💚 QUENTE'}
          </div>
        </div>
      </div>

      {/* ============================================================
          TÍTULO
          ============================================================ */}
      {bubble.title && (
        <h3 className="relative z-10 text-xl font-bold text-white mb-2 leading-tight">
          {bubble.title}
        </h3>
      )}

      {/* ============================================================
          ASSUNTO (BADGE)
          Só aparece se não for "Geral".
          ============================================================ */}
      {bubble.subject && bubble.subject !== 'Geral' && (
        <div className="relative z-10 mb-3">
          <span className="text-[10px] uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
            {bubble.subject}
          </span>
        </div>
      )}

      {/* ============================================================
          MÍDIA (IMAGEM/GIF)
          Só renderiza se tiver mediaUrl e não deu erro.
          ============================================================ */}
      {hasMedia && bubble.mediaUrl && (
        <div className="relative z-10 mb-4 rounded-2xl overflow-hidden bg-slate-950/50">
          <img
            src={bubble.mediaUrl}
            alt={bubble.title || 'Bolha visual'}
            className="w-full max-h-64 object-contain rounded-2xl"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* ============================================================
          CONTEÚDO PRINCIPAL
          ============================================================ */}
      <p className="relative z-10 text-lg leading-relaxed text-slate-100 min-h-12">
        {bubble.content}
      </p>

      {/* ============================================================
          BARRA DE PRESSÃO
          Indica visualmente o tempo de vida restante.
          Cores: verde → ciano → laranja → vermelho.
          ============================================================ */}
      <div className="relative z-10 mt-5 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            pressureLevel === 'critical'
              ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-lg shadow-rose-500/50'
              : pressureLevel === 'warning'
                ? 'bg-gradient-to-r from-cyan-400 to-lime-400 shadow-lg shadow-cyan-500/30'
                : 'bg-gradient-to-r from-lime-400 to-cyan-400 shadow-lg shadow-lime-500/50'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* ============================================================
          ESTATÍSTICAS (LIKES, DISLIKES, SOPROS)
          ============================================================ */}
      <div className="relative z-10 grid grid-cols-3 gap-3 mt-5 text-center">
        <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Curtidas</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">❤️ {bubble.likes?.length || 0}</div>
        </div>
        <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Dislikes</div>
          <div className="text-sm font-bold text-rose-400 mt-0.5">💥 {bubble.dislikes?.length || 0}</div>
        </div>
        <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Sopros</div>
          <div className="text-sm font-bold text-lime-400 mt-0.5">🫧 {bubble.sopros?.length || 0}</div>
        </div>
      </div>

      {/* ============================================================
          SEÇÃO DE COMENTÁRIOS
          Modo compacto (apenas contagem) ou expandido (lista + form).
          ============================================================ */}
      {!showComments ? (
        <div className="relative z-10 mt-4 rounded-3xl bg-slate-950/60 border border-slate-800/60 p-4 text-xs text-slate-400">
          {comments.length} comentário(s) · Clique para entrar na bolha
        </div>
      ) : (
        <div className="relative z-10 mt-4 rounded-3xl bg-slate-950/60 border border-slate-800/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">💬 Comentários</div>
            <div className="text-xs text-slate-400">{comments.length}</div>
          </div>

          {comments.length === 0 ? (
            <div className="text-slate-500 text-sm italic">
              Seja o primeiro a comentar e dê vida à bolha.
            </div>
          ) : (
            <div className="space-y-2">
              {latestComments.map((comment) => (
                <div key={comment._id} className="rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                    @{comment.author?.username || 'anon'}
                  </div>
                  <div className="text-sm text-slate-100 leading-relaxed">{comment.text}</div>
                </div>
              ))}
            </div>
          )}

          {showCommentForm && (
            <form onSubmit={handleCommentSubmit} onClick={(event) => event.stopPropagation()} className="mt-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={240}
                placeholder="Comente na bolha..."
                className="w-full min-h-24 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 resize-none"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-xs text-slate-500">Máx. 240 caracteres</span>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="rounded-2xl bg-cyan-500 text-slate-950 px-5 py-2 text-sm font-semibold transition hover:bg-cyan-400 disabled:opacity-40"
                >
                  Comentar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================
          BOTÕES DE AÇÃO (LIKE, DISLIKE, SOPRO)
          ============================================================ */}
      <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onLike(bubble._id, 'like');
          }}
          className="rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 py-2.5 text-xs font-semibold hover:bg-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          ❤️ Curtir
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onDislike(bubble._id, 'dislike');
          }}
          className="rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 py-2.5 text-xs font-semibold hover:bg-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          💥 Dislike
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onSopro(bubble._id, 'sopro');
          }}
          className="rounded-xl bg-lime-500/15 border border-lime-500/40 text-lime-300 py-2.5 text-xs font-semibold hover:bg-lime-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-lime-500/20"
        >
          🫧 Sopro
        </button>
      </div>

      {/* ============================================================
          MODAL DE EXCLUSÃO
          Aparece sobreposto quando o autor clica em "Apagar".
          ============================================================ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-slate-700 p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-lg font-semibold text-white mb-3">🗑️ Confirmar exclusão</div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Tem certeza que deseja apagar esta bolha? Esta ação é permanente.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="w-full sm:w-auto rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="w-full sm:w-auto rounded-2xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700 transition"
              >
                Apagar bolha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
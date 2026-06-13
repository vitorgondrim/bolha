// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleCard
// Propósito: Card otimizado, imune a vazamento de eventos e performático (Sênior)
// ============================================================

import { useMemo, useState, useContext } from 'react';
import { createPortal } from 'react-dom'; // Sênior: Para renderizar o modal na raiz da página (Evita bugs de layout)
import { TimeContext } from '../contexts/TimeContext.jsx';

/**
 * Função Pura Auxiliar: Limita um valor entre o intervalo min e max.
 * Mantida fora do componente para não ser recriada na memória a cada ciclo.
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
  // CÁLCULOS DE TEMPO E PRESSÃO (OTIMIZADOS)
  // ============================================================
  
  // Tempo restante em milissegundos
  const remainingMs = Math.max(new Date(bubble.expiresAt).getTime() - timeNow, 0);

  // Texto formatado dinamicamente: "5m 32s" ou "Estourou! 💥"
  const formatRemainingText = useMemo(() => {
    if (remainingMs <= 0) return 'Estourou! 💥';
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }, [remainingMs]);

  // Percentual de vida restante (0-100)
  const percent = useMemo(() => {
    const totalDuration = new Date(bubble.expiresAt).getTime() - new Date(bubble.createdAt).getTime();
    return totalDuration > 0 ? clamp((remainingMs / totalDuration) * 100, 0, 100) : 0;
  }, [bubble.createdAt, bubble.expiresAt, remainingMs]);

  // Nível de estresse térmico/pressão da bolha
  const pressureLevel = useMemo(() => {
    if (percent <= 25) return 'critical'; // Perigo iminente
    if (percent <= 55) return 'warning';  // Instável
    return 'stable';                      // Saudável
  }, [percent]);

  // ============================================================
  // INTERAÇÕES E TRATAMENTO DE EVENTOS (STOP PROPAGATION)
  // ============================================================
  const handleAction = (event, callback, ...args) => {
    event.stopPropagation(); // Sênior: Impede que o clique no botão dispare o 'onOpen' do card pai
    callback?.(...args);
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    await onComment?.(bubble._id, trimmed);
    setCommentText('');
  };

  const comments = useMemo(() => bubble.comments || [], [bubble.comments]);
  const latestComments = useMemo(() => [...comments].reverse().slice(0, 2), [comments]);
  const hasMedia = bubble.mediaUrl && !imageError;

  // Verifica se o usuário logado é o dono legítimo da bolha
  const isAuthor = userId && bubble.author && String(bubble.author._id || bubble.author) === String(userId);

  return (
    <div
      onClick={() => onOpen?.(bubble._id)}
      className={`
        rounded-3xl p-6 backdrop-blur-md relative overflow-hidden 
        transition-all duration-500 border
        ${bubble.hasLeaked
          ? 'bg-slate-900/80 border-lime-400 shadow-lg shadow-lime-500/30 animate-pulse'
          : pressureLevel === 'critical'
            ? 'bg-slate-900/40 border-rose-500/60 opacity-85'
            : pressureLevel === 'warning'
              ? 'bg-slate-900/60 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/70 border-slate-700/60 shadow-lg shadow-cyan-500/5'
        } 
        ${onOpen ? 'cursor-pointer hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20' : ''}
      `}
    >
      {/* Glow de fundo dinâmico */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {pressureLevel === 'critical' && <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />}
        {pressureLevel === 'warning' && <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />}
      </div>

      {/* CABEÇALHO */}
      <div className="relative z-10 flex justify-between items-start gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <span className="font-semibold text-cyan-300">
              @{bubble.author?.username || 'Anônimo'}
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
        
        <div className="text-right text-[0.75rem] text-slate-400 flex flex-col items-end gap-2">
          {isAuthor && onDelete && (
            <button
              type="button"
              onClick={(e) => handleAction(e, setIsDeleteModalOpen, true)}
              className="text-xs uppercase tracking-[0.2em] text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full hover:bg-rose-500/10 transition"
            >
              🗑️ Apagar
            </button>
          )}
          <div className={`font-bold text-sm ${pressureLevel === 'critical' ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
            {formatRemainingText}
          </div>
          <div className={`mt-1 uppercase tracking-widest text-[0.65rem] font-bold ${
            pressureLevel === 'critical' ? 'text-rose-400' : pressureLevel === 'warning' ? 'text-cyan-400' : 'text-lime-400'
          }`}>
            {pressureLevel === 'critical' ? '⚠️ ESTOURANDO' : pressureLevel === 'warning' ? '🫧 TREME' : '💚 QUENTE'}
          </div>
        </div>
      </div>

      {/* CORPO DA BOLHA */}
      {bubble.title && <h3 className="relative z-10 text-xl font-bold text-white mb-2 leading-tight">{bubble.title}</h3>}

      {bubble.subject && bubble.subject !== 'Geral' && (
        <div className="relative z-10 mb-3">
          <span className="text-[10px] uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
            {bubble.subject}
          </span>
        </div>
      )}

      {hasMedia && (
        <div className="relative z-10 mb-4 rounded-2xl overflow-hidden bg-slate-950/50" onClick={(e) => e.stopPropagation()}>
          <img
            src={bubble.mediaUrl}
            alt="Conteúdo da bolha"
            className="w-full max-h-64 object-contain rounded-2xl"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      <p className="relative z-10 text-base leading-relaxed text-slate-100 min-h-6 mb-4 whitespace-pre-wrap">
        {bubble.content}
      </p>

      {/* BARRA DE PROGRESSO / PRESSÃO */}
      <div className="relative z-10 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/30">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            pressureLevel === 'critical'
              ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-lg shadow-rose-500/50'
              : pressureLevel === 'warning'
                ? 'bg-gradient-to-r from-cyan-400 to-lime-400'
                : 'bg-gradient-to-r from-lime-400 to-cyan-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* METRICAS */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 mt-5 text-center">
        <div className="rounded-xl bg-slate-950/40 p-2 border border-slate-800/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Curtidas</div>
          <div className="text-xs font-bold text-cyan-400 mt-0.5">❤️ {bubble.likes?.length || 0}</div>
        </div>
        <div className="rounded-xl bg-slate-950/40 p-2 border border-slate-800/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Dislikes</div>
          <div className="text-xs font-bold text-rose-400 mt-0.5">💥 {bubble.dislikes?.length || 0}</div>
        </div>
        <div className="rounded-xl bg-slate-950/40 p-2 border border-slate-800/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Sopros</div>
          <div className="text-xs font-bold text-lime-400 mt-0.5">🫧 {bubble.sopros?.length || 0}</div>
        </div>
      </div>

      {/* SEÇÃO DE COMENTÁRIOS */}
      <div className="relative z-10 mt-4" onClick={(e) => e.stopPropagation()}>
        {!showComments ? (
          <div className="rounded-2xl bg-slate-950/30 border border-slate-800/40 p-3 text-xs text-slate-400 hover:bg-slate-950/50 transition">
            {comments.length} comentário(s) · Clique para inspecionar bolha
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-950/40 border border-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-2">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">💬 Discussão</div>
              <div className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">{comments.length}</div>
            </div>

            {comments.length === 0 ? (
              <div className="text-slate-500 text-xs italic py-2">Nenhum sopro de voz por aqui ainda...</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {latestComments.map((comment) => (
                  <div key={comment._id} className="rounded-xl bg-slate-900/60 p-2.5 border border-slate-800/80">
                    <div className="text-[10px] font-semibold text-cyan-400/80 mb-0.5">
                      @{comment.author?.username || 'anon'}
                    </div>
                    <div className="text-xs text-slate-200">{comment.text}</div>
                  </div>
                ))}
              </div>
            )}

            {showCommentForm && (
              <form onSubmit={handleCommentSubmit} className="mt-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={240}
                  placeholder="Injete sua opinião na bolha..."
                  className="w-full min-h-16 rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500 transition resize-none"
                />
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">{commentText.length}/240 caracteres</span>
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="rounded-xl bg-cyan-500 text-slate-950 px-4 py-1.5 text-xs font-bold transition hover:bg-cyan-400 disabled:opacity-30"
                  >
                    Comentar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* COMPONENTES DE AÇÃO */}
      <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={(e) => handleAction(e, onLike, bubble._id, 'like')}
          className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 py-2 text-xs font-semibold hover:bg-cyan-500/20 active:scale-95 transition-all"
        >
          ❤️ Curtir
        </button>
        <button
          onClick={(e) => handleAction(e, onDislike, bubble._id, 'dislike')}
          className="rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 py-2 text-xs font-semibold hover:bg-rose-500/20 active:scale-95 transition-all"
        >
          💥 Dislike
        </button>
        <button
          onClick={(e) => handleAction(e, onSopro, bubble._id, 'sopro')}
          className="rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-300 py-2 text-xs font-semibold hover:bg-lime-500/20 active:scale-95 transition-all"
        >
          🫧 Sopro
        </button>
      </div>

      {/* ============================================================
          MODAL DE EXCLUSÃO (REACT PORTAL)
          Injetado diretamente no root do HTML para evitar quebra de z-index
          ============================================================ */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-base font-bold text-white mb-2">🗑️ Confirmar autodestruição</div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Você tem certeza de que deseja estourar manualmente essa bolha? Esse processo não pode ser desfeito.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Garantir Vida
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  onDelete?.(bubble._id);
                }}
                className="rounded-xl bg-rose-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-rose-700 transition"
              >
                Estourar Bolha
              </button>
            </div>
          </div>
        </div>,
        document.body // Alvo do Portal: corpo principal do documento
      )}
    </div>
  );
}
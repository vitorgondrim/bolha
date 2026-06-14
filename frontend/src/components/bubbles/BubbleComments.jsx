// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleComments (Atomic Design)
// Propósito: Seção de comentários da bolha — colapsável
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BubbleComments({ bubble, showComments, showCommentForm, onComment }) {
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const comments = useMemo(() => bubble?.comments || [], [bubble?.comments]);
  const latestComments = useMemo(() => [...comments].reverse().slice(0, 2), [comments]);

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    await onComment?.(bubble._id, trimmed);
    setCommentText('');
  };

  if (!showComments) {
    return (
      <div className="rounded-2xl bg-slate-950/30 border border-slate-800/40 p-3 text-xs text-slate-400 hover:bg-slate-950/50 transition">
        {comments.length} comentário(s) · Clique para inspecionar bolha
      </div>
    );
  }

  return (
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
              <div
                className="text-[10px] font-semibold text-cyan-400/80 mb-0.5 cursor-pointer hover:text-cyan-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (comment.author?.username) navigate(`/profile/${comment.author.username}`);
                }}
              >
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
  );
}
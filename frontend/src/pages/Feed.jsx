// ============================================================
// FEED v2 — Grade de Pensamentos
// Rota: /feed
//
// Arquitetura:
//   - TanStack Query (useInfiniteQuery) para paginação
//   - Intersection Observer para infinite scroll
//   - Grid responsivo: 1 col (mobile) | 2 col (tablet) | 3 col (desktop)
//   - Skeleton loading estrutural (sem layout shift)
//   - Componentes atômicos (Atomic Design)
// ============================================================

import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBubbles, useBubbleActions } from '../hooks/useBubbles';
import BubbleHUD from '../components/BubbleHUD';
import BubbleCard from '../components/bubbles/BubbleCard';
import { FeedSkeleton } from '../components/skeletons/BubbleSkeleton';

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();

  // 🔥 Hooks de dados (TanStack Query)
  const {
    bubbles,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    ref,
  } = useBubbles();

  const {
    likeBubble,
    dislikeBubble,
    soproBubble,
    deleteBubble,
    commentOnBubble,
  } = useBubbleActions();

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleOpen = (bubbleId) => navigate(`/bubble/${bubbleId}`);

  const handleLike = (bubbleId) => {
    try { likeBubble(bubbleId); }
    catch { toast.error('Erro ao curtir'); }
  };

  const handleDislike = (bubbleId) => {
    try { dislikeBubble(bubbleId); }
    catch { toast.error('Erro ao dislikar'); }
  };

  const handleSopro = (bubbleId) => {
    try { soproBubble(bubbleId); }
    catch { toast.error('Erro ao soprar'); }
  };

  const handleDelete = (bubbleId) => {
    try { deleteBubble(bubbleId); toast.success('Bolha estourada! 💥'); }
    catch { toast.error('Erro ao deletar'); }
  };

  const handleComment = (bubbleId, text) => {
    try { commentOnBubble(bubbleId, text); toast.success('Comentário adicionado!'); }
    catch { toast.error('Erro ao comentar'); }
  };

  // ============================================================
  // ESTADOS DE CARREGAMENTO
  // ============================================================
  if (isLoading) {
    return (
      <BubbleHUD>
        <div className="max-w-7xl mx-auto">
          <FeedSkeleton count={6} />
        </div>
      </BubbleHUD>
    );
  }

  if (isError) {
    return (
      <BubbleHUD>
        <div className="max-w-7xl mx-auto p-6">
          <div className="rounded-3xl bg-rose-950/80 border border-rose-600/20 p-8 text-center">
            <div className="text-4xl mb-3">💥</div>
            <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar bolhas</h2>
            <p className="text-slate-400 text-sm mb-4">{error?.message || 'Tente novamente mais tarde.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-sm hover:shadow-lg transition"
            >
              🔄 Tentar novamente
            </button>
          </div>
        </div>
      </BubbleHUD>
    );
  }

  if (bubbles.length === 0) {
    return (
      <BubbleHUD>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <div className="text-8xl mb-6 animate-bubble-pulse">🫧</div>
            <h2 className="text-2xl font-black text-white mb-2">Nenhum pensamento ainda</h2>
            <p className="text-slate-500 text-sm mb-8">Seja o primeiro a soprar uma ideia na rede</p>
            <button
              onClick={() => navigate('/create')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-base hover:shadow-lg hover:shadow-[#7c3aed]/30 transition-all active:scale-95"
            >
              🫧 Criar primeiro pensamento
            </button>
          </div>
        </div>
      </BubbleHUD>
    );
  }

  // ============================================================
  // RENDER — GRADE RESPONSIVA
  // ============================================================
  return (
    <BubbleHUD>
      <div className="max-w-7xl mx-auto p-6">
        {/* Grade responsiva: 1 → 2 → 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bubbles.map((bubble) => (
            <BubbleCard
              key={bubble._id}
              bubble={bubble}
              userId={user?._id}
              onLike={handleLike}
              onDislike={handleDislike}
              onSopro={handleSopro}
              onDelete={handleDelete}
              onComment={handleComment}
              onOpen={handleOpen}
            />
          ))}
        </div>

        {/* ============================================================
            SENTINEL — Intersection Observer para infinite scroll
            Renderiza um skeleton sutil enquanto carrega próxima página
            ============================================================ */}
        <div ref={ref} className="mt-8">
          {isFetchingNextPage && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-3xl p-6 bg-slate-900/70 border border-slate-800/60 animate-pulse">
                  <div className="h-4 w-24 bg-slate-800 rounded-full mb-4" />
                  <div className="h-6 w-3/4 bg-slate-800 rounded-lg mb-3" />
                  <div className="h-4 w-full bg-slate-800/50 rounded-lg mb-1" />
                  <div className="h-4 w-2/3 bg-slate-800/50 rounded-lg mb-4" />
                  <div className="h-2 w-full bg-slate-800 rounded-full mb-4" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-9 bg-slate-800 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasNextPage && bubbles.length > 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              🫧 Você viu todas as bolhas — por enquanto...
            </div>
          )}
        </div>
      </div>
    </BubbleHUD>
  );
}
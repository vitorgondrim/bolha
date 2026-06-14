// ============================================================
// FEED v3 — MENTE COLETIVA
// Rota: /feed
//
// Conceito: Ambiente imersivo de bolhas flutuando em um
//           espaço orgânico, não um mural de posts.
//
// Características:
//   - Grid masonry/dinâmico com bolhas de tamanhos variados
//   - Bolhas 'quentes' (mais interações) ocupam mais espaço
//   - Border-radius orgânico (formato bolha)
//   - Fundo gradiente com profundidade (blur, opacity)
//   - Hover pulse suave (transition-all duration-500)
//   - Infinite scroll via TanStack Query
// ============================================================

import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBubbles, useBubbleActions } from '../hooks/useBubbles';
import BubbleHUD from '../components/BubbleHUD';
import BubbleCard from '../components/bubbles/BubbleCard';

// ============================================================
// FUNÇÕES AUXILIARES DE HIERARQUIA VISUAL
// ============================================================

/**
 * Calcula o "peso" social de uma bolha baseado no total de interações.
 * Usado para determinar o tamanho do card no grid.
 */
const getBubbleHeat = (bubble) => {
  const likes = bubble.likes?.length || 0;
  const sopros = bubble.sopros?.length || 0;
  const comments = bubble.comments?.length || 0;
  const dislikes = bubble.dislikes?.length || 0;
  return likes + sopros * 1.5 + comments * 0.5 - dislikes * 0.3;
};

/**
 * Determina o span (colunas/linhas) que a bolha deve ocupar no grid.
 * Bolhas mais quentes → maior destaque visual.
 */
const getBubbleSpan = (heat, index) => {
  // Primeira bolha sempre destaque
  if (index === 0 && heat > 3) return 'md:col-span-2 md:row-span-1';

  if (heat >= 10) return 'md:col-span-2 md:row-span-1'; // Super quente
  if (heat >= 5) return 'md:col-span-1 md:row-span-1';  // Quente
  return 'md:col-span-1 md:row-span-1';                  // Normal
};

/**
 * Gera uma cor gradiente baseada no heat index da bolha.
 * Fria → azul/ciano, Quente → roxo/magenta, Super → dourado/laranja
 */
const getBubbleGlow = (heat) => {
  if (heat >= 10) return 'from-[#7c3aed]/5 via-[#3b82f6]/5 to-[#f59e0b]/5';
  if (heat >= 5) return 'from-[#7c3aed]/5 via-[#3b82f6]/5 to-transparent';
  return 'from-[#3b82f6]/5 via-[#06b6d4]/5 to-transparent';
};

/**
 * Escala baseada no heat: bolhas quentes ficam ligeiramente maiores.
 */
const getScale = (heat) => {
  if (heat >= 10) return 'hover:scale-[1.03]';
  if (heat >= 5) return 'hover:scale-[1.02]';
  return 'hover:scale-[1.01]';
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();

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
  // CALCULA HEAT E SPANS — useMemo para não recalcular a cada render
  // ============================================================
  const enrichedBubbles = useMemo(() => {
    return bubbles.map((bubble, index) => {
      const heat = getBubbleHeat(bubble);
      return {
        ...bubble,
        _heat: heat,
        _span: getBubbleSpan(heat, index),
        _glow: getBubbleGlow(heat),
        _scale: getScale(heat),
      };
    });
  }, [bubbles]);

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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl animate-bubble-pulse mb-4">🫧</div>
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto px-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[2rem] bg-slate-900/50 border border-slate-800/30 animate-pulse"
                  style={{
                    width: `${120 + Math.random() * 180}px`,
                    height: `${140 + Math.random() * 160}px`,
                    borderRadius: `${40 + Math.random() * 40}px`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </BubbleHUD>
    );
  }

  if (isError) {
    return (
      <BubbleHUD>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="rounded-[2rem] bg-rose-950/80 border border-rose-600/20 p-10 text-center max-w-md">
            <div className="text-5xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-white mb-2">A mente coletiva está instável</h2>
            <p className="text-slate-400 text-sm mb-6">{error?.message || 'Tente novamente mais tarde.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#7c3aed]/30 transition-all active:scale-95"
            >
              🔄 Reconectar
            </button>
          </div>
        </div>
      </BubbleHUD>
    );
  }

  if (bubbles.length === 0) {
    return (
      <BubbleHUD>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bubble-pulse">🫧</div>
            <h2 className="text-2xl font-black text-white mb-2">A mente coletiva está vazia</h2>
            <p className="text-slate-400 text-sm mb-8">Seja o primeiro a soprar um pensamento no éter</p>
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
  // RENDER — GRID ORGÂNICO (MENTE COLETIVA)
  // ============================================================
  return (
    <BubbleHUD>
      {/* ============================================================
          FUNDO IMERSIVO — Luzes de fundo com blur para profundidade
          ============================================================ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#7c3aed]/8 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#3b82f6]/6 rounded-full blur-[180px]" />
        <div className="absolute top-2/3 left-1/2 w-[400px] h-[400px] bg-[#06b6d4]/4 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-[#f59e0b]/3 rounded-full blur-[120px]" />
      </div>

      {/* ============================================================
          CONTEÚDO — Grid masonry com spans variáveis
          ============================================================ */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-auto">
          {enrichedBubbles.map((bubble) => (
            <div
              key={bubble._id}
              className={`${bubble._span} transition-all duration-500 ease-in-out ${bubble._scale}`}
            >
              {/* Glow de fundo específico da bolha */}
              <div className="relative rounded-[2rem] overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${bubble._glow} rounded-[2rem] pointer-events-none`} />

                {/* Card bolha com border-radius orgânico */}
                <div className="relative rounded-[2rem] bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 overflow-hidden transition-all duration-500 ease-in-out hover:border-[#7c3aed]/40 hover:shadow-lg hover:shadow-[#7c3aed]/10 hover:backdrop-blur-md active:scale-[0.98]">
                  <BubbleCard
                    bubble={bubble}
                    userId={user?._id}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onSopro={handleSopro}
                    onDelete={handleDelete}
                    onComment={handleComment}
                    onOpen={handleOpen}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ============================================================
            SENTINEL — Intersection Observer para infinite scroll
            ============================================================ */}
        <div ref={ref} className="mt-10">
          {isFetchingNextPage && (
            <div className="flex justify-center gap-4 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[2rem] bg-slate-900/40 border border-slate-800/20 animate-pulse"
                  style={{
                    width: `${100 + Math.random() * 120}px`,
                    height: `${100 + Math.random() * 100}px`,
                    borderRadius: `${30 + Math.random() * 30}px`,
                  }}
                />
              ))}
            </div>
          )}

          {!hasNextPage && bubbles.length > 0 && (
            <div className="text-center py-10">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900/60 border border-slate-800/40 text-slate-400 text-sm">
                🫧 Você alcançou a borda da mente coletiva
              </div>
            </div>
          )}
        </div>
      </div>
    </BubbleHUD>
  );
}
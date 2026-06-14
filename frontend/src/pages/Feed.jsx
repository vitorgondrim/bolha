// ============================================================
// FEED v5 — MENTE COLETIVA (CANVAS DE RENDERIZAÇÃO ESPACIAL)
// Rota: /feed
//
// Conceito: Um espaço neural flutuante onde bolhas não são
//           "cards" mas entidades circulares vivas. O layout
//           abandonou flex/grid lineares em favor de um campo
//           gravitacional orgânico com sobreposição, escalas
//           desiguais e animações de flutuação senoidal.
//
// Características:
//   - Space canvas com profundidade (nebulosas + estrelas)
//   - Bolhas circulares (clip-path: circle) sem bg sólido
//   - backdrop-filter: blur(20px) para integração com fundo
//   - Layout gravitacional: heatIndex define tamanho + centro
//   - Animações de floating (senoidal) individuais por bolha
//   - Micro-interações: hover expande/brilha, pulse rítmico
//   - Feed infinito sem scrollbar visível nem "fim de feed"
//   - Intersection Observer para carregamento contínuo
// ============================================================

import { useContext, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBubbles, useBubbleActions } from '../hooks/useBubbles';
import BubbleHUD from '../components/BubbleHUD';
import OrganicBubble from '../components/bubbles/OrganicBubble';

// ============================================================
// FUNÇÕES AUXILIARES DE HIERARQUIA VISUAL ORGÂNICA
// ============================================================

/**
 * Calcula o "peso social" de uma bolha (heat index).
 */
const getBubbleHeat = (bubble) => {
  const likes = bubble.likes?.length || 0;
  const sopros = bubble.sopros?.length || 0;
  const comments = bubble.comments?.length || 0;
  const dislikes = bubble.dislikes?.length || 0;
  return likes + sopros * 1.5 + comments * 0.5 - dislikes * 0.3;
};

/**
 * Computa propriedades espaciais para posicionamento livre:
 *   _scale:        [0.55, 1.45] — bolhas quentes são maiores
 *   _opacity:      [0.20, 1.0]  — bolhas frias são translúcidas
 *   _zIndex:       [0, 100]     — bolhas quentes sobrepõem
 *   _glowIntensity: [0, 1]     — usado no OrganicBubble
 *   _floatDelay:   delay único da animação de flutuação
 *   _driftDelay:   delay para deriva horizontal
 *   _orbit:        posição angular em uma elipse imaginária
 *   _distance:     distância do centro (0=centro, 1=periferia)
 */
const computeSpatialProps = (heat, allHeats, index, total) => {
  const maxHeat = Math.max(...allHeats, 1);
  const normalized = heat / maxHeat; // [0, 1]

  // Bolhas quentes → centro (distance menor), bolhas frias → bordas
  const distance = 0.15 + (1 - normalized) * 0.75;

  // Distribuição angular uniforme em espiral para evitar aglomeração
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
  const orbit = index * goldenAngle;

  // Fator de escala: quentes maiores
  const scale = 0.55 + normalized * 0.9;

  return {
    _heat: heat,
    _scale: scale,
    _opacity: 0.20 + normalized * 0.80,
    _zIndex: Math.round(normalized * 100),
    _glowIntensity: normalized,
    _orbit: orbit,
    _distance: distance,
    _floatDelay: (index % 7) * 0.6,
    _driftDelay: (index % 5) * 1.2,
    _pulseDelay: (index % 9) * 0.3,
  };
};

/**
 * Mapeia intensidade de glow para cor dominante da bolha.
 * Dourado → quente, Roxo → médio, Azul → frio.
 */
const getHeatColor = (intensity) => {
  if (intensity > 0.75) return { rgb: '245, 158, 11', name: 'dourado' };
  if (intensity > 0.45) return { rgb: '124, 58, 237', name: 'roxo' };
  if (intensity > 0.2) return { rgb: '59, 130, 246', name: 'azul' };
  return { rgb: '6, 182, 212', name: 'ciano' };
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const canvasRef = useRef(null);

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

  // Marca o body como feed ativo (remove scrollbar, fundo imersivo)
  useEffect(() => {
    document.body.classList.add('feed-active');
    return () => document.body.classList.remove('feed-active');
  }, []);

  // ============================================================
  // ENRIQUECE BOLHAS COM PROPRIEDADES ESPACIAIS
  // ============================================================
  const enrichedBubbles = useMemo(() => {
    const heats = bubbles.map((b) => getBubbleHeat(b));
    return bubbles.map((bubble, index) => ({
      ...bubble,
      ...computeSpatialProps(heats[index], heats, index, bubbles.length),
      _index: index,
      _color: getHeatColor(heats[index] / Math.max(...heats, 1)),
    }));
  }, [bubbles]);

  // ============================================================
  // HANDLERS MEMOIZADOS
  // ============================================================
  const handleOpen = useCallback(
    (bubbleId) => navigate(`/bubble/${bubbleId}`),
    [navigate]
  );

  const handleLike = useCallback(
    (bubbleId) => {
      try { likeBubble(bubbleId); } catch { toast.error('Erro ao curtir'); }
    },
    [likeBubble, toast]
  );

  const handleDislike = useCallback(
    (bubbleId) => {
      try { dislikeBubble(bubbleId); } catch { toast.error('Erro ao dislikar'); }
    },
    [dislikeBubble, toast]
  );

  const handleSopro = useCallback(
    (bubbleId) => {
      try { soproBubble(bubbleId); } catch { toast.error('Erro ao soprar'); }
    },
    [soproBubble, toast]
  );

  const handleDelete = useCallback(
    (bubbleId) => {
      try { deleteBubble(bubbleId); toast.success('Bolha estourou! 💥'); }
      catch { toast.error('Erro ao deletar'); }
    },
    [deleteBubble, toast]
  );

  const handleComment = useCallback(
    (bubbleId, text) => {
      try { commentOnBubble(bubbleId, text); toast.success('Comentário adicionado!'); }
      catch { toast.error('Erro ao comentar'); }
    },
    [commentOnBubble, toast]
  );

  // ============================================================
  // ESTADOS DE CARREGAMENTO
  // ============================================================
  if (isLoading) {
    return (
      <BubbleHUD>
        {/* Fundo espacial com nebulosas pulsantes */}
        <div className="space-canvas">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#7c3aed]/4 rounded-full blur-[200px] animate-nebula-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3b82f6]/3 rounded-full blur-[180px] animate-nebula-pulse" style={{ animationDelay: '3s' }} />
        </div>

        {/* Bolhas placeholder pulsando como neurônios em formação */}
        <div className="fixed inset-0 flex flex-wrap justify-center items-center content-center gap-5 p-8">
          {Array.from({ length: 12 }).map((_, i) => {
            const size = 80 + Math.random() * 120;
            return (
              <motion.div
                key={i}
                className="rounded-full backdrop-blur-2xl border border-cyan-500/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0.9, 1],
                  opacity: [0, 0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2 + (i % 3) * 0.5,
                  delay: i * 0.15,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                style={{
                  width: size,
                  height: size,
                  backgroundColor: `rgba(124, 58, 237, ${0.03 + (i % 5) * 0.03})`,
                  boxShadow: `0 0 ${30 + i * 10}px rgba(124, 58, 237, ${0.02 + i * 0.01})`,
                }}
              />
            );
          })}

          {/* Texto de loading flutuante sutil */}
          <motion.div
            className="absolute bottom-1/3 left-1/2 -translate-x-1/2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-xs font-mono text-slate-600 tracking-[0.3em] uppercase">
              sincronizando mente coletiva...
            </span>
          </motion.div>
        </div>
      </BubbleHUD>
    );
  }

  if (isError) {
    return (
      <BubbleHUD>
        <div className="space-canvas" />
        <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="rounded-full w-80 h-80 bg-slate-950/30 backdrop-blur-2xl border border-rose-600/20 flex flex-col items-center justify-center text-center p-10 shadow-xl shadow-rose-500/5"
            style={{
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
            }}
          >
            <div className="text-5xl mb-4 animate-bubble-pulse">💥</div>
            <h2 className="text-xl font-bold text-white mb-2">A mente coletiva está instável</h2>
            <p className="text-slate-500 text-sm mb-6">{error?.message || 'Distorção na rede neural. Tente reconectar.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#7c3aed]/30 transition-all active:scale-95"
            >
              🔄 Reconectar ao éter
            </button>
          </motion.div>
        </div>
      </BubbleHUD>
    );
  }

  if (bubbles.length === 0) {
    return (
      <BubbleHUD>
        <div className="space-canvas" />
        <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center"
          >
            <div className="text-8xl mb-6 animate-bubble-pulse">🫧</div>
            <h2 className="text-2xl font-black text-white mb-2">A mente coletiva está vazia</h2>
            <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
              O éter aguarda seu primeiro pensamento. Seja o pioneiro.
            </p>
            <button
              onClick={() => navigate('/create')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-base hover:shadow-lg hover:shadow-[#7c3aed]/30 transition-all active:scale-95"
            >
              🫧 Soprar primeiro pensamento
            </button>
          </motion.div>
        </div>
      </BubbleHUD>
    );
  }

  // ============================================================
  // RENDER — CANVAS ESPACIAL (MENTE COLETIVA)
  // ============================================================
  return (
    <BubbleHUD>
      {/* ============================================================
          FUNDO CÓSMICO — Canvas espacial com estrelas e nebulosas
          ============================================================ */}
      <div className="space-canvas">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#7c3aed]/4 rounded-full blur-[250px] animate-nebula-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-[#3b82f6]/3 rounded-full blur-[220px] animate-nebula-pulse" style={{ animationDuration: '15s', animationDelay: '4s' }} />
        <div className="absolute top-2/3 left-1/3 w-[500px] h-[500px] bg-[#06b6d4]/2 rounded-full blur-[180px] animate-nebula-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#f59e0b]/2 rounded-full blur-[150px] animate-nebula-pulse" style={{ animationDuration: '18s', animationDelay: '6s' }} />
      </div>

      {/* ============================================================
          CAMPO DE CONSTELAÇÃO — Bolhas posicionadas por gravidade
          ============================================================ */}
      <div
        ref={canvasRef}
        className="relative z-10 w-screen h-screen overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence mode="popLayout">
          {enrichedBubbles.map((bubble) => {
            // Posicionamento orbital: as bolhas mais quentes flutuam
            // mais ao centro, as frias na periferia
            const centerX = 50; // % da viewport
            const centerY = 45; // % da viewport (levemente acima do centro)
            const orbitX = Math.cos(bubble._orbit) * bubble._distance * 38;
            const orbitY = Math.sin(bubble._orbit) * bubble._distance * 28;

            return (
              <motion.div
                key={bubble._id}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: bubble._scale,
                  opacity: bubble._opacity,
                  left: `calc(${centerX}% + ${orbitX}%)`,
                  top: `calc(${centerY}% + ${orbitY}%)`,
                  x: '-50%',
                  y: '-50%',
                }}
                exit={{
                  scale: 0,
                  opacity: 0,
                  transition: { duration: 0.6, ease: 'easeInOut' },
                }}
                transition={{
                  layout: {
                    type: 'spring',
                    stiffness: 60,
                    damping: 15,
                  },
                  scale: { duration: 1.0, ease: [0.34, 1.56, 0.64, 1] },
                  opacity: { duration: 0.8 },
                  left: { duration: 1.2, ease: 'easeOut' },
                  top: { duration: 1.2, ease: 'easeOut' },
                }}
                className="absolute will-change-transform"
                style={{ zIndex: bubble._zIndex }}
              >
                {/* Bolha com flutuação individual (senoidal 3D) */}
                <motion.div
                  className="relative"
                  animate={{
                    y: [0, -10, 0, -6, 0],
                    rotate: [0, 0.5, 0, -0.3, 0],
                  }}
                  transition={{
                    y: {
                      duration: 5 + (bubble._index % 4) * 1.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: bubble._floatDelay,
                    },
                    rotate: {
                      duration: 8 + (bubble._index % 6) * 0.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: bubble._driftDelay,
                    },
                  }}
                >
                  {/* Anel de sinalização para bolhas muito quentes */}
                  {bubble._glowIntensity > 0.7 && (
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0, 0.3],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: bubble._index * 0.2,
                      }}
                      style={{
                        boxShadow: `0 0 15px rgba(${bubble._color.rgb}, 0.3)`,
                      }}
                    />
                  )}

                  <OrganicBubble
                    bubble={bubble}
                    userId={user?._id}
                    glowIntensity={bubble._glowIntensity}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onSopro={handleSopro}
                    onDelete={handleDelete}
                    onComment={handleComment}
                    onOpen={handleOpen}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ============================================================
            SENTINEL — Intersection Observer (invisível, no centro
            inferior do canvas para detectar necessidade de carga)
            ============================================================ */}
        <div
          ref={ref}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1"
          style={{ opacity: 0 }}
        />

        {/* Loading state sutil para próxima página */}
        {isFetchingNextPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/60 backdrop-blur-xl border border-cyan-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-[10px] font-mono text-slate-500 tracking-[0.25em] uppercase">
                emergindo bolhas do éter...
              </span>
            </div>
          </motion.div>
        )}

        {/* ============================================================
            SEM "fim de feed" — a constelação simplesmente se expande
            ============================================================ */}
      </div>
    </BubbleHUD>
  );
}

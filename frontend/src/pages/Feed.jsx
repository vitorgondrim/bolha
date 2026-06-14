// ============================================================
// FEED v6 — MENTE COLETIVA (GESTÃO DE DENSIDADE ESPACIAL)
// Rota: /feed
//
// Conceito: Canvas neural com bolhas vivas, porém com
//           inteligência de densidade para evitar poluição
//           visual conforme o volume cresce.
//
// Módulos de densidade:
//   1. GRAVIDADE: heatIndex dita distância do centro
//   2. CIRCLE PACKING: verificação de colisão entre bolhas
//   3. PROFUNDIDADE: blur() variável por distância do centro
//   4. RENDERIZAÇÃO DE JANELA: oculta bolhas frias quando > X
//
// Características:
//   - Space canvas com nebulosas + estrelas
//   - Bolhas com backdrop-filter: blur sem bg sólido
//   - Layout gravitacional com verificação anti-colisão
//   - Blur de profundidade (periferia borrada)
//   - Corte de densidade (maxBubblesVisible)
//   - Feed infinito sem scrollbar visível
// ============================================================

import { useContext, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBubbles, useBubbleActions } from '../hooks/useBubbles';
import BubbleHUD from '../components/BubbleHUD';
import OrganicBubble from '../components/bubbles/OrganicBubble';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES DE DENSIDADE
// ═══════════════════════════════════════════════════════════════

/** Número máximo de bolhas visíveis no canvas antes de podar */
const MAX_BUBBLES_VISIBLE = 80;

/** Distância mínima entre centros de bolha (fração do raio viewport) */
const COLLISION_PADDING_FACTOR = 0.022;

/** Intensidade máxima de blur na periferia (pixels) */
const MAX_DEPTH_BLUR = 6;

/** Fator de escala mínimo na periferia */
const MIN_PERIPHERY_SCALE = 0.35;

/** Raio das camadas de anéis concêntricos para distribuição */
const RING_LAYERS = 5;

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES DE HIERARQUIA VISUAL ORGÂNICA
// ═══════════════════════════════════════════════════════════════

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
 * Gera ângulos均匀 em espiral de Fibonacci (golden angle)
 * para distribuir N pontos em um círculo sem aglomeração.
 */
const generateFibonacciOrbits = (count) => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
  const orbits = [];
  for (let i = 0; i < count; i++) {
    orbits.push(i * goldenAngle);
  }
  return orbits;
};

/**
 * Detecção de colisão simples entre duas bolhas.
 * Retorna true se os círculos estiverem sobrepostos (com padding).
 */
const circlesOverlap = (x1, y1, r1, x2, y2, r2) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (r1 + r2) * (1 + COLLISION_PADDING_FACTOR);
};

/**
 * Circle Packing: realoca bolhas que colidem.
 * Recebe um array de { x, y, radius } e retorna posições realocadas.
 *
 * Estratégia:
 *   - Bolhas mais quentes (maiores) são posicionadas primeiro
 *   - Se uma bolha colide, tenta-se deslocar radialmente para fora
 *   - Se mesmo assim colidir, move-se para o próximo anel
 */
const resolveCollisions = (bubbles) => {
  if (bubbles.length <= 1) return bubbles;

  // Ordena por raio (maiores primeiro) para que bolhas grandes
  // ditem a posição e as pequenas se ajustem
  const sorted = [...bubbles].sort((a, b) => b.radius - a.radius);

  const placed = [];

  for (const bubble of sorted) {
    let { x, y } = bubble;
    const r = bubble.radius;
    let collides = false;
    let attempts = 0;
    const maxAttempts = 30;

    // Tenta realocar até não colidir ou estourar tentativas
    do {
      collides = false;
      for (const placedBubble of placed) {
        if (circlesOverlap(x, y, r, placedBubble.x, placedBubble.y, placedBubble.radius)) {
          collides = true;
          break;
        }
      }

      if (collides) {
        // Desloca radialmente para fora (aumenta distância do centro)
        const angle = Math.atan2(y, x);
        const currentDist = Math.sqrt(x * x + y * y);
        const newDist = currentDist + currentDist * 0.15 + r * 0.3;
        x = Math.cos(angle) * newDist;
        y = Math.sin(angle) * newDist;
        attempts++;
      }
    } while (collides && attempts < maxAttempts);

    placed.push({ ...bubble, x, y });
  }

  return placed;
};

/**
 * Computa propriedades espaciais — GRAVIDADE + COLISÃO + PROFUNDIDADE
 *
 * Retorna:
 *   _scale, _opacity, _zIndex, _glowIntensity
 *   _orbit, _distance
 *   _depthBlur: blur em px baseado na distância do centro
 *   _posX, _posY: posição final em % da viewport (após circle packing)
 *   _visible: se a bolha deve ser renderizada (janela de densidade)
 */
const computeSpatialProps = (allBubbles, heats, maxBubbles) => {
  const maxHeat = Math.max(...heats, 1);
  const total = allBubbles.length;

  // ─── 1. Calcular heat normalizado e propriedades base ───
  const rawProps = allBubbles.map((bubble, index) => {
    const heat = heats[index];
    const normalized = heat / maxHeat; // [0, 1]

    // GRAVIDADE: bolhas quentes → centro, frias → periferia
    const distance = 0.10 + Math.pow(1 - normalized, 1.5) * 0.80;

    // Distribuição angular usando Fibonacci (mais natural que espiral simples)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const orbit = index * goldenAngle;

    // Escala base
    const scale = 0.50 + normalized * 1.0;

    // Raio em % da viewport (inferido da escala)
    const radius = (0.50 + normalized * 0.70) * 5;

    // Posição inicial no círculo (antes de circle packing)
    const centerX = 50;
    const centerY = 45;
    const rawX = Math.cos(orbit) * distance * 38;
    const rawY = Math.sin(orbit) * distance * 28;

    // PROFUNDIDADE: blur aumenta com a distância do centro
    const distFromCenter = Math.sqrt(rawX * rawX + rawY * rawY) / 38; // normalizado [0,1]
    const depthBlur = Math.pow(distFromCenter, 1.8) * MAX_DEPTH_BLUR;

    // Opacidade: cai com a distância (bolhas frias + distantes = mais transparentes)
    const distanceOpacity = 1.0 - Math.pow(distFromCenter, 1.5) * 0.6;
    const opacity = (0.25 + normalized * 0.75) * distanceOpacity;

    // Escala com profundidade: periferia encolhe
    const depthScale = 1.0 - Math.pow(distFromCenter, 2) * (1 - MIN_PERIPHERY_SCALE);
    const finalScale = scale * depthScale;

    return {
      _id: bubble._id,
      _heat: heat,
      _scale: finalScale,
      _opacity: opacity,
      _zIndex: Math.round(normalized * 100),
      _glowIntensity: normalized,
      _distance: distance,
      _orbit: orbit,
      _depthBlur: depthBlur,
      _index: index,
      _color: getHeatColor(normalized),
      // Posição em coordenadas de viewport (%) para circle packing
      x: rawX,
      y: rawY,
      radius: radius * depthScale,
      _rawX: rawX,
      _rawY: rawY,
      _floatDelay: (index % 7) * 0.6,
      _driftDelay: (index % 5) * 1.2,
    };
  });

  // ─── 2. CIRCLE PACKING: resolver colisões ───
  const resolvedPositions = resolveCollisions(rawProps);

  // ─── 3. RENDERIZAÇÃO DE JANELA: podar bolhas frias se > MAX ───
  let visibleCount = resolvedPositions.length;
  let hiddenThreshold = -1; // abaixo deste heat, esconde

  if (resolvedPositions.length > MAX_BUBBLES_VISIBLE) {
    // Ordena por heat para encontrar o threshold
    const sortedByHeat = [...resolvedPositions].sort((a, b) => b._heat - a._heat);
    hiddenThreshold = sortedByHeat[MAX_BUBBLES_VISIBLE - 1]._heat;
    visibleCount = MAX_BUBBLES_VISIBLE;
  }

  // ─── 4. Montar resultado final ───
  return resolvedPositions.map((item) => {
    // Posição final em % da viewport (com translate -50%)
    const posX = 50 + item.x;
    const posY = 45 + item.y;

    // Visibilidade: se heat está abaixo do threshold, oculta
    const visible = hiddenThreshold < 0 || item._heat >= hiddenThreshold;

    return {
      ...item,
      _posX: posX,
      _posY: posY,
      _visible: visible,
      _hiddenThreshold: hiddenThreshold,
      _totalVisible: visibleCount,
      _totalBubbles: resolvedPositions.length,
    };
  });
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

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const canvasRef = useRef(null);

  // Estado para controlar a densidade (pode ser ajustado dinamicamente)
  const [maxVisible, setMaxVisible] = useState(MAX_BUBBLES_VISIBLE);

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

  // ═══════════════════════════════════════════════════════════════
  // ENRIQUECE BOLHAS COM GESTÃO DE DENSIDADE
  // ═══════════════════════════════════════════════════════════════
  const { visibleBubbles, hiddenCount, densityInfo } = useMemo(() => {
    const heats = bubbles.map((b) => getBubbleHeat(b));
    const enriched = computeSpatialProps(bubbles, heats, maxVisible);

    const visible = enriched.filter((b) => b._visible);
    const hidden = enriched.length - visible.length;

    return {
      visibleBubbles: visible,
      hiddenCount: hidden,
      densityInfo: {
        total: enriched.length,
        visible: visible.length,
        hidden: hidden,
        threshold: visible.length > 0 ? visible[visible.length - 1]._heat : 0,
      },
    };
  }, [bubbles, maxVisible]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS MEMOIZADOS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS DE CARREGAMENTO
  // ═══════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <BubbleHUD>
        <div className="space-canvas">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#7c3aed]/4 rounded-full blur-[200px] animate-nebula-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3b82f6]/3 rounded-full blur-[180px] animate-nebula-pulse" style={{ animationDelay: '3s' }} />
        </div>

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

  // ═══════════════════════════════════════════════════════════════
  // RENDER — CANVAS ESPACIAL COM GESTÃO DE DENSIDADE
  // ═══════════════════════════════════════════════════════════════
  return (
    <BubbleHUD>
      {/* ─── FUNDO CÓSMICO ─── */}
      <div className="space-canvas">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#7c3aed]/4 rounded-full blur-[250px] animate-nebula-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-[#3b82f6]/3 rounded-full blur-[220px] animate-nebula-pulse" style={{ animationDuration: '15s', animationDelay: '4s' }} />
        <div className="absolute top-2/3 left-1/3 w-[500px] h-[500px] bg-[#06b6d4]/2 rounded-full blur-[180px] animate-nebula-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#f59e0b]/2 rounded-full blur-[150px] animate-nebula-pulse" style={{ animationDuration: '18s', animationDelay: '6s' }} />
      </div>

      {/* ─── CAMPO DE CONSTELAÇÃO ─── */}
      <div
        ref={canvasRef}
        className="relative z-10 w-screen h-screen overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence mode="popLayout">
          {visibleBubbles.map((bubble) => (
            <motion.div
              key={bubble._id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: bubble._scale,
                opacity: bubble._opacity,
                left: `${bubble._posX}%`,
                top: `${bubble._posY}%`,
                x: '-50%',
                y: '-50%',
                // PROFUNDIDADE: blur variável por distância do centro
                filter: `blur(${bubble._depthBlur}px)`,
              }}
              exit={{
                scale: 0,
                opacity: 0,
                filter: 'blur(0px)',
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
                filter: { duration: 1.0, ease: 'easeOut' },
              }}
              className="absolute will-change-transform"
              style={{ zIndex: bubble._zIndex }}
            >
              {/* Flutuação individual (senoidal 3D) */}
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
          ))}
        </AnimatePresence>

        {/* ─── INDICADOR DE DENSIDADE (visível só quando > MAX) ─── */}
        {densityInfo.hidden > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-xl border border-slate-700/30 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-[10px] font-mono text-slate-400 tracking-tight">
                {densityInfo.total} bolhas · mostrando {densityInfo.visible} · 
                <span className="text-slate-500"> {densityInfo.hidden} ocultas por densidade</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── SENTINEL — Intersection Observer ─── */}
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

        {/* ─── SEM "fim de feed" — a constelação se expande infinitamente ─── */}
      </div>
    </BubbleHUD>
  );
}

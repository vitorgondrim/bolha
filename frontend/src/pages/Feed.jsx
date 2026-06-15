// ============================================================
// FEED v7 — MENTE COLETIVA (GESTÃO DE DENSIDADE + REACT-WINDOW)
// Rota: /feed
//
// Conceito: Canvas neural com bolhas vivas, com virtualização
//           via react-window (FixedSizeList) para reduzir DOM.
//
// Módulos de densidade:
//   1. GRAVIDADE: heatIndex dita distância do centro
//   2. CIRCLE PACKING: verificação de colisão entre bolhas
//   3. PROFUNDIDADE: blur() variável por distância do centro
//   4. RENDERIZAÇÃO DE JANELA: oculta bolhas frias quando > X
//
// Virtualização:
//   - FixedSizeList gerencia o DOM, renderizando apenas itens
//     próximos ao viewport (overscanCount)
//   - Cada item é posicionado absolutamente via coords espaciais
// ============================================================

import { useContext, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { List } from 'react-window';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBubbles, useBubbleActions } from '../hooks/useBubbles';
import useHapticFeedback from '../hooks/useHapticFeedback';
import BubbleHUD from '../components/BubbleHUD';
import OrganicBubble from '../components/bubbles/OrganicBubble';
import { ConnectionLines, useSoproTrails, SoproTrailRenderer } from '../components/effects/SoproRippleEffect';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES DE DENSIDADE
// ═══════════════════════════════════════════════════════════════

/** Número máximo de bolhas visíveis no canvas antes de podar */
const MAX_BUBBLES_VISIBLE = 80;

/** Calcula capacidade máxima baseada no viewport */
const getMaxByViewport = () => {
  if (typeof window === 'undefined') return MAX_BUBBLES_VISIBLE;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const viewportArea = width * height;
  // Cada bolha ocupa ~120x120px, densidade máxima de 15% da tela
  const bubbleArea = 120 * 120;
  const maxDensity = 0.15;
  return Math.min(MAX_BUBBLES_VISIBLE, Math.floor((viewportArea * maxDensity) / bubbleArea));
};

/** Distância mínima entre centros de bolha (fração do raio viewport) */
const COLLISION_PADDING_FACTOR = 0.022;

/** Intensidade máxima de blur na periferia (pixels) */
const MAX_DEPTH_BLUR = 6;

/** Fator de escala mínimo na periferia */
const MIN_PERIPHERY_SCALE = 0.35;

/** Altura fixa de cada item no FixedSizeList (px) */
const LIST_ITEM_SIZE = 120;

/** Overscan: quantos itens acima/abaixo do viewport manter no DOM */
const OVERSCAN_COUNT = 8;

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
 */
const resolveCollisions = (bubbles) => {
  if (bubbles.length <= 1) return bubbles;

  const sorted = [...bubbles].sort((a, b) => b.radius - a.radius);
  const placed = [];

  for (const bubble of sorted) {
    let { x, y } = bubble;
    const r = bubble.radius;
    let collides = false;
    let attempts = 0;
    const maxAttempts = 30;

    do {
      collides = false;
      for (const placedBubble of placed) {
        if (circlesOverlap(x, y, r, placedBubble.x, placedBubble.y, placedBubble.radius)) {
          collides = true;
          break;
        }
      }

      if (collides) {
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
 */
const computeSpatialProps = (allBubbles, heats, maxBubbles) => {
  const maxHeat = Math.max(...heats, 1);

  const rawProps = allBubbles.map((bubble, index) => {
    const heat = heats[index];
    const normalized = heat / maxHeat;

    const distance = 0.10 + Math.pow(1 - normalized, 1.5) * 0.80;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const orbit = index * goldenAngle;
    const scale = 0.50 + normalized * 1.0;
    const radius = (0.50 + normalized * 0.70) * 5;

    const centerX = 50;
    const centerY = 45;
    const rawX = Math.cos(orbit) * distance * 38;
    const rawY = Math.sin(orbit) * distance * 28;

    const distFromCenter = Math.sqrt(rawX * rawX + rawY * rawY) / 38;
    const depthBlur = Math.pow(distFromCenter, 1.8) * MAX_DEPTH_BLUR;

    const distanceOpacity = 1.0 - Math.pow(distFromCenter, 1.5) * 0.6;
    const opacity = (0.25 + normalized * 0.75) * distanceOpacity;

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
      x: rawX,
      y: rawY,
      radius: radius * depthScale,
      _rawX: rawX,
      _rawY: rawY,
      _floatDelay: (index % 7) * 0.6,
      _driftDelay: (index % 5) * 1.2,
    };
  });

  const resolvedPositions = resolveCollisions(rawProps);

  let visibleCount = resolvedPositions.length;
  let hiddenThreshold = -1;

  if (resolvedPositions.length > maxBubbles) {
    const sortedByHeat = [...resolvedPositions].sort((a, b) => b._heat - a._heat);
    hiddenThreshold = sortedByHeat[maxBubbles - 1]._heat;
    visibleCount = maxBubbles;
  }

  return resolvedPositions.map((item) => {
    const posX = 50 + item.x;
    const posY = 45 + item.y;
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
 */
const getHeatColor = (intensity) => {
  if (intensity > 0.75) return { rgb: '245, 158, 11', name: 'dourado' };
  if (intensity > 0.45) return { rgb: '124, 58, 237', name: 'roxo' };
  if (intensity > 0.2) return { rgb: '59, 130, 246', name: 'azul' };
  return { rgb: '6, 182, 212', name: 'ciano' };
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE DE ITEM — renderizado pelo react-window
// ═══════════════════════════════════════════════════════════════

const BubbleItem = ({ bubble, style, user, onLike, onDislike, onSopro, onDelete, onComment, onOpen }) => {
  // Atenção periférica do mouse: bolhas perto do cursor recebem boost
  const [mouseAttention, setMouseAttention] = useState(0);

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: bubble._scale * (1 + mouseAttention * 0.05),
        opacity: bubble._opacity + mouseAttention * 0.2,
        left: `${bubble._posX}%`,
        top: `${bubble._posY}%`,
        x: '-50%',
        y: '-50%',
        filter: `blur(${bubble._depthBlur * (1 - mouseAttention * 0.5)}px)`,
      }}
      exit={{
        scale: 0,
        opacity: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.6, ease: 'easeInOut' },
      }}
      transition={{
        layout: { type: 'spring', stiffness: 60, damping: 15 },
        scale: { duration: 1.0, ease: [0.34, 1.56, 0.64, 1] },
        opacity: { duration: 0.8 },
        left: { duration: 1.2, ease: 'easeOut' },
        top: { duration: 1.2, ease: 'easeOut' },
        filter: { duration: 0.6, ease: 'easeOut' },
      }}
      className="absolute will-change-transform"
      style={{ zIndex: bubble._zIndex, ...style }}
    >
      <motion.div className="relative">
        <OrganicBubble
          bubble={bubble}
          userId={user?._id}
          glowIntensity={bubble._glowIntensity}
          onLike={onLike}
          onDislike={onDislike}
          onSopro={onSopro}
          onDelete={onDelete}
          onComment={onComment}
          onOpen={onOpen}
        />
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const haptic = useHapticFeedback();
  const canvasRef = useRef(null);
  const listRef = useRef(null);
  const { trails, spawnTrail } = useSoproTrails();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [maxVisible, setMaxVisible] = useState(MAX_BUBBLES_VISIBLE);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  // Atualiza viewportHeight e densidade máxima no resize
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setMaxVisible(getMaxByViewport());
    };
    handleResize(); // calcula no mount também
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rastreia posição do mouse para efeitos de atenção periférica
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      try {
        likeBubble(bubbleId);
        haptic.like();
      } catch { toast.error('Erro ao curtir'); }
    },
    [likeBubble, toast, haptic]
  );

  const handleDislike = useCallback(
    (bubbleId) => {
      try {
        dislikeBubble(bubbleId);
        haptic.dislike();
      } catch { toast.error('Erro ao dislikar'); }
    },
    [dislikeBubble, toast, haptic]
  );

  const handleSopro = useCallback(
    (bubbleId) => {
      try {
        soproBubble(bubbleId);
        haptic.sopro();
        // Cria trail visual de partículas de ar
        const hudEl = document.querySelector('.sopro-hud');
        if (hudEl) {
          const hudRect = hudEl.getBoundingClientRect();
          spawnTrail(hudRect.right, hudRect.top, mousePos.x, mousePos.y);
        }
      } catch { toast.error('Erro ao soprar'); }
    },
    [soproBubble, toast, haptic, spawnTrail, mousePos]
  );

  const handleDelete = useCallback(
    (bubbleId) => {
      try {
        deleteBubble(bubbleId);
        haptic.pop();
        toast.success('Bolha estourou! 💥');
      } catch { toast.error('Erro ao deletar'); }
    },
    [deleteBubble, toast, haptic]
  );

  const handleComment = useCallback(
    (bubbleId, text) => {
      try { commentOnBubble(bubbleId, text); toast.success('Comentário adicionado!'); }
      catch { toast.error('Erro ao comentar'); }
    },
    [commentOnBubble, toast]
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER — ITEM DO REACT-WINDOW (wrapper com props do contexto)
  // ═══════════════════════════════════════════════════════════════
  const Row = useCallback(({ index, style }) => {
    const bubble = visibleBubbles[index];
    if (!bubble) return null;

    return (
      <BubbleItem
        bubble={bubble}
        style={style}
        user={user}
        onLike={handleLike}
        onDislike={handleDislike}
        onSopro={handleSopro}
        onDelete={handleDelete}
        onComment={handleComment}
        onOpen={handleOpen}
      />
    );
  }, [visibleBubbles, user, handleLike, handleDislike, handleSopro, handleDelete, handleComment, handleOpen]);

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
  // RENDER — CANVAS ESPACIAL COM REACT-WINDOW (FIXEDSIZELIST)
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

      {/* ─── CAMPO DE CONSTELAÇÃO (REACT-WINDOW) ─── */}
      <div
        ref={canvasRef}
        className="relative z-10 w-screen h-screen overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        {/* ─── CONEXÕES NEURAIS (SVG) — fios entre bolhas que o usuário interagiu ─── */}
        <ConnectionLines bubbles={visibleBubbles} userId={user?._id} />

        {/* ─── SOPRO TRAIL — partículas de ar viajando do HUD até a bolha ─── */}
        <SoproTrailRenderer trails={trails} />

        <AnimatePresence mode="popLayout">
          <List
            ref={listRef}
            height={viewportHeight}
            width="100%"
            itemCount={visibleBubbles.length}
            itemSize={LIST_ITEM_SIZE}
            overscanCount={OVERSCAN_COUNT}
            style={{ overflow: 'visible' }}
            className="absolute inset-0"
          >
            {Row}
          </List>
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
      </div>
    </BubbleHUD>
  );
}
// ============================================================
// BUBBLE MAP 🫧 - Mapa de pensamentos (Agar.io style)
// TELA INTEIRA - sem bordas, sem cards, sem limites
//
// Cada bolha = um pensamento/topico.
// Tamanho = numero de pessoas conectadas.
// Proximidade = mesmo assunto.
//
// Interacoes MELHORADAS:
//   - Arrastar o fundo = navegar (delay 100ms para distinguir click)
//   - Scroll = zoom
//   - Hover na bolha = destaque (via CSS nativo)
//   - Clique na bolha = abrir
// ============================================================

import { useState, useEffect, useRef, useMemo, useCallback, useContext } from "react";
import { TimeContext } from "../context/TimeContext";

const CORES = [
  { bg: "from-cyan-400/90 to-blue-500/90", border: "border-cyan-300/70", glow: "shadow-cyan-400/50" },
  { bg: "from-lime-400/90 to-emerald-500/90", border: "border-lime-300/70", glow: "shadow-lime-400/50" },
  { bg: "from-purple-400/90 to-pink-500/90", border: "border-purple-300/70", glow: "shadow-purple-400/50" },
  { bg: "from-rose-400/90 to-red-500/90", border: "border-rose-300/70", glow: "shadow-rose-400/50" },
  { bg: "from-amber-400/90 to-orange-500/90", border: "border-amber-300/70", glow: "shadow-amber-400/50" },
  { bg: "from-teal-400/90 to-cyan-500/90", border: "border-teal-300/70", glow: "shadow-teal-400/50" },
  { bg: "from-indigo-400/90 to-violet-500/90", border: "border-indigo-300/70", glow: "shadow-indigo-400/50" },
  { bg: "from-pink-400/90 to-rose-500/90", border: "border-pink-300/70", glow: "shadow-pink-400/50" },
];

const ASSUNTOS = [
  "Geral", "Tecnologia", "Esportes", "Musica", "Cinema",
  "Politica", "Ciencia", "Arte", "Jogos", "Livros",
];

// Distancia minima para considerar arrasto (evita drag em clique)
const DRAG_THRESHOLD = 5;

export default function BubbleMap({ bubbles, onBubbleClick }) {
  const { timeNow } = useContext(TimeContext);
  const containerRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dimensoes, setDimensoes] = useState({ w: 800, h: 600 });

  // Refs para controle de drag (sem re-render)
  const dragStartPos = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const isPointerDown = useRef(false);

  const bubblesRef = useRef([]);
  const animFrameRef = useRef(null);

  // Estado reativo APENAS para hover (para efeito visual)
  const [hoveredId, setHoveredId] = useState(null);

  // Atualizar dimensoes da tela
  useEffect(() => {
    const atualizar = () => {
      if (containerRef.current) {
        setDimensoes({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        });
      }
    };
    atualizar();
    window.addEventListener("resize", atualizar);
    return () => window.removeEventListener("resize", atualizar);
  }, []);

  // Inicializar posicoes
  useEffect(() => {
    bubblesRef.current = bubbles.map((b, i) => {
      const angle = (i * 137.508) % 360;
      const rad = (angle * Math.PI) / 180;
      const radius = 120 + Math.random() * 200;
      const cx = dimensoes.w / 2;
      const cy = dimensoes.h / 2;
      return {
        id: b._id,
        x: cx + Math.cos(rad) * radius,
        y: cy + Math.sin(rad) * radius,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      };
    });
  }, [bubbles, dimensoes]);

  // Loop de animacao
  useEffect(() => {
    if (bubbles.length === 0) return;
    let running = true;

    const animate = () => {
      if (!running) return;
      const bRefs = bubblesRef.current;

      for (const b of bRefs) {
        b.vx += (Math.random() - 0.5) * 0.01;
        b.vy += (Math.random() - 0.5) * 0.01;
        b.vx *= 0.985;
        b.vy *= 0.985;

        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > 0.3) {
          b.vx = (b.vx / speed) * 0.3;
          b.vy = (b.vy / speed) * 0.3;
        }

        b.x += b.vx;
        b.y += b.vy;

        const margin = 100;
        b.x = Math.max(-margin, Math.min(dimensoes.w + margin, b.x));
        b.y = Math.max(-margin, Math.min(dimensoes.h + margin, b.y));
      }

      // Repulsao
      for (let i = 0; i < bRefs.length; i++) {
        for (let j = i + 1; j < bRefs.length; j++) {
          const a = bRefs[i];
          const b2 = bRefs[j];
          const bubbleA = bubbles.find((bb) => bb._id === a.id);
          const bubbleB = bubbles.find((bb) => bb._id === b2.id);
          if (!bubbleA || !bubbleB) continue;

          const conexA = (bubbleA.likes?.length || 0) + (bubbleA.sopros?.length || 0);
          const conexB = (bubbleB.likes?.length || 0) + (bubbleB.sopros?.length || 0);
          const raioA = Math.sqrt(conexA + 1) * 20 + 30;
          const raioB = Math.sqrt(conexB + 1) * 20 + 30;
          const dx = b2.x - a.x;
          const dy = b2.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = raioA + raioB + 15;

          if (dist < minDist && dist > 0) {
            const force = (minDist - dist) / minDist;
            const fx = (dx / dist) * force * 0.4;
            const fy = (dy / dist) * force * 0.4;
            const pesoA = raioA / (raioA + raioB);
            const pesoB = 1 - pesoA;
            a.x -= fx * pesoB;
            a.y -= fy * pesoB;
            b2.x += fx * pesoA;
            b2.y += fy * pesoA;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [bubbles, dimensoes]);

  // Ordenar (maiores atras)
  const sortedBubbles = useMemo(() => {
    return [...bubbles].sort((a, b) => {
      const aC = (a.likes?.length || 0) + (a.sopros?.length || 0);
      const bC = (b.likes?.length || 0) + (b.sopros?.length || 0);
      return aC - bC;
    });
  }, [bubbles]);

  // ============================================================
  // EVENTOS DO MOUSE - Mouse Events nativos (mais precisos)
  // ============================================================

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.2, Math.min(4, z * delta)));
  }, []);

  // Mouse Down
  const handleMouseDown = useCallback((e) => {
    isPointerDown.current = true;
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = { ...offset };
  }, [offset]);

  // Mouse Move
  const handleMouseMove = useCallback((e) => {
    if (!isPointerDown.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > DRAG_THRESHOLD) {
      hasDragged.current = true;
      setOffset({
        x: offsetAtDragStart.current.x + dx,
        y: offsetAtDragStart.current.y + dy,
      });
    }
  }, []);

  // Mouse Up
  const handleMouseUp = useCallback(() => {
    isPointerDown.current = false;
  }, []);

  // Click nas bolhas (onClick do button)
  const handleBubbleClick = useCallback((bubbleId, e) => {
    e.stopPropagation();
    // So abre se NAO moveu o mouse (distancia de drag)
    if (!hasDragged.current) {
      onBubbleClick?.(bubbleId);
    }
    // Reseta para o proximo clique
    hasDragged.current = false;
  }, [onBubbleClick]);

  // Hover
  const handleMouseEnterBubble = useCallback((bubbleId) => {
    setHoveredId(bubbleId);
  }, []);

  const handleMouseLeaveBubble = useCallback(() => {
    setHoveredId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 overflow-hidden"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Fundo com pontos */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #00f0ff 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          opacity: 0.04,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      />

      {/* Luzes de fundo */}
      <div
        className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/4 rounded-full blur-[200px] pointer-events-none"
        style={{ transform: `translate(${offset.x * 0.3}px, ${offset.y * 0.3}px)` }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-lime-500/3 rounded-full blur-[200px] pointer-events-none"
        style={{ transform: `translate(${offset.x * 0.3}px, ${offset.y * 0.3}px)` }}
      />

      {/* Container transform */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {sortedBubbles.map((bubble) => {
          const pos = bubblesRef.current.find((b) => b.id === bubble._id);
          if (!pos) return null;

          const conexoes = (bubble.likes?.length || 0) + (bubble.sopros?.length || 0);
          const raio = Math.sqrt(conexoes + 1) * 20 + 30;
          const tamanho = raio * 2;

          const assuntoIdx = ASSUNTOS.indexOf(bubble.subject || "Geral");
          const cor = CORES[assuntoIdx >= 0 ? assuntoIdx % CORES.length : 0];

          const tempoRestante = new Date(bubble.expiresAt).getTime() - timeNow;
          const totalMs = new Date(bubble.expiresAt).getTime() - new Date(bubble.createdAt).getTime();
          const vidaPct = totalMs > 0 ? Math.max(0, tempoRestante / totalMs) : 0;

          const isHovered = hoveredId === bubble._id;
          const isVazou = bubble.hasLeaked;

          return (
            <div
              key={bubble._id}
              className="absolute pointer-events-auto"
              style={{
                left: pos.x - raio,
                top: pos.y - raio,
                width: tamanho,
                height: tamanho,
                zIndex: Math.floor(conexoes * 10 + (isHovered ? 1000 : 0)),
              }}
            >
              <button
                onClick={(e) => handleBubbleClick(bubble._id, e)}
                onMouseEnter={() => handleMouseEnterBubble(bubble._id)}
                onMouseLeave={handleMouseLeaveBubble}
                className={`
                  w-full h-full rounded-full bg-gradient-to-br ${cor.bg}
                  border-2 ${cor.border} shadow-2xl ${cor.glow}
                  flex flex-col items-center justify-center text-center
                  cursor-pointer transition-all duration-200 ease-out
                  ${isHovered ? "scale-110 ring-4 ring-white/30 shadow-2xl z-50" : "scale-100"}
                  ${conexoes === 0 && !isVazou ? "animate-bubble-pulse" : ""}
                  ${isVazou ? "animate-bubble-pulse shadow-lime-400/70" : ""}
                  focus:outline-none active:scale-95
                `}
              >
                <span
                  className="font-black px-2 leading-tight pointer-events-none select-none"
                  style={{
                    fontSize: tamanho > 120 ? "14px" : tamanho > 80 ? "11px" : "8px",
                    color: isVazou ? "black" : "white",
                  }}
                >
                  {bubble.title?.length > (tamanho > 120 ? 25 : tamanho > 80 ? 16 : 10)
                    ? bubble.title.substring(0, tamanho > 120 ? 23 : tamanho > 80 ? 14 : 8) + "..."
                    : bubble.title || "..."}
                </span>

                <span
                  className="mt-0.5 font-bold pointer-events-none select-none"
                  style={{
                    fontSize: tamanho > 100 ? "10px" : "7px",
                    color: isVazou ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {conexoes} conex{conexoes !== 1 ? "oes" : "ao"}
                </span>

                {tamanho > 110 && bubble.subject && bubble.subject !== "Geral" && (
                  <div className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[6px] font-bold text-white/60 uppercase tracking-wider whitespace-nowrap border border-white/10 pointer-events-none select-none">
                    {bubble.subject}
                  </div>
                )}

                {isVazou && (
                  <div className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-lime-400 text-black text-[7px] font-black uppercase tracking-wider shadow-lg shadow-lime-500/50 whitespace-nowrap border border-lime-300 pointer-events-none select-none">
                    VAZOU
                  </div>
                )}

                {(conexoes === 0 || vidaPct < 0.35) && !isVazou && (
                  <div className="absolute bottom-2 w-3/5 pointer-events-none">
                    <div className="h-1 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          vidaPct < 0.15 ? "bg-rose-400" : vidaPct < 0.35 ? "bg-orange-400" : "bg-slate-400"
                        }`}
                        style={{ width: `${Math.max(5, vidaPct * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Instrucao */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="text-[8px] text-slate-600/40 bg-slate-950/30 backdrop-blur-sm rounded-full px-2.5 py-1 border border-slate-800/20">
          Arrastar · Scroll · Clique
        </span>
      </div>
    </div>
  );
}

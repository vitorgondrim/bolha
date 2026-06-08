// ============================================================
// FLOATING BUBBLE - Bolha flutuante do feed imersivo
//
// Cada bolha tem 3 atributos que definem seu comportamento visual:
//
//   1. ENGAJAMENTO (score) - define TAMANHO e POSICAO
//      - Alto score (>=15): GRANDE, central, se destaca
//      - Medio score (5-14): MEDIO, semi-central
//      - Baixo score (<5): PEQUENO, bordas
//
//   2. IDADE (tempo restante) - define COR e OPACIDADE
//      - Saudavel (vida >60%): verde/ciano vibrante
//      - Moderado (vida 35-60%): azul/cinza
//      - Morrendo (vida 15-35%): laranja, tremor
//      - Critico (vida <15%): vermelho, quase estourando
//
//   3. NOVIDADE (criada ha <5min) - define BRILHO EXTRA
//      - Bolhas novas ganham pulsacao e glow extra
//      - Atrai atencao para bolhas recem-criadas
//
// Fisica do movimento:
//   - Velocidade base BAIXA (0.08 px/frame)
//   - Bolhas de alto score se movem AINDA MAIS DEVAGAR
//   - Bolhas morrendo tremem levemente
//   - Bolhas novas oscilam suavemente (float suave)
// ============================================================

import { useState, useEffect, useRef, useMemo, useContext } from "react";
import { TimeContext } from "../context/TimeContext.jsx";

const BOUNDARY_X = 300;
const BOUNDARY_Y = 200;
const CENTER_FORCE = 0.002;
const FRICTION = 0.998;
const BASE_SPEED = 0.08;
const SCORE_ALTO = 15;
const SCORE_MEDIO = 5;
const MINUTOS_PARA_SER_NOVA = 5;

export default function FloatingBubble({
  bubble,
  index,
  totalBubbles,
  onClickBubble
}) {
  const { timeNow } = useContext(TimeContext);
  const [isHovered, setIsHovered] = useState(false);
  const bubbleRef = useRef(null);

  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const timeOffsetRef = useRef(0);

  useEffect(() => {
    lastTimeRef.current = Date.now();
    timeOffsetRef.current = Math.random() * 1000;
  }, []);

  // Score (engajamento)
  const score = useMemo(() => {
    const likes = bubble.likes?.length || 0;
    const comments = bubble.comments?.length || 0;
    const sopros = bubble.sopros?.length || 0;
    const dislikes = bubble.dislikes?.length || 0;
    return likes + comments * 3 + sopros * 4 - dislikes * 2;
  }, [bubble.likes, bubble.comments, bubble.sopros, bubble.dislikes]);

  // Idade da bolha (minutos)
  const idadeMinutos = useMemo(() => {
    const criada = new Date(bubble.createdAt).getTime();
    return (timeNow - criada) / 60000;
  }, [bubble.createdAt, timeNow]);

  // Vida restante (percentual)
  const vidaPercent = useMemo(() => {
    const remainingMs = new Date(bubble.expiresAt).getTime() - timeNow;
    const totalMs = new Date(bubble.expiresAt).getTime() - new Date(bubble.createdAt).getTime();
    return totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;
  }, [bubble.expiresAt, bubble.createdAt, timeNow]);

  // Categoria
  const categoria = useMemo(() => {
    if (bubble.hasLeaked) return "vazou";
    if (idadeMinutos < MINUTOS_PARA_SER_NOVA) return "nova";
    if (score >= SCORE_ALTO) return "destaque";
    if (score >= SCORE_MEDIO) return "normal";
    if (vidaPercent < 0.15) return "critico";
    if (vidaPercent < 0.35) return "morrendo";
    return "fraca";
  }, [idadeMinutos, score, vidaPercent, bubble.hasLeaked]);

  // Rank de centralidade
  const centralityRank = useMemo(() => {
    if (totalBubbles <= 1) return 0;
    return Math.min(index / (totalBubbles - 1), 1);
  }, [index, totalBubbles]);

  // Tamanho
  const size = useMemo(() => {
    switch (categoria) {
      case "vazou": return 140 + Math.min(score / 40, 1) * 40;
      case "destaque": return 110 + Math.min(score / 30, 1) * 50;
      case "nova": return 75 + Math.min(idadeMinutos / 5, 1) * 25;
      case "normal": return 80 + Math.min(score / 15, 1) * 30;
      case "morrendo": return 65 + vidaPercent * 10;
      case "critico": return 50 + vidaPercent * 15;
      default: return 55 + Math.min(score / 5, 1) * 20;
    }
  }, [categoria, score, idadeMinutos, vidaPercent]);

  // Posicao inicial
  useEffect(() => {
    const angle = (index * 137.508) % 360;
    const angleRad = (angle * Math.PI) / 180;
    const maxRadius = 0.9;
    const minRadius = 0.05;
    const radiusFactor = minRadius + centralityRank * (maxRadius - minRadius);
    const radiusX = BOUNDARY_X * radiusFactor;
    const radiusY = BOUNDARY_Y * radiusFactor;

    posRef.current = {
      x: Math.cos(angleRad) * radiusX,
      y: Math.sin(angleRad) * radiusY,
    };

    let speedBase = BASE_SPEED;
    if (categoria === "destaque" || categoria === "vazou") speedBase = 0.04;
    if (categoria === "critico") speedBase = 0.15;

    velRef.current = {
      x: (Math.random() - 0.5) * speedBase,
      y: (Math.random() - 0.5) * speedBase,
    };

    lastTimeRef.current = Date.now();
  }, [index, centralityRank, categoria]);

  // Loop de animacao
  useEffect(() => {
    let animationId;

    const animate = () => {
      const now = Date.now();
      const delta = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const distFromCenter = Math.sqrt(posRef.current.x ** 2 + posRef.current.y ** 2);
      const centerPull = centralityRank < 0.3 ? CENTER_FORCE * 2 : CENTER_FORCE;

      if (distFromCenter > 10) {
        const angleToCenter = Math.atan2(-posRef.current.y, -posRef.current.x);
        velRef.current.x += Math.cos(angleToCenter) * centerPull * delta * 60;
        velRef.current.y += Math.sin(angleToCenter) * centerPull * delta * 60;
      }

      // Tremor em bolhas morrendo
      if (categoria === "morrendo" || categoria === "critico") {
        const tremorForce = categoria === "critico" ? 0.08 : 0.04;
        velRef.current.x += Math.sin(now * 0.01 + timeOffsetRef.current) * tremorForce * delta * 30;
        velRef.current.y += Math.cos(now * 0.008 + timeOffsetRef.current) * tremorForce * delta * 30;
      }

      // Flutuacao em bolhas novas
      if (categoria === "nova") {
        velRef.current.y -= 0.03 * delta * 30;
      }

      posRef.current.x += velRef.current.x * delta * 40;
      posRef.current.y += velRef.current.y * delta * 40;

      velRef.current.x *= FRICTION;
      velRef.current.y *= FRICTION;

      const minSpeed = categoria === "critico" ? 0.05 : 0.03;
      const currentSpeed = Math.sqrt(velRef.current.x ** 2 + velRef.current.y ** 2);
      if (currentSpeed < minSpeed && currentSpeed > 0) {
        const boost = minSpeed / currentSpeed;
        velRef.current.x *= boost;
        velRef.current.y *= boost;
      }

      const bounceDamping = 0.6;
      if (Math.abs(posRef.current.x) > BOUNDARY_X - size / 2) {
        const sign = Math.sign(posRef.current.x);
        posRef.current.x = sign * (BOUNDARY_X - size / 2);
        velRef.current.x = -velRef.current.x * bounceDamping;
      }
      if (Math.abs(posRef.current.y) > BOUNDARY_Y - size / 2) {
        const sign = Math.sign(posRef.current.y);
        posRef.current.y = sign * (BOUNDARY_Y - size / 2);
        velRef.current.y = -velRef.current.y * bounceDamping;
      }

      if (bubbleRef.current) {
        bubbleRef.current.style.left = `calc(50% + ${posRef.current.x}px)`;
        bubbleRef.current.style.top = `calc(50% + ${posRef.current.y}px)`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [centralityRank, size, categoria]);

  // Estilo visual
  const estilo = useMemo(() => {
    switch (categoria) {
      case "vazou":
        return {
          gradient: "from-lime-400/95 to-emerald-500/95",
          border: "border-lime-300/80",
          glow: "shadow-lime-400/60",
          ring: "ring-lime-300/60",
          textoCor: "text-black",
          badge: "Vazou!",
          badgeCor: "bg-lime-500 text-black",
        };
      case "destaque":
        return {
          gradient: "from-cyan-400/90 to-blue-500/90",
          border: "border-cyan-300/70",
          glow: "shadow-cyan-400/50",
          ring: "ring-cyan-300/50",
          textoCor: "text-white",
          badge: null,
          badgeCor: null,
        };
      case "nova":
        return {
          gradient: "from-purple-400/85 to-pink-500/85",
          border: "border-purple-300/70",
          glow: "shadow-purple-400/50",
          ring: "ring-purple-300/50",
          textoCor: "text-white",
          badge: "Nova",
          badgeCor: "bg-purple-500 text-white",
        };
      case "normal":
        return {
          gradient: "from-slate-500/75 to-slate-600/75",
          border: "border-slate-400/50",
          glow: "shadow-slate-500/30",
          ring: "ring-slate-400/40",
          textoCor: "text-white",
          badge: null,
          badgeCor: null,
        };
      case "morrendo":
        return {
          gradient: "from-orange-500/85 to-red-600/85",
          border: "border-orange-400/60",
          glow: "shadow-orange-500/40",
          ring: "ring-orange-400/40",
          textoCor: "text-white",
          badge: "Morrendo",
          badgeCor: "bg-orange-500 text-white",
        };
      case "critico":
        return {
          gradient: "from-rose-600/95 to-red-800/95",
          border: "border-rose-400/80",
          glow: "shadow-rose-500/60",
          ring: "ring-rose-400/60",
          textoCor: "text-white",
          badge: "Vai estourar!",
          badgeCor: "bg-rose-500 text-white",
        };
      default:
        return {
          gradient: "from-slate-600/60 to-slate-700/60",
          border: "border-slate-500/40",
          glow: "shadow-slate-600/20",
          ring: "ring-slate-500/30",
          textoCor: "text-white/70",
          badge: null,
          badgeCor: null,
        };
    }
  }, [categoria]);

  const novaAnimacao = categoria === "nova" ? "animate-bubble-pulse" : "";
  const criticoAnimacao = categoria === "critico" ? "animate-pulse" : "";
  const opacidade = categoria === "fraca" ? "opacity-60" : "opacity-100";

  return (
    <div
      ref={bubbleRef}
      className={`absolute transition-transform duration-500 ease-out cursor-pointer group select-none pointer-events-auto ${opacidade}`}
      style={{
        transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 1})`,
        zIndex: isHovered ? 100 : Math.floor(centralityRank * 50 + (size - 50) / 3),
        width: size,
        height: size,
      }}
      onClick={() => onClickBubble?.(bubble._id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 300)}
    >
      <div
        className={`
          w-full h-full rounded-full bg-gradient-to-br ${estilo.gradient}
          backdrop-blur-sm border-2 ${estilo.border}
          shadow-2xl ${estilo.glow}
          flex flex-col items-center justify-center text-center
          transition-all duration-300
          ${isHovered ? `ring-4 ${estilo.ring}` : ""}
          ${novaAnimacao} ${criticoAnimacao}
        `}
      >
        {estilo.badge && (
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider shadow-lg ${estilo.badgeCor}`}>
            {estilo.badge === "Vazou!" ? " Vazou!" : estilo.badge === "Nova" ? " Nova" : estilo.badge === "Morrendo" ? " Morrendo" : estilo.badge === "Vai estourar!" ? " Vai estourar!" : estilo.badge}
          </div>
        )}

        {!estilo.badge && bubble.subject && bubble.subject !== "Geral" && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[7px] font-bold uppercase tracking-wider text-white/60">
            {bubble.subject}
          </div>
        )}

        {bubble.title && (
          <div
            className={`font-bold text-center px-2 leading-tight ${estilo.textoCor}`}
            style={{ fontSize: size > 130 ? "14px" : size > 100 ? "12px" : "10px" }}
          >
            {bubble.title.length > (size > 130 ? 25 : 18)
              ? bubble.title.substring(0, size > 130 ? 23 : 16) + "..."
              : bubble.title}
          </div>
        )}

        {(categoria === "vazou" || categoria === "destaque" || categoria === "normal") && (
          <div className="flex gap-1.5 mt-1 text-white/40" style={{ fontSize: size > 120 ? "9px" : "7px" }}>
            <span> {bubble.likes?.length || 0}</span>
            <span> {bubble.comments?.length || 0}</span>
            <span> {bubble.sopros?.length || 0}</span>
          </div>
        )}

        {(categoria === "fraca" || categoria === "morrendo" || categoria === "critico") && (
          <div className="w-3/4 mt-1">
            <div className="h-1 rounded-full bg-black/30 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  vidaPercent < 0.15 ? "bg-rose-400" : vidaPercent < 0.35 ? "bg-orange-400" : "bg-slate-400"
                }`}
                style={{ width: `${vidaPercent * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/8 transition-all duration-300 pointer-events-none" />
      </div>

      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-black/90 backdrop-blur-sm text-[9px] text-white/80 border border-white/10 z-20">
          {categoria === "vazou" && " Viralizou! Clique para ver"}
          {categoria === "nova" && " Bolha nova! Clique para ver"}
          {categoria === "destaque" && " Bolha bombando!"}
          {categoria === "normal" && " Toque para ver"}
          {categoria === "morrendo" && " Toque antes que estoure!"}
          {categoria === "critico" && " Prestes a estourar!"}
          {categoria === "fraca" && " Toque para ver"}
        </div>
      )}
    </div>
  );
}

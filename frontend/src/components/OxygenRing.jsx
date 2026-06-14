// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: OxygenRing
// Propósito: Círculo de progresso SVG com gradiente neon.
//            Muda de vermelho → laranja → ciano → roxo conforme
//            o nível de oxigênio aumenta.
// ============================================================

import { useMemo } from 'react';

const SIZE = 48;
const STROKE_WIDTH = 3.5;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Mapeia oxygenLevel (0-100) para uma cor gradiente.
 * 0%   → Vermelho intenso (#ff2d55)
 * 25%  → Laranja (#ff6b35)
 * 50%  → Ciano (#00f0ff)
 * 75%  → Roxo (#a855f7)
 * 100% → Verde neon + Roxo (#39ff14 → #a855f7)
 */
const getGradientColors = (level) => {
  if (level <= 0) return { from: '#ff2d55', to: '#ff2d55', glow: 'rgba(255,45,85,0.3)' };
  if (level <= 25) {
    const t = level / 25;
    return {
      from: `rgb(${255},${Math.round(45 + (62 - 45) * t)},${Math.round(85 + (53 - 85) * t)})`,
      to: `rgb(${255},${Math.round(107 - 42 * t)},${Math.round(53 - 18 * t)})`,
      glow: `rgba(255,${Math.round(107 - 42 * t)},${Math.round(53 - 18 * t)},0.25)`,
    };
  }
  if (level <= 50) {
    const t = (level - 25) / 25;
    return {
      from: `rgb(${255 - Math.round(255 * t)},${Math.round(107 - 107 * t)},0)`,
      to: `rgb(${Math.round(240 * (1 - t))},${Math.round(240 * t + 255 * (1 - t))},${Math.round(255 * t)})`,
      glow: `rgba(0,${Math.round(240 * t)},255,0.25)`,
    };
  }
  if (level <= 75) {
    const t = (level - 50) / 25;
    return {
      from: `rgb(${Math.round(0 + 168 * t)},${Math.round(240 - 155 * t)},${Math.round(255 - 0 * t)})`,
      to: `rgb(168,${Math.round(85 + 170 * t)},247)`,
      glow: `rgba(168,${Math.round(85 + 170 * t)},247,0.25)`,
    };
  }
  // 76-100
  const t = (level - 75) / 25;
  return {
    from: `rgb(${Math.round(168 + 87 * t)},${Math.round(255 - 255 * t)},${Math.round(247 - 247 * t)})`,
    to: `rgb(${Math.round(57 + 111 * (1 - t))},255,${Math.round(20 + 227 * (1 - t))})`,
    glow: `rgba(${Math.round(57 + 111 * (1 - t))},255,${Math.round(20 + 227 * (1 - t))},0.25)`,
  };
};

export default function OxygenRing({ 
  oxygenLevel = 0, 
  maxOxygen = 100,
  size = SIZE,
  animated = true,
  showPercentage = true,
  show = true,
}) {
  // 🔥 Se show=false, remove completamente do DOM — zero layout impact
  if (!show) return null;

  const percentage = useMemo(() => {
    if (maxOxygen <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((oxygenLevel / maxOxygen) * 100)));
  }, [oxygenLevel, maxOxygen]);

  const colors = useMemo(() => getGradientColors(percentage), [percentage]);

  const strokeDashoffset = useMemo(() => {
    return CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
  }, [percentage]);

  // Estado crítico: < 15%
  const isCritical = percentage <= 15;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow externo */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isCritical ? 'animate-pulse' : ''
        }`}
        style={{
          boxShadow: `0 0 ${isCritical ? '12px' : '8px'} ${colors.glow}`,
          transition: 'box-shadow 0.5s ease',
        }}
      />

      {/* SVG do círculo */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}
      >
        {/* Círculo de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(30, 30, 53, 0.6)"
          strokeWidth={STROKE_WIDTH}
        />

        {/* Gradiente definido inline */}
        <defs>
          <linearGradient id={`oxygen-grad-${percentage}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>

        {/* Círculo de progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#oxygen-grad-${percentage})`}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          className={animated ? 'transition-all duration-1000 ease-linear' : ''}
          style={{
            filter: `drop-shadow(0 0 3px ${colors.glow})`,
          }}
        />

        {/* Pontos de destaque nas extremidades */}
        <circle
          cx={size / 2}
          cy={STROKE_WIDTH / 2}
          r={2}
          fill={colors.to}
          style={{ filter: `drop-shadow(0 0 4px ${colors.to})` }}
        />
      </svg>

      {/* Texto da porcentagem no centro */}
      {showPercentage && (
        <span
          className={`absolute font-bold transition-all duration-500 ${
            size <= 40 ? 'text-[8px]' : 'text-[10px]'
          } ${isCritical ? 'text-rose-400' : ''}`}
          style={{ color: isCritical ? '#fb7185' : colors.to }}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}
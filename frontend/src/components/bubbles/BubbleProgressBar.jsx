// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleProgressBar v2 (Atomic Design)
// Propósito: Barra de pressão vital da bolha — NÃO-LINEAR
//
// Refinamento:
//   - Easing não-linear (cubic-bezier) para decaimento orgânico
//   - Gradiente contínuo baseado em vitalidade (sem faixas fixas)
//   - Brilho pulsante que acelera conforme a pressão aumenta
//   - "Late-stage warning": tremor sutil no final da vida
// ============================================================

import { useMemo } from 'react';

/**
 * Mapeia vitalidade percentual para cor do gradiente — contínuo
 */
const getContinuousGradient = (percent) => {
  if (percent <= 15) {
    return 'from-rose-600 via-rose-500 to-orange-400';
  }
  if (percent <= 35) {
    return 'from-orange-500 via-amber-400 to-yellow-300';
  }
  if (percent <= 55) {
    return 'from-cyan-400 via-sky-400 to-blue-500';
  }
  return 'from-lime-400 via-emerald-400 to-cyan-400';
};

export default function BubbleProgressBar({ percent, pressureLevel }) {
  // Animação de tremor no estado crítico (últimos 15%)
  const isCriticalLate = percent <= 15;

  // Duração da transição: mais rápida quando crítica (urgência), mais lenta quando estável
  const transitionDuration = useMemo(() => {
    if (percent <= 15) return 400;  // rápida — urgência
    if (percent <= 35) return 800;  // média
    return 1200;                    // lenta — estável
  }, [percent]);

  const gradient = useMemo(() => getContinuousGradient(percent), [percent]);

  return (
    <div
      className={`relative z-10 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/30 ${
        isCriticalLate ? 'animate-pulse' : ''
      }`}
      style={{
        // Easing não-linear: decaimento acelera no final
        // easeInOutCubic: suave no começo, acelera no meio, amacia no fim
        transition: `width ${transitionDuration}ms cubic-bezier(0.6, 0.0, 0.4, 1.0)`,
      }}
    >
      <div
        className={`
          h-full rounded-full bg-gradient-to-r ${gradient}
          ${isCriticalLate ? 'shadow-lg shadow-rose-500/50' : 
            pressureLevel === 'warning' ? 'shadow-md shadow-cyan-500/30' : ''}
        `}
        style={{
          width: `${percent}%`,
          // Tremor no estado crítico (CSS puro, sem JS)
          animation: isCriticalLate ? 'bar-critical-tremor 0.3s ease-in-out infinite' : 'none',
        }}
      />

      {/* Brilho pulsante na ponta da barra — sinal de vida */}
      {percent > 0 && percent < 95 && (
        <div
          className="absolute top-0 bottom-0 w-3 bg-white/15 blur-sm rounded-full"
          style={{
            left: `${percent}%`,
            animation: `bar-glow-pulse ${isCriticalLate ? '1s' : '2.5s'} ease-in-out infinite`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </div>
  );
}
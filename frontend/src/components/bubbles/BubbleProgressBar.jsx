// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleProgressBar (Atomic Design)
// Propósito: Barra de pressão vital da bolha
// ============================================================

export default function BubbleProgressBar({ percent, pressureLevel }) {
  return (
    <div className="relative z-10 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/30">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-linear ${
          pressureLevel === 'critical'
            ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-lg shadow-rose-500/50'
            : pressureLevel === 'warning'
              ? 'bg-gradient-to-r from-cyan-400 to-lime-400'
              : 'bg-gradient-to-r from-lime-400 to-cyan-400'
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
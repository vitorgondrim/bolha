// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleMetrics (Atomic Design)
// Propósito: Métricas da bolha — curtidas, dislikes, sopros
// ============================================================

export default function BubbleMetrics({ bubble }) {
  return (
    <div className="relative z-10 grid grid-cols-3 gap-2.5 mt-5 text-center">
      <div className="rounded-xl bg-slate-950/40 p-2 border border-slate-800/50">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Curtidas</div>
        <div className="text-xs font-bold text-cyan-400 mt-0.5">❤️ {bubble.likes?.length || 0}</div>
      </div>
      <div className="rounded-xl bg-slate-950/40 p-2 border border-slate-800/50">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Dislikes</div>
        <div className="text-xs font-bold text-rose-400 mt-0.5">💥 {bubble.dislikes?.length || 0}</div>
      </div>
      <div className="rounded-xl bg-slate-950/40 p-2 border border-slate-800/50">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Sopros</div>
        <div className="text-xs font-bold text-lime-400 mt-0.5">🫧 {bubble.sopros?.length || 0}</div>
      </div>
    </div>
  );
}
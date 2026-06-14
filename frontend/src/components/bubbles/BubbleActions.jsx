// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleActions (Atomic Design)
// Propósito: Botões de ação — Curtir, Dislike, Sopro
// ============================================================

export default function BubbleActions({ onLike, onDislike, onSopro, bubbleId }) {
  const handleAction = (event, callback) => {
    event.stopPropagation();
    callback?.(bubbleId);
  };

  return (
    <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
      <button
        onClick={(e) => handleAction(e, onLike)}
        className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 py-2 text-xs font-semibold hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
      >
        ❤️ Curtir
      </button>
      <button
        onClick={(e) => handleAction(e, onDislike)}
        className="rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 py-2 text-xs font-semibold hover:bg-rose-500/20 hover:scale-105 active:scale-95 transition-all"
      >
        💥 Dislike
      </button>
      <button
        onClick={(e) => handleAction(e, onSopro)}
        className="rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-300 py-2 text-xs font-semibold hover:bg-lime-500/20 hover:scale-105 active:scale-95 transition-all"
      >
        🫧 Sopro
      </button>
    </div>
  );
}
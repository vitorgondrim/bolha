// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleHeader (Atomic Design)
// Propósito: Cabeçalho do card — autor, badges, tempo restante
// ============================================================

import { useNavigate } from 'react-router-dom';

export default function BubbleHeader({ bubble, formatRemainingText, pressureLevel }) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-start gap-3 mb-4">
      <div>
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <span
            className="font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (bubble.author?.username) navigate(`/profile/${bubble.author.username}`);
            }}
          >
            @{bubble.author?.username || 'Anônimo'}
          </span>
          {bubble.hasLeaked && (
            <span className="text-[0.65rem] uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-lime-500/20 text-lime-300 border border-lime-500/40 font-bold">
              ⚡ VAZOU
            </span>
          )}
        </div>
        <div className="text-slate-500 text-[0.75rem] mt-1">
          {new Date(bubble.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="text-right text-[0.75rem] text-slate-400 flex flex-col items-end gap-2">
        <div className={`font-bold text-sm ${pressureLevel === 'critical' ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
          {formatRemainingText}
        </div>
        <div className={`uppercase tracking-widest text-[0.65rem] font-bold ${
          pressureLevel === 'critical' ? 'text-rose-400' : pressureLevel === 'warning' ? 'text-cyan-400' : 'text-lime-400'
        }`}>
          {pressureLevel === 'critical' ? '⚠️ ESTOURANDO' : pressureLevel === 'warning' ? '🫧 TREME' : '💚 QUENTE'}
        </div>
      </div>
    </div>
  );
}
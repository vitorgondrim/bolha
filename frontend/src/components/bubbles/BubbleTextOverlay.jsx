// ============================================================
// BUBBLE TEXT OVERLAY — Conteúdo textual + métricas da bolha
// 
// Subcomponente visual que renderiza dentro da bolha circular:
//   - Nome do autor (topo)
//   - Texto do conteúdo (central, truncado)
//   - Métricas (likes, sopros)
//   - Indicador de vazamento (hasLeaked)
//
// Props:
//   contentText, displayName, likesCount, soprosCount
//   textStyle (estilo dinâmico que dissolve com vitalidade)
//   hasLeaked (booleano)
// ============================================================

import { memo } from 'react';

const BubbleTextOverlay = memo(function BubbleTextOverlay({
  contentText = '',
  displayName = 'anon',
  likesCount = 0,
  soprosCount = 0,
  textStyle = {},
  hasLeaked = false,
}) {
  return (
    <div
      className="relative z-10 flex flex-col items-center justify-center w-full h-full mask-soft-edge px-2"
      style={textStyle}
    >
      {/* ─── AUTOR (mini, topo) ─── */}
      <span className="text-[9px] font-bold text-cyan-300/60 leading-none mb-0.5 truncate max-w-[85%]">
        @{displayName}
      </span>

      {/* ─── CONTEÚDO (central, truncado) ─── */}
      <p className="text-xs text-slate-100/90 leading-tight line-clamp-4 text-center break-words overflow-hidden">
        {contentText}
      </p>

      {/* ─── MÉTRICAS (base) ─── */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[8px] text-cyan-400/50 font-medium select-none">
          ❤️{likesCount}
        </span>
        <span className="text-[8px] text-lime-400/50 font-medium select-none">
          🫧{soprosCount}
        </span>
      </div>

      {/* ─── INDICADOR DE VAZAMENTO (bolha viral) ─── */}
      {hasLeaked && (
        <div className="absolute -top-1 -right-1 z-20 w-2.5 h-2.5 rounded-full bg-lime-400 animate-ping opacity-75" />
      )}
    </div>
  );
});

export default BubbleTextOverlay;

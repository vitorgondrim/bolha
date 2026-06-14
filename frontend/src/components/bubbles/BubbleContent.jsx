// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleContent (Atomic Design)
// Propósito: Corpo do card — título, assunto, mídia, conteúdo
// ============================================================

import { useState } from 'react';

export default function BubbleContent({ bubble }) {
  const [imageError, setImageError] = useState(false);
  const hasMedia = bubble?.mediaUrl && !imageError;

  return (
    <>
      {bubble.title && (
        <h3 className="relative z-10 text-xl font-bold text-white mb-2 leading-tight">
          {bubble.title}
        </h3>
      )}

      {bubble.subject && bubble.subject !== 'Geral' && (
        <div className="relative z-10 mb-3">
          <span className="text-[10px] uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
            {bubble.subject}
          </span>
        </div>
      )}

      {hasMedia && (
        <div
          className="relative z-10 mb-4 rounded-2xl overflow-hidden bg-slate-950/50"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={bubble.mediaUrl}
            alt="Conteúdo da bolha"
            className="w-full max-h-64 object-contain rounded-2xl"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      <p className="relative z-10 text-base leading-relaxed text-slate-100 min-h-6 mb-4 whitespace-pre-wrap">
        {bubble.content}
      </p>
    </>
  );
}
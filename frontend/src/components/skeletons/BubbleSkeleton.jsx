// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: BubbleSkeleton
// Propósito: Skeleton loading que replica a estrutura visual
//            do BubbleCard para evitar layout shift.
// ============================================================

export default function BubbleSkeleton() {
  return (
    <div className="rounded-3xl p-6 bg-slate-900/70 border border-slate-800/60 animate-pulse">
      {/* Cabeçalho */}
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-800 rounded-full" />
          <div className="h-3 w-16 bg-slate-800/50 rounded-full" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-3 w-20 bg-slate-800 rounded-full" />
          <div className="h-3 w-14 bg-slate-800/50 rounded-full" />
        </div>
      </div>

      {/* Título */}
      <div className="h-6 w-3/4 bg-slate-800 rounded-lg mb-3" />

      {/* Subject tag */}
      <div className="h-4 w-16 bg-slate-800/50 rounded-full mb-3" />

      {/* Conteúdo (3 linhas) */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-slate-800/50 rounded-lg" />
        <div className="h-4 w-5/6 bg-slate-800/50 rounded-lg" />
        <div className="h-4 w-2/3 bg-slate-800/50 rounded-lg" />
      </div>

      {/* Barra de progresso */}
      <div className="h-2 w-full bg-slate-800 rounded-full mb-5" />

      {/* Métricas (3 colunas) */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Ações (3 botões) */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * FeedSkeleton — Renderiza uma grade de skeletons.
 * Útil para a página de feed inteira.
 */
export function FeedSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {Array.from({ length: count }).map((_, i) => (
        <BubbleSkeleton key={i} />
      ))}
    </div>
  );
}
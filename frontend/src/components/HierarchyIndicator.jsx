// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: HierarchyIndicator
// Propósito: Exibe visualmente a profundidade hierárquica
//            da bolha (raiz, filha, neta) com estilos de borda,
//            glow e opacidade diferentes.
// ============================================================

import { useMemo } from 'react';

const HIERARCHY_STYLES = {
  root: {
    // Bolha Mãe / Raiz
    borderWidth: 'border-2',
    borderColor: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/20',
    opacity: 'opacity-100',
    scale: 'scale-100',
    label: '🌐 Raiz',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  child: {
    // Bolha Filha
    borderWidth: 'border',
    borderColor: 'border-purple-500/30',
    glow: 'shadow-purple-500/10',
    opacity: 'opacity-85',
    scale: 'scale-[0.97]',
    label: '🔄 Filha',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  orphan: {
    // Bolha que sobreviveu à mãe (órfã promovida)
    borderWidth: 'border-2',
    borderColor: 'border-lime-500/40',
    glow: 'shadow-lime-500/20',
    opacity: 'opacity-95',
    scale: 'scale-[0.99]',
    label: '🆙 Promovida',
    badgeClass: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  },
  grandchild: {
    // Bolha Neta
    borderWidth: 'border',
    borderColor: 'border-slate-600/30',
    glow: 'shadow-slate-500/5',
    opacity: 'opacity-70',
    scale: 'scale-[0.94]',
    label: '🌱 Neta',
    badgeClass: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  },
};

export default function HierarchyIndicator({ 
  depthLevel = 0, 
  isOrphan = false, 
  promotedFromChild = false,
  showBadge = false,
  children,
}) {
  const style = useMemo(() => {
    if (promotedFromChild || isOrphan) return HIERARCHY_STYLES.orphan;
    if (depthLevel === 0) return HIERARCHY_STYLES.root;
    if (depthLevel === 1) return HIERARCHY_STYLES.child;
    return HIERARCHY_STYLES.grandchild;
  }, [depthLevel, isOrphan, promotedFromChild]);

  return (
    <div className={`relative ${style.borderWidth} ${style.borderColor} ${style.opacity} ${style.scale}`}>
      {children}

      {/* Badge de profundidade (opcional, exibido no hover) */}
      {showBadge && (
        <div className={`absolute -top-2 -right-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${style.badgeClass} opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-lg`}>
          {style.label}
        </div>
      )}
    </div>
  );
}
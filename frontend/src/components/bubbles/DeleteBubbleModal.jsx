// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: DeleteBubbleModal (Atomic Design)
// Propósito: Modal de confirmação de exclusão via React Portal
// ============================================================

import { createPortal } from 'react-dom';

export default function DeleteBubbleModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-base font-bold text-white mb-2">🗑️ Confirmar autodestruição</div>
        <p className="text-slate-400 text-xs leading-relaxed">
          Você tem certeza de que deseja estourar manualmente essa bolha? Esse processo não pode ser desfeito.
        </p>
        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
          >
            Garantir Vida
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-rose-700 transition"
          >
            Estourar Bolha
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
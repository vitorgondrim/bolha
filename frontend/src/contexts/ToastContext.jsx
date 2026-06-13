// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: contexts/ToastContext.jsx
// Propósito: Sistema de notificações visuais (toasts) sem dependências externas
// ============================================================

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Atalhos para cada tipo
  const success = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const error = useCallback((msg, duration) => addToast(msg, 'error', duration || 4000), [addToast]);
  const info = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]);
  const warning = useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]);

  const typeStyles = {
    success: 'bg-lime-500/20 border-lime-400/30 text-lime-300 shadow-lime-500/10',
    error: 'bg-rose-500/20 border-rose-400/30 text-rose-300 shadow-rose-500/10',
    warning: 'bg-amber-500/20 border-amber-400/30 text-amber-300 shadow-amber-500/10',
    info: 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300 shadow-cyan-500/10',
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}

      {/* Container de toasts — fixo no topo central */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`
              pointer-events-auto cursor-pointer
              rounded-full px-5 py-2.5 text-xs font-bold text-center
              backdrop-blur-xl shadow-lg border
              animate-[slideDown_0.3s_ease-out]
              ${typeStyles[toast.type] || typeStyles.info}
            `}
            style={{
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Animação CSS inline */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser utilizado dentro de um ToastProvider');
  }
  return context;
};
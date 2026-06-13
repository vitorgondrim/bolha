// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Componente: SoproEffect
// Propósito: Animação sutil de "pulse" quando um sopro é injetado.
//            Usa Framer Motion para um efeito de onda expansiva.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

let effectIdCounter = 0;

export default function SoproEffect({ children, onActivate }) {
  const [effects, setEffects] = useState([]);
  const idRef = useRef(0);

  const trigger = useCallback((event) => {
    if (event) event.stopPropagation();

    const id = ++idRef.current;
    const effectId = `sopro-${Date.now()}-${effectIdCounter++}`;

    // Adiciona o efeito
    setEffects(prev => [...prev, { id: effectId, x: 50, y: 50 }]);

    // Remove após a animação
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effectId));
    }, 800);

    // Chama o callback original se existir
    onActivate?.();
  }, [onActivate]);

  return (
    <div className="relative" onClick={trigger}>
      {children}

      <AnimatePresence>
        {effects.map((effect) => (
          <motion.div
            key={effect.id}
            className="absolute inset-0 pointer-events-none z-10"
            initial={{ opacity: 0.6, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="w-full h-full rounded-3xl border-2 border-lime-400/60" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Efeito de brilho interno no centro */}
      <AnimatePresence>
        {effects.map((effect) => (
          <motion.div
            key={`glow-${effect.id}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            initial={{ opacity: 0.8, scale: 0, width: 0, height: 0 }}
            animate={{ 
              opacity: 0, 
              scale: 1,
              width: 80,
              height: 80,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="w-full h-full rounded-full bg-lime-400/30 blur-xl" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
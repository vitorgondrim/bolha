// ============================================================
// DECAY PARTICLES — Partículas de desintegração
// Quando uma bolha está morrendo (vitality < 0.3),
// pequenas partículas se desprendem da borda e flutuam para cima
// ============================================================

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hashSeed } from '../../utils/organicNoise';

const PARTICLE_COUNT = 8;

export default function DecayParticles({ bubbleId, vitality, colorRgb = '255, 45, 85' }) {
  const particles = useMemo(() => {
    if (vitality > 0.3) return [];
    
    const seed = hashSeed(bubbleId || 'default');
    
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: `${bubbleId}-particle-${i}`,
      // Posição inicial aleatória na borda da bolha (coordenadas relativas 0–100%)
      x: 15 + ((seed * 37 + i * 41) % 70),
      y: 15 + ((seed * 53 + i * 29) % 70),
      // Tamanho aleatório
      size: 1.5 + ((seed * 17 + i * 13) % 3) * 1.2,
      // Direção de fuga (radial a partir do centro)
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + seed * 0.5,
      // Velocidade baseada em quão perto da morte
      speed: 0.6 + (1 - vitality) * 1.2,
      // Delay para não explodirem todas juntas
      delay: i * 0.15 + (seed % 0.5),
      // Cor com variação
      hue: i % 3 === 0 ? '255, 45, 85' : i % 3 === 1 ? '245, 158, 11' : '168, 85, 247',
    }));
  }, [bubbleId, vitality]);

  if (vitality > 0.3) return null;

  return (
    <AnimatePresence>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `rgba(${p.hue}, 0.6)`,
            filter: `blur(${0.5 + (1 - vitality) * 1.5}px)`,
            boxShadow: `0 0 ${p.size * 2}px rgba(${p.hue}, 0.3)`,
          }}
          initial={{ opacity: 0.8, scale: 0 }}
          animate={{
            opacity: [0.8, 0.6, 0],
            scale: [0, 1, 0.3],
            y: [0, -Math.sin(p.angle) * 30 * p.speed],
            x: [0, Math.cos(p.angle) * 30 * p.speed],
          }}
          transition={{
            duration: 1.8 / p.speed,
            repeat: Infinity,
            delay: p.delay,
            ease: [0.6, 0.0, 0.4, 1.0], // easing de decaimento
          }}
        />
      ))}
    </AnimatePresence>
  );
}

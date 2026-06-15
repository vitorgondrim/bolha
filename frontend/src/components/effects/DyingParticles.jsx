// ============================================================
// DYING PARTICLES — Partículas de vaporização orgânica
//
// Quando a bolha entra em estado dying (glowIntensity < 0.1),
// pequenas partículas se desprendem e "vaporizam" para cima
// com trajetórias parabólicas caóticas.
//
// Comportamento:
//   - 12 partículas em vez de 8 (mais densas perto da morte)
//   - Trajetórias parabólicas com drift lateral
//   - Tamanho decrescente (encolhem enquanto sobem)
//   - Fase de hover (flutuam antes de desaparecer)
//   - Cada partícula tem personalidade única via seed
// ============================================================

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hashSeed } from '../../utils/organicNoise';

const PARTICLE_COUNT = 12;
const COLORS = [
  '255, 45, 85',   // rosa
  '245, 158, 11',  // dourado
  '168, 85, 247',  // roxo
  '59, 130, 246',  // azul
];

/**
 * Gera partículas com seeding determinístico para consistência visual.
 * Cada partícula tem:
 *   - Posição inicial (borda da bolha, coordenadas %)
 *   - Trajetória parabólica (dx, dy)
 *   - Timing individual (delay, duração)
 */
const generateParticles = (bubbleId, vitality) => {
  const seed = hashSeed(bubbleId || 'default');

  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Ângulo radial — espalhadas ao redor da circunferência
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + seed * 0.7;

    // Posição inicial na borda (offsets do centro 50,50)
    const edgeX = 50 + Math.cos(angle) * 35;
    const edgeY = 50 + Math.sin(angle) * 35;

    // Trajetória de fuga: radial + drift lateral caótico
    const escapeSpeed = 0.8 + (1 - vitality) * 1.5;
    const driftX = Math.cos(angle + seed * 2) * escapeSpeed * 25;
    const driftY = Math.sin(angle + seed * 1.5) * escapeSpeed * 30 - 15; // tendência pra cima

    // Tamanho: maior perto da borda, menor no topo
    const size = 2 + ((seed * 23 + i * 17) % 5) * 1.4;

    // Delay escalonado: algumas saem na frente, outras hesitam
    const delay = i * 0.08 + (seed % 0.4);

    // Duração individual
    const duration = 1.2 + ((seed * 31 + i * 11) % 8) * 0.15;

    // Cor alternada
    const hue = COLORS[i % COLORS.length];

    return {
      id: `${bubbleId}-dp-${i}`,
      x: edgeX,
      y: edgeY,
      dx: driftX,
      dy: driftY,
      size,
      delay,
      duration,
      hue,
      // Fase de hover: algumas partículas "pairam" antes de sumir
      hover: (seed * 7 + i * 3) % 5 > 2,
    };
  });
};

/**
 * Renderiza partículas de desintegração.
 * Só aparece quando vitality < 0.15 (estado dying iminente).
 */
export default function DyingParticles({ bubbleId, vitality = 0, colorRgb = '255, 45, 85' }) {
  const particles = useMemo(
    () => (vitality < 0.15 ? generateParticles(bubbleId, vitality) : []),
    [bubbleId, vitality]
  );

  if (vitality >= 0.15 || particles.length === 0) return null;

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
            background: `radial-gradient(circle, rgba(${p.hue}, 0.8), rgba(${p.hue}, 0.2))`,
            filter: `blur(${0.3 + (1 - vitality) * 2}px)`,
            boxShadow: `0 0 ${p.size * 2.5}px rgba(${p.hue}, 0.2)`,
            willChange: 'transform, opacity',
          }}
          initial={{ opacity: 0.9, scale: 0.3 }}
          animate={{
            opacity: [0.9, 0.5, 0],
            scale: [0.3, 1.2, 0.1],
            x: [0, p.dx * 0.3, p.dx],
            y: [0, p.dy * 0.5, p.dy],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.6, 0.0, 0.4, 1.0], // cubic-bezier de decaimento
            times: [0, 0.4, 1],
          }}
        />
      ))}
    </AnimatePresence>
  );
}

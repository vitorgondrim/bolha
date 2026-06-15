// ============================================================
// SOPRO RIPPLE EFFECT — Ondas de sopro e anéis de atenção
// 
// 1. Quando um sopro é dado: anel verde-limão se expande da bolha
// 2. Quando uma bolha está "quente": ondas de atenção concêntricas
// 3. Bolhas vizinhas balançam com o sopro (efeito borboleta)
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

let ringIdCounter = 0;

/**
 * Hook que gerencia anéis de ondas (ripple rings)
 * Usado dentro do OrganicBubble para feedback de sopro e atenção
 */
export function useRippleRings() {
  const [rings, setRings] = useState([]);
  const timerRef = useRef(null);

  const addRing = useCallback((type = 'sopro', colorRgb = '57, 255, 20') => {
    const id = ++ringIdCounter;
    const ring = {
      id,
      type,
      colorRgb,
      scale: type === 'sopro' ? 1.8 : 2.5,
      duration: type === 'sopro' ? 0.8 : 1.5,
    };
    setRings(prev => [...prev, ring]);

    // Auto-remove após duração
    setTimeout(() => {
      setRings(prev => prev.filter(r => r.id !== id));
    }, ring.duration * 1000 + 100);
  }, []);

  const triggerSopro = useCallback(() => addRing('sopro', '57, 255, 20'), [addRing]);
  const triggerAttention = useCallback(() => addRing('attention', '245, 158, 11'), [addRing]);

  return { rings, triggerSopro, triggerAttention };
}

/**
 * Renderiza os anéis de ripple ao redor da bolha.
 * Deve ser colocado como filho direto do container da bolha.
 */
export function RippleRingsRenderer({ rings, size }) {
  return (
    <AnimatePresence>
      {rings.map((ring) => (
        <motion.div
          key={ring.id}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            // O anel começa do tamanho da bolha e expande
            border: `1.5px solid rgba(${ring.colorRgb}, 0.5)`,
          }}
          initial={{ 
            opacity: 0.6, 
            scale: 1,
          }}
          animate={{ 
            opacity: 0, 
            scale: ring.scale,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: ring.duration,
            ease: [0.25, 0.1, 0.25, 1.0], // curva fluida
          }}
        />
      ))}
    </AnimatePresence>
  );
}

/**
 * Efeito "Bolha Vizinha Balança" — ativado quando uma bolha próxima recebe sopro
 */
export function useNeighborRock() {
  const [isRocking, setIsRocking] = useState(false);
  const timerRef = useRef(null);

  const rock = useCallback(() => {
    setIsRocking(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsRocking(false), 600);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const rockVariants = {
    rest: { rotate: 0 },
    rocking: {
      rotate: [0, -3, 4, -2, 1, 0],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
  };

  return { isRocking, rock, rockVariants };
}

// ============================================================
// SOPRO TRAIL — Partículas de ar viajando do HUD à bolha
// Usado no Feed.jsx, não dentro da bolha
// ============================================================

let trailIdCounter = 0;

export function useSoproTrails() {
  const [trails, setTrails] = useState([]);

  const spawnTrail = useCallback((fromX, fromY, toX, toY) => {
    const id = ++trailIdCounter;
    const trail = { id, fromX, fromY, toX, toY };
    setTrails(prev => [...prev, trail]);
    setTimeout(() => {
      setTrails(prev => prev.filter(t => t.id !== id));
    }, 900);
    return id;
  }, []);

  return { trails, spawnTrail };
}

export function SoproTrailRenderer({ trails }) {
  return (
    <AnimatePresence>
      {trails.map((trail) => (
        <motion.div
          key={trail.id}
          className="fixed pointer-events-none z-50"
          initial={{
            left: trail.fromX,
            top: trail.fromY,
            opacity: 0.8,
            scale: 0.5,
          }}
          animate={{
            left: trail.toX,
            top: trail.toY,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1.0],
          }}
        >
          {/* 3 partículas de ar */}
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3 + i * 1.5,
                height: 3 + i * 1.5,
                background: `rgba(57, 255, 20, ${0.5 - i * 0.15})`,
                filter: 'blur(2px)',
                left: i * 5,
                top: i * -4,
              }}
            />
          ))}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// ============================================================
// CONNECTION LINES — Fios neurais entre bolhas interagidas
// Renderizado como SVG sobreposto ao canvas do feed
// ============================================================

export function ConnectionLines({ bubbles, userId }) {
  const connectedBubbles = useMemo(() => {
    if (!userId) return [];
    return bubbles.filter(b => 
      b.likes?.includes(userId) || 
      b.sopros?.includes(userId)
    );
  }, [bubbles, userId]);

  if (connectedBubbles.length === 0) return null;

  // Calcula bounding box do canvas para posicionar as linhas
  // As coordenadas vêm do computeSpatialProps como percentuais
  return (
    <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }}>
      {connectedBubbles.map((b, i) => {
        const x1 = `${b._posX || 50}%`;
        const y1 = `${b._posY || 50}%`;
        // Centraliza no meio (mente coletiva)
        const cx = '50%';
        const cy = '45%';
        
        return (
          <motion.path
            key={`conn-${b._id}`}
            d={`M ${cx} ${cy} Q ${(50 + (b._posX || 50)) / 2}% ${(45 + (b._posY || 45)) / 2}%, ${x1} ${y1}`}
            stroke={`rgba(124, 58, 237, ${0.03 + (b._glowIntensity || 0.5) * 0.1})`}
            strokeWidth={0.5 + (b._glowIntensity || 0.5) * 1.2}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0.6, 1, 0.6],
              opacity: [0.03, 0.12, 0.03],
            }}
            transition={{
              duration: 4 + (i % 3) * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        );
      })}
    </svg>
  );
}

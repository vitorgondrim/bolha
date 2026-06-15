// ============================================================
// ORGANIC NOISE — Perlin-like noise 1D para movimentos orgânicos
// Faz cada bolha ter "personalidade" de movimento única
// ============================================================

/**
 * Hash simples de string para gerar seed numérico
 */
export const hashSeed = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // mantém 32-bit
  }
  return Math.abs(hash) / 2147483647; // normaliza para 0–1
};

/**
 * Noise 1D suave — combinação de 3 ondas senoidais com frequências
 * diferentes para criar um movimento não-periódico e orgânico.
 * Cada bolha recebe um seed único baseado no _id.
 */
export const organicNoise = (t, seed = 0.5) => {
  const s1 = seed;
  const s2 = seed * 2.3;
  const s3 = seed * 0.7;
  
  return (
    Math.sin(t * 0.8 + s1 * Math.PI * 2) * 0.5 +
    Math.sin(t * 1.7 + s2 * Math.PI * 2) * 0.3 +
    Math.sin(t * 3.2 + s3 * Math.PI * 2) * 0.15 +
    Math.sin(t * 5.7 + seed * Math.PI * 4) * 0.05
  );
};

/**
 * Gera um valor de flutuação vertical para uma bolha em um dado timestamp.
 * amplitude: máximo deslocamento em pixels (default 12px)
 */
export const floatOffset = (id, time, amplitude = 12) => {
  const seed = hashSeed(id);
  return organicNoise(time * 0.5, seed) * amplitude;
};

/**
 * Gera um valor de rotação sutil para drifting.
 */
export const driftRotation = (id, time, maxDeg = 1.5) => {
  const seed = hashSeed(id);
  return organicNoise(time * 0.3, seed + 0.5) * maxDeg;
};

/**
 * Gera um valor de escala pulsante (para bolhas que estão 'vivas').
 */
export const pulseScale = (id, time, intensity = 0.05) => {
  const seed = hashSeed(id);
  return 1 + organicNoise(time * 1.2, seed + 0.3) * intensity;
};

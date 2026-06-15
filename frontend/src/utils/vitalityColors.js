// ============================================================
// VITALITY COLORS — Paleta contínua de efemeridade
// Mapeia vitality (0–1) para cor, opacidade e glow
// Sem faixas discretas — transição suave e orgânica
//
// PALETA:
//   1.00 → 0.75  APOGEU:    roxo profundo → dourado (#7c3aed → #f59e0b)
//   0.75 → 0.50  ESTÁVEL:   dourado → ciano          (#f59e0b → #06b6d4)
//   0.50 → 0.30  ESFRIANDO: ciano → rosa             (#06b6d4 → #ff2d55)
//   0.30 → 0.10  DECAINDO:  rosa → vermelho intenso  (#ff2d55 → #dc2626)
//   0.10 → 0.00  MORRENDO:  vermelho → dissolução    (#dc2626 → rgba(220,38,38,0))
// ============================================================

/**
 * Interpolação linear entre dois valores RGB
 */
const lerpColor = (c1, c2, t) => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return { r, g, b };
};

/**
 * Interpolação com easing — suaviza a transição cromática
 * Usa ease-in-out cúbico para não ter bordas visíveis
 */
const easeInOutCubic = (t) => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Obtém a cor da vitalidade de forma contínua.
 * 
 * @param {number} vitality - 0 (morto) a 1 (pico)
 * @param {boolean} hasLeaked - se a bolha está em estado de vazamento
 * @returns {{ rgb: string, glow: string, borderOpacity: number, label: string }}
 */
export const getVitalityColor = (vitality, hasLeaked = false) => {
  // Se vazou, cor verde-limão fixa (exceção: estado viral)
  if (hasLeaked) {
    return {
      rgb: '57, 255, 20',
      glow: `rgba(57, 255, 20, ${0.15 + vitality * 0.35})`,
      borderOpacity: 0.3 + vitality * 0.4,
      label: 'lime',
      textVitality: Math.max(0.4, vitality), // Para o peso da fonte
    };
  }

  const t = easeInOutCubic(Math.max(0, Math.min(1, vitality)));
  let rgb;
  let label;

  // Faixas contínuas com sobreposição suave
  if (vitality > 0.75) {
    // Apogeu: roxo → dourado (0.75 → 1.0)
    const localT = (vitality - 0.75) / 0.25;
    rgb = lerpColor([124, 58, 237], [245, 158, 11], localT);
    label = 'dourado';
  } else if (vitality > 0.50) {
    // Estável: dourado → ciano (0.50 → 0.75)
    const localT = (vitality - 0.50) / 0.25;
    rgb = lerpColor([245, 158, 11], [6, 182, 212], localT);
    label = 'ciano';
  } else if (vitality > 0.30) {
    // Esfriando: ciano → rosa (0.30 → 0.50)
    const localT = (vitality - 0.30) / 0.20;
    rgb = lerpColor([6, 182, 212], [255, 45, 85], localT);
    label = 'rosa';
  } else if (vitality > 0.10) {
    // Decaindo: rosa → vermelho intenso (0.10 → 0.30)
    const localT = (vitality - 0.10) / 0.20;
    rgb = lerpColor([255, 45, 85], [220, 38, 38], localT);
    label = 'vermelho';
  } else {
    // Morrendo: vermelho → dissolução (0.00 → 0.10)
    // A cor se torna mais transparente e acinzentada
    const localT = vitality / 0.10;
    const faded = lerpColor([220, 38, 38], [80, 20, 30], 1 - localT);
    rgb = faded;
    label = 'dissolvendo';
  }

  // Brilho do glow: forte no apogeu, fraco na morte
  const glowIntensity = vitality > 0.7
    ? 0.15 + vitality * 0.25  // glow forte no pico
    : vitality * 0.2;          // glow fraco em declínio

  // Opacidade da borda: mais visível em vitalidade alta
  const borderOpacity = 0.06 + vitality * 0.34;

  return {
    rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    glow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowIntensity})`,
    borderOpacity,
    label,
    textVitality: Math.max(0.3, vitality), // Para peso da fonte no conteúdo
  };
};

/**
 * Obtém a cor da barra de progresso (gradiente CSS) baseada na vitalidade
 */
export const getProgressGradient = (vitalityPercent) => {
  if (vitalityPercent <= 15) {
    return 'bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400';
  }
  if (vitalityPercent <= 35) {
    return 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300';
  }
  if (vitalityPercent <= 55) {
    return 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500';
  }
  return 'bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400';
};

/**
 * Mapeia vitalidade para peso de fonte (texto dissolve com a bolha)
 */
export const getTextStyle = (vitality) => {
  if (vitality < 0.3) {
    const opacity = Math.max(0.15, vitality / 0.3);
    const blur = (1 - vitality / 0.3) * 2;
    return {
      opacity,
      filter: `blur(${blur}px)`,
      transition: 'opacity 0.5s ease, filter 0.5s ease',
    };
  }
  return {
    opacity: 0.6 + vitality * 0.4,
    filter: 'blur(0px)',
  };
};

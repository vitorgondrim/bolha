// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: utils/badgeUtils.js
// Propósito: Motor de Cálculo de Emblemas Dinâmico e Extensível (Sênior)
// ============================================================

// Sênior: Centralização das regras de negócio em um mapa de configuração limpo.
// Isola a regra do código executor, facilitando balanceamentos futuros no app.
const BADGE_CONFIG = {
  fura_bolha: {
    name: 'Fura-Bolha',
    description: 'Suas bolhas estouram a barreira e vazam para a rede geral.',
    tiers: [
      { id: 'Ouro', req: 20 },
      { id: 'Prata', req: 5 },
      { id: 'Bronze', req: 1 }
    ]
  },
  soprador_lendario: {
    name: 'Soprador Lendário',
    description: 'Usa a energia vital para manter vivas as bolhas da comunidade.',
    tiers: [
      { id: 'Ouro', req: 50 },
      { id: 'Prata', req: 15 },
      { id: 'Bronze', req: 3 }
    ]
  },
  o_estouro: {
    name: 'O Estouro',
    description: 'Persistência e autenticidade, postando sem medo do desapego.',
    tiers: [
      { id: 'Ouro', req: 50 },
      { id: 'Prata', req: 20 },
      { id: 'Bronze', req: 5 }
    ]
  },
  sobrevivente: {
    name: 'Sobrevivente',
    description: 'Manteve uma bolha ativa contra as forças do tempo.',
    tiers: [
      { id: 'Neon', req: 120 }, // Exclusivo de redes efêmeras
      { id: 'Ouro', req: 48 },
      { id: 'Prata', req: 24 },
      { id: 'Bronze', req: 5 }
    ],
    isTimeBased: true // Flag para tratamento de formatação
  }
};

/**
 * Função Pura: Processa as estatísticas de um usuário e extrai o Tier alcançado
 */
const evaluateTier = (currentValue, configTiers) => {
  const activeTier = configTiers.find(tier => currentValue >= tier.req);
  return activeTier 
    ? { tier: activeTier.id, nextGoal: activeTier.req } 
    : { tier: 'Bloqueado', nextGoal: configTiers[configTiers.length - 1].req };
};

/**
 * Calcula em tempo de execução todos os emblemas disponíveis e seus respectivos progressos.
 */
exports.calculateBadges = (user) => {
  if (!user) return [];

  const timesLeaked = user.timesLeaked || 0;
  const totalSoprosGiven = user.totalSoprosGiven || 0;
  const totalBubblesCreated = user.totalBubblesCreated || 0;
  const maxBubbleLifeMinutes = user.maxBubbleLifeMinutes || 0;

  // Estatística inferida: bolhas criadas que estouraram localmente sem vazar
  const failedBubbles = Math.max(0, totalBubblesCreated - timesLeaked);
  const maxLifeHours = maxBubbleLifeMinutes / 60;

  // Mapeamento dinâmico de chaves para evitar ifs encadeados
  const metricsMap = {
    fura_bolha: timesLeaked,
    soprador_lendario: totalSoprosGiven,
    o_estouro: failedBubbles,
    sobrevivente: maxLifeHours
  };

  return Object.keys(BADGE_CONFIG).map(badgeId => {
    const config = BADGE_CONFIG[badgeId];
    const rawValue = metricsMap[badgeId];
    
    // Roda a esteira de avaliação baseada na configuração de tiers
    const { tier, nextGoal } = evaluateTier(rawValue, config.tiers);

    // Formatação customizada para o emblema de tempo (Sobrevivente)
    let displayCurrent = rawValue;
    let displayRequired = `${nextGoal}`;

    if (config.isTimeBased) {
      displayCurrent = `${Math.floor(maxLifeHours)}h ${Math.floor(maxBubbleLifeMinutes % 60)}min`;
      displayRequired = `${nextGoal}h${nextGoal === 120 ? '+' : ''}`;
    }

    return {
      id: badgeId,
      name: config.name,
      description: config.description,
      tier,
      currentValue: displayCurrent,
      requiredValue: displayRequired
    };
  });
};
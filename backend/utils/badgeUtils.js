// ============================================================
// UTILITÁRIO: CÁLCULO DE EMBLEMAS
// Função pura que recebe um usuário e retorna seus emblemas.
// Centralizada aqui para ser usada tanto no perfil próprio
// quanto no perfil público.
// ============================================================

const calculateBadges = (user) => {
  const badges = [];

  // ============================================================
  // 1. FURA-BOLHA
  // Quantas vezes as bolhas do usuário atingiram 12+ pontos
  // e vazaram para a rede geral.
  // ============================================================
  let furaBolhaTier = 'Bloqueado';
  if (user.timesLeaked >= 20) furaBolhaTier = 'Ouro';
  else if (user.timesLeaked >= 5) furaBolhaTier = 'Prata';
  else if (user.timesLeaked >= 1) furaBolhaTier = 'Bronze';
  
  badges.push({
    id: 'fura_bolha',
    name: 'Fura-Bolha',
    description: 'Suas bolhas estouram a barreira e vazam para a rede geral.',
    tier: furaBolhaTier,
    currentValue: user.timesLeaked,
    requiredValue: furaBolhaTier === 'Ouro' ? 20 : (furaBolhaTier === 'Prata' ? 5 : 1)
  });

  // ============================================================
  // 2. SOPRADOR LENDÁRIO
  // Quantos sopros o usuário deu para bolhas de outras pessoas.
  // ============================================================
  let sopradorTier = 'Bloqueado';
  if (user.totalSoprosGiven >= 50) sopradorTier = 'Ouro';
  else if (user.totalSoprosGiven >= 15) sopradorTier = 'Prata';
  else if (user.totalSoprosGiven >= 3) sopradorTier = 'Bronze';

  badges.push({
    id: 'soprador_lendario',
    name: 'Soprador Lendário',
    description: 'Usa a energia vital para manter vivas as bolhas da comunidade.',
    tier: sopradorTier,
    currentValue: user.totalSoprosGiven,
    requiredValue: sopradorTier === 'Ouro' ? 50 : (sopradorTier === 'Prata' ? 15 : 3)
  });

  // ============================================================
  // 3. O ESTOURO
  // Bolhas criadas que NÃO vazaram (persistência e autenticidade).
  // ============================================================
  const failedBubbles = Math.max(0, user.totalBubblesCreated - user.timesLeaked);
  let estouroTier = 'Bloqueado';
  if (failedBubbles >= 50) estouroTier = 'Ouro';
  else if (failedBubbles >= 20) estouroTier = 'Prata';
  else if (failedBubbles >= 5) estouroTier = 'Bronze';

  badges.push({
    id: 'o_estouro',
    name: 'O Estouro',
    description: 'Persistência e autenticidade, postando sem medo do desapego.',
    tier: estouroTier,
    currentValue: failedBubbles,
    requiredValue: estouroTier === 'Ouro' ? 50 : (estouroTier === 'Prata' ? 20 : 5)
  });

  // ============================================================
  // 4. SOBREVIVENTE
  // Maior tempo de vida de uma única bolha do usuário.
  // Tier "Neon" é o mais raro: 120+ horas.
  // ============================================================
  let sobreviventeTier = 'Bloqueado';
  const hours = user.maxBubbleLifeMinutes / 60;
  if (hours >= 120) sobreviventeTier = 'Neon';
  else if (hours >= 48) sobreviventeTier = 'Ouro';
  else if (hours >= 24) sobreviventeTier = 'Prata';
  else if (hours >= 5) sobreviventeTier = 'Bronze';

  badges.push({
    id: 'sobrevivente',
    name: 'Sobrevivente',
    description: 'Manteve uma bolha ativa por muito tempo.',
    tier: sobreviventeTier,
    currentValue: `${Math.floor(hours)}h ${Math.floor(user.maxBubbleLifeMinutes % 60)}min`,
    requiredValue: sobreviventeTier === 'Neon' ? '120h+' : 
                   (sobreviventeTier === 'Ouro' ? '48h' : 
                   (sobreviventeTier === 'Prata' ? '24h' : '5h'))
  });

  return badges;
};

module.exports = { calculateBadges };
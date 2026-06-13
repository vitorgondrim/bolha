// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: utils/soproUtils.js
// Propósito: Controle de Recarga de Créditos Diários de Sopros (Sênior)
// ============================================================

/**
 * Garante que o contador de sopros seja resetado de forma justa às 00:00 UTC.
 * Corrigido: usa dailySoprosUsed (consistente com o User model)
 */
const resetDailySoprosIfNeeded = async (user) => {
  if (!user) return;

  const now = new Date();
  
  // Se o campo vier nulo ou inválido de registros antigos, inicializa com segurança
  const lastReset = user.lastSoproReset ? new Date(user.lastSoproReset) : new Date(0);
  
  if (isNaN(lastReset.getTime())) {
    user.dailySoprosUsed = 0; // Reseta para 0 sopros usados hoje
    user.lastSoproReset = now;
    await user.save();
    return;
  }

  // Comparação estrita de dias usando o calendário UTC absoluto
  const isNewDay = 
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate();

  // Se o dia mudou, reseta o contador de sopros usados
  if (isNewDay) {
    user.dailySoprosUsed = 0; // Reseta para 0 sopros usados hoje
    user.lastSoproReset = now;
    await user.save();
  }
};

/**
 * Retorna quantos sopros restam hoje
 */
const getRemainingDailySopros = (user) => {
  if (!user) return 0;
  const maxDailySopros = 3; // Limite diário padrão
  const used = user.dailySoprosUsed || 0;
  return Math.max(0, maxDailySopros - used);
};

/**
 * Retorna total de sopros disponíveis (diários restantes + comprados)
 */
const getTotalAvailableSopros = (user) => {
  if (!user) return 0;
  const dailyRemaining = getRemainingDailySopros(user);
  const purchased = user.soprosPurchased || 0;
  return dailyRemaining + purchased;
};

module.exports = { 
  resetDailySoprosIfNeeded,
  getRemainingDailySopros,
  getTotalAvailableSopros
};
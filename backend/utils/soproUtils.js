// ============================================================
// UTILITÁRIO: SOPROS DIÁRIOS
// Garante que o contador de sopros gratuitos seja resetado às 00:00.
// Centraliza a lógica para o profile e para o uso de sopros.
// ============================================================

const resetDailySoprosIfNeeded = async (user) => {
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastReset = user.lastSoproReset ? new Date(user.lastSoproReset) : new Date(0);
  if (Number.isNaN(lastReset.getTime())) {
    user.dailySoprosUsed = 0;
    user.lastSoproReset = new Date();
    await user.save();
    return;
  }

  lastReset.setHours(0, 0, 0, 0);
  if (lastReset < today) {
    user.dailySoprosUsed = 0;
    user.lastSoproReset = new Date();
    await user.save();
  }
};

module.exports = { resetDailySoprosIfNeeded };
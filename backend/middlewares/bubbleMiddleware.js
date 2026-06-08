// ============================================================
// MIDDLEWARE: VALIDAÇÃO DE BOLHA
// Usado em rotas que precisam de uma bolha específica.
// Verifica se a bolha existe e se ainda está viva (não expirou).
// Anexa a bolha ao req para uso nos controllers.
// ============================================================

const Bubble = require('../models/Bubble');

const bubbleExistsAndAlive = async (req, res, next) => {
  try {
    const bubble = await Bubble.findById(req.params.id);
    
    if (!bubble) {
      return res.status(404).json({ message: 'Bolha não encontrada.' });
    }

    // Verifica se a bolha já expirou
    if (bubble.expiresAt < new Date()) {
      return res.status(404).json({ message: 'Esta bolha já estourou.' });
    }

    // Anexa a bolha ao request (controllers usam req.bubble)
    req.bubble = bubble;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erro ao validar bolha.' });
  }
};

module.exports = { bubbleExistsAndAlive };
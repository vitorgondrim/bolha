// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: middlewares/bubbleMiddleware.js
// Propósito: Validação e Ciclo de Vida de Entidades Efêmeras (Sênior)
// ============================================================

const mongoose = require('mongoose');
const Bubble = require('../models/Bubble');

/**
 * Middleware Sênior: Verifica a existência e o estado vital da Bolha.
 * Garante performance cirúrgica e previne falhas de concorrência.
 */
const bubbleExistsAndAlive = async (req, res, next) => {
  try {
    const bubbleId = req.params.id;

    // Sênior: Fail-Fast defensivo contra IDs malformados que quebram o Mongoose
    if (!mongoose.Types.ObjectId.isValid(bubbleId)) {
      return res.status(400).json({ message: 'O identificador da bolha fornecido é inválido.' });
    }

    // Sênior: Traz apenas o necessário para a validação básica e usa .lean()
    // Deixamos os controllers buscarem os dados mutáveis via queries atômicas.
    const bubbleMeta = await Bubble.findById(bubbleId)
      .select('expiresAt author hasLeaked')
      .lean();
    
    if (!bubbleMeta) {
      return res.status(404).json({ message: 'Bolha não encontrada ou já removida.' });
    }

    // Sênior: Validação temporal estrita
    const now = new Date();
    if (new Date(bubbleMeta.expiresAt) <= now) {
      return res.status(410).json({ message: 'Esta bolha já estourou e sumiu no tempo.' }); 
      // Código HTTP 410 (Gone) é semanticamente perfeito para recursos efêmeros que expiraram!
    }

        // Anexa apenas os metadados de leitura essenciais ao request
    req.bubbleMeta = bubbleMeta;
    // CORRECAO: Define req.bubble também para compatibilidade com controllers
    // que esperam req.bubble (ex: toggleLike, toggleDislike, etc.)
    req.bubble = bubbleMeta;
    
    return next();
  } catch (error) {
    return next(error); // Encaminha o erro para o centralizador global do server.js
  }
};

module.exports = { bubbleExistsAndAlive };
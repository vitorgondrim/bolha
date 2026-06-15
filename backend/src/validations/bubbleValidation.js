// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: validations/bubbleValidation.js
// Propósito: Re-exporta o schema compartilhado do Zod
//            Consistente com o resto do projeto (CommonJS)
// ============================================================

const { bubbleSchema } = require('../../../shared/schemas/bubbleSchema');

module.exports = { bubbleSchema };
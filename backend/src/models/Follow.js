// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: models/Follow.js
// Propósito: Tabela Relacional Indexada de Conexões (Sênior)
// ============================================================

const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  // Usuário que executa a ação de seguir
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Usuário que está sendo seguido
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true // Registra o momento exato em que a conexão foi feita
});

// Sênior: Índice Composto Único. Impede que o mesmo usuário siga a mesma pessoa 
// duas vezes através de requisições concorrentes ou bugs de interface.
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Índice invertido: Otimiza a busca reversa (Ex: "Quem são os seguidores deste perfil?")
followSchema.index({ following: 1 });

const Follow = mongoose.model('Follow', followSchema);
module.exports = Follow;
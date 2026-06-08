// ============================================================
// MODEL: BUBBLE
// Representa uma bolha (postagem efêmera) no sistema.
// Cada bolha tem 24h de vida, que se expande ou contrai
// com base nas interações (likes, comentários, sopros).
// ============================================================

const mongoose = require('mongoose');

// ============================================================
// SUB-SCHEMA: COMENTÁRIO
// Embedado dentro da bolha para consultas mais rápidas.
// Cada comentário pertence a uma bolha e tem um autor.
// ============================================================
const commentSchema = new mongoose.Schema({
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true, 
    maxlength: 280 // Limite estilo Twitter
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// ============================================================
// SCHEMA PRINCIPAL: BOLHA
// ============================================================
const bubbleSchema = new mongoose.Schema({
  // Título da bolha (obrigatório, aparece nas bolhas flutuantes)
  title: {
    type: String,
    required: [true, 'O título é obrigatório'],
    trim: true,
    maxlength: 60,
  },
  
  // Assunto/categoria (filtro no feed)
  subject: {
    type: String,
    trim: true,
    maxlength: 30,
    default: 'Geral',
  },
  
  // Conteúdo principal da bolha
  content: {
    type: String,
    required: [true, 'O conteúdo é obrigatório'],
    trim: true,
    maxlength: 500,
  },
  
  // URL da mídia (imagem/GIF) - pode ser upload local ou URL externa
  mediaUrl: {
    type: String,
    trim: true,
    default: null,
  },
  
  // Tipo de mídia (para renderização correta no frontend)
  mediaType: {
    type: String,
    enum: ['image', 'gif', 'video', null],
    default: null,
  },
  
  // Autor da bolha
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Data de criação
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Data de expiração (24h após criação, ajustada por interações)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 horas
  },
  
  // Usuários que curtiram a bolha (+10min cada)
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Usuários que deram dislike (-15min cada)
  dislikes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Usuários que usaram sopro (+120min cada, 1 por usuário)
  sopros: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Comentários embedados
  comments: [commentSchema],
  
  // Se a bolha foi criada anonimamente
  isAnonymous: { 
    type: Boolean, 
    default: false 
  },
  
  // Referência à bolha "mãe" (para sub-bolhas/respostas)
  parentBubble: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bubble', 
    default: null 
  },
  
  // Se a bolha "vazou" (atingiu 12+ pontos de engajamento)
  hasLeaked: { 
    type: Boolean, 
    default: false 
  },
}, { 
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// ============================================================
// ÍNDICES DE PERFORMANCE
// Essenciais para consultas rápidas no feed e jobs de expiração.
// ============================================================

// Índice composto para o feed principal (mais consultado)
bubbleSchema.index({ createdAt: -1, parentBubble: 1, hasLeaked: 1 });

// Índice para a página de "Vazadas"
bubbleSchema.index({ hasLeaked: 1, expiresAt: -1 });

// TTL Index: MongoDB remove automaticamente bolhas expiradas
bubbleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Índice para filtro por assunto
bubbleSchema.index({ subject: 1 });

const Bubble = mongoose.model('Bubble', bubbleSchema);
module.exports = Bubble;
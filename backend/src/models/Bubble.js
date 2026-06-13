// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: models/Bubble.js
// Propósito: Definição de Estrutura e Índices de Alta Concorrência (Sênior)
//            Atualizado: Campos do sistema Mente Coletiva (Oxygen Level,
//            Hierarquia, Herança e Agrupamento Visual)
// ============================================================

const mongoose = require('mongoose');

// ============================================================
// SUB-SCHEMA: COMENTÁRIO (Injetado)
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
    trim: true,
    maxlength: 280
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

commentSchema.index({ author: 1 });

// ============================================================
// SUB-SCHEMA: REGISTRO DE HERANÇA (Promoção)
// ============================================================
const inheritanceRecordSchema = new mongoose.Schema({
  originalParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bubble',
    required: true,
  },
  promotedAt: {
    type: Date,
    default: Date.now,
  },
  inheritedOxygenAtPromotion: {
    type: Number,
    required: true,
  },
}, { _id: false });

// ============================================================
// SUB-SCHEMA: INJEÇÃO DE OXIGÊNIO
// ============================================================
const oxygenInjectionSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['like', 'comment', 'sopro', 'promotion'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  byUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  at: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

// ============================================================
// SUB-SCHEMA: VETOR DE SIMILARIDADE TEMÁTICA
// ============================================================
const subjectVectorSchema = new mongoose.Schema({
  keyword: { type: String },
  weight: { type: Number },
}, { _id: false });

// ============================================================
// SCHEMA PRINCIPAL: BOLHA
// ============================================================
const bubbleSchema = new mongoose.Schema({
  // --- CAMPOS ORIGINAIS (preservados) ---
  title: {
    type: String,
    required: [true, 'O título é obrigatório'],
    trim: true,
    maxlength: 60,
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 30,
    default: 'Geral',
  },
  content: {
    type: String,
    required: [true, 'O conteúdo é obrigatório'],
    trim: true,
    maxlength: 500,
  },
  mediaUrl: {
    type: String,
    trim: true,
    default: null,
  },
  mediaType: {
    type: String,
    enum: ['image', 'gif', 'video', null],
    default: null,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  dislikes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  sopros: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  comments: [commentSchema],
  isAnonymous: { 
    type: Boolean, 
    default: false 
  },
  parentBubble: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bubble', 
    default: null 
  },
  hasLeaked: { 
    type: Boolean, 
    default: false 
  },

  // ============================================================
  // NOVOS CAMPOS: HIERARQUIA (Mente Coletiva)
  // ============================================================
  parentBubbleAuthor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  childrenBubbles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bubble',
  }],
  depthLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  inheritanceChain: {
    type: [inheritanceRecordSchema],
    default: [],
  },
  isOrphan: {
    type: Boolean,
    default: false,
  },
  promotedFromChild: {
    type: Boolean,
    default: false,
  },

  // ============================================================
  // NOVOS CAMPOS: VITALIDADE (Oxygen Level)
  // ============================================================
  oxygenLevel: {
    type: Number,
    default: 100,
    min: 0,
    max: 1000,
  },
  maxOxygen: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000,
  },
  oxygenDecayRate: {
    type: Number,
    default: 4.1667,
    min: 0.5,
    max: 50,
  },
  lastOxygenDecayCheck: {
    type: Date,
    default: Date.now,
  },
  oxygenInjections: {
    type: [oxygenInjectionSchema],
    default: [],
  },

  // ============================================================
  // NOVOS CAMPOS: AGRUPAMENTO VISUAL
  // ============================================================
  gravityCenter: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  subjectVector: {
    type: [subjectVectorSchema],
    default: [],
  },

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================
// PROPRIEDADES VIRTUAIS
// ============================================================
bubbleSchema.virtual('likeCount').get(function() { return this.likes?.length || 0; });
bubbleSchema.virtual('dislikeCount').get(function() { return this.dislikes?.length || 0; });
bubbleSchema.virtual('soproCount').get(function() { return this.sopros?.length || 0; });
bubbleSchema.virtual('commentCount').get(function() { return this.comments?.length || 0; });
bubbleSchema.virtual('oxygenPercentage').get(function() {
  if (!this.maxOxygen || this.maxOxygen <= 0) return 0;
  return Math.round((this.oxygenLevel / this.maxOxygen) * 100);
});
bubbleSchema.virtual('isCritical').get(function() {
  return this.oxygenPercentage <= 15;
});
bubbleSchema.virtual('isDead').get(function() {
  return this.oxygenLevel <= 0;
});

// ============================================================
// ÍNDICES DE PERFORMANCE
// ============================================================
// Índice composto para feed principal (raízes ativas não órfãs)
bubbleSchema.index({ parentBubble: 1, hasLeaked: 1, oxygenLevel: -1, createdAt: -1 });

// Índice para buscar filhas de uma bolha específica
bubbleSchema.index({ parentBubble: 1, oxygenLevel: -1 });

// Índice para orphan detection
bubbleSchema.index({ isOrphan: 1, oxygenLevel: 1 });

// Índice para busca de bolhas por autor específico
bubbleSchema.index({ author: 1, expiresAt: 1 });

// Índice composto para filtragem por Categoria/Assunto no Feed
bubbleSchema.index({ subject: 1, expiresAt: 1 });

// Índice de similaridade temática
bubbleSchema.index({ subjectVector: 1 });

// Índice TTL para limpeza física (7 dias após oxygen chegar a 0)
bubbleSchema.index({ updatedAt: 1 }, { 
  expireAfterSeconds: 604800,
  partialFilterExpression: { oxygenLevel: { $lte: 0 } }
});

const Bubble = mongoose.model('Bubble', bubbleSchema);
module.exports = Bubble;
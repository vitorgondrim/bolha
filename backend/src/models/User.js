// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: models/User.js
// Propósito: Modelo de Usuário e Controle de Gamificação (Sênior)
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ============================================================
  // IDENTIFICAÇÃO E CREDENCIAIS
  // ============================================================
  username: {
    type: String,
    required: [true, 'O nome de usuário é obrigatório.'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Mínimo 3 caracteres.'],
    maxlength: [20, 'Máximo 20 caracteres.'],
    match: [/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underlines.'],
  },
  email: {
    type: String,
    required: [true, 'O e-mail é obrigatório.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'E-mail inválido.'],
  },
  password: {
    type: String,
    minlength: [6, 'Mínimo 6 caracteres.'],
    // Sênior: Removemos o 'sparse' daqui pois não há restrição de unique na senha
  },
  
  // Nível de acesso (Utilizado nos middlewares de segurança)
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },

  // ============================================================
  // OAUTH PROTOCOLS (GOOGLE)
  // ============================================================
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Permite múltiplos registros nulos para usuários locais
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  // ============================================================
  // METADADOS DO PERFIL
  // ============================================================
  bio: {
    type: String,
    maxlength: [160, 'A biografia não pode conter mais de 160 caracteres.'],
    default: '',
  },
  coverUrl: {
    type: String,
    default: null,
  },
  avatarUrl: {
    type: String,
    default: null,
  },

  // ============================================================
  // REDE SOCIAL (Contadores Atômicos - Alta Performance)
  // Sênior: Retiramos os arrays brutos de IDs para evitar estouro de 16MB do documento.
  // As listagens reais serão feitas cruzando uma coleção pivot de 'Follows'.
  // ============================================================
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },

  // ============================================================
  // RECOMPENSAS E GAMIFICAÇÃO
  // ============================================================
  totalBubblesCreated: {
    type: Number,
    default: 0,
  },
  timesLeaked: {
    type: Number,
    default: 0,
  },
  totalSoprosGiven: {
    type: Number,
    default: 0,
  },
  maxBubbleLifeMinutes: {
    type: Number,
    default: 0,
  },
  pinnedBadge: {
    type: String,
    default: null,
  },

  // ============================================================
  // ECONOMIA DE RECURSOS (SOPROS)
  // ============================================================
  dailySoprosUsed: {
    type: Number,
    default: 0,
  },
  lastSoproReset: {
    type: Date,
    default: () => new Date(0),
  },
  soprosPurchased: {
    type: Number,
    default: 0,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ÍNDICE DE PERFORMANCE: Otimiza buscas de login e renderizações de perfis públicos
userSchema.index({ username: 1, email: 1 });

// ============================================================
// MIDDLEWARE: HASH DE SENHA DEFENSIVO (CORRIGIDO)
// ============================================================
// Sênior: Mongoose v9 não aceita mais callback `next` em pre hooks.
// Em vez disso, basta retornar ou lançar erro.
userSchema.pre('save', function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = bcrypt.genSaltSync(12);
  this.password = bcrypt.hashSync(this.password, salt);
});

// ============================================================
// INSTANCE METHODS: VALIDAÇÃO DE SENHA
// ============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Tratamento preventivo caso o usuário logue via Google e não possua senha cadastrada
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
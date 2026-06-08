// ============================================================
// MODEL: USER
// Representa um usuário da plataforma.
// Suporta autenticação local (email/senha) e Google OAuth.
// Armazena estatísticas para gamificação (emblemas).
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ============================================================
  // IDENTIFICAÇÃO
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
  
  // ============================================================
  // AUTENTICAÇÃO
  // ============================================================
  
  // ID único do Google (apenas para contas Google)
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Permite múltiplos null (contas locais)
  },
  
  // Provedor de autenticação ('local' = email/senha, 'google' = OAuth)
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  
  // Senha com hash bcrypt (sparse: usuários Google não têm senha)
  password: {
    type: String,
    minlength: [6, 'Mínimo 6 caracteres.'],
    sparse: true,
  },
  
  // Data de criação da conta
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  // ============================================================
  // PERFIL
  // ============================================================
  
  // Biografia (até 160 caracteres, estilo Twitter)
  bio: {
    type: String,
    maxlength: [160, 'Máximo 160 caracteres.'],
    default: '',
  },
  
  // URL da imagem de capa do perfil
  coverUrl: {
    type: String,
    default: null,
  },
  
  // URL do avatar
  avatarUrl: {
    type: String,
    default: null,
  },
  
  // ============================================================
  // REDE SOCIAL
  // ============================================================
  
  // Quem segue este usuário
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Quem este usuário segue
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // ============================================================
  // GAMIFICAÇÃO - ESTATÍSTICAS
  // ============================================================
  
  // Total de bolhas criadas (vivas ou expiradas)
  totalBubblesCreated: {
    type: Number,
    default: 0,
  },
  
  // Quantas vezes as bolhas do usuário "vazaram"
  timesLeaked: {
    type: Number,
    default: 0,
  },
  
  // Total de sopros dados a outras bolhas
  totalSoprosGiven: {
    type: Number,
    default: 0,
  },
  
  // Maior tempo de vida de uma bolha (em minutos)
  maxBubbleLifeMinutes: {
    type: Number,
    default: 0,
  },
  
  // Emblema fixado no perfil
  pinnedBadge: {
    type: String,
    default: null,
  },
  
  // ============================================================
  // SISTEMA DE SOPROS
  // ============================================================
  
  // Sopros gratuitos usados hoje (reseta às 00:00)
  dailySoprosUsed: {
    type: Number,
    default: 0,
  },
  
  // Data do último reset de sopros diários
  lastSoproReset: {
    type: Date,
    default: () => new Date(0),
  },
  
  // Sopros comprados (monetização futura)
  soprosPurchased: {
    type: Number,
    default: 0,
  },
  
}, { timestamps: true });

// ============================================================
// MIDDLEWARE: HASH DE SENHA
// Executado antes de salvar o usuário.
// Só faz o hash se a senha foi modificada e existe.
// ============================================================
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================================
// MÉTODO: COMPARAR SENHA
// Usado no login para verificar a senha informada.
// ============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
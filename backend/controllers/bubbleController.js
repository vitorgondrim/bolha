// ============================================================
// CONTROLLER: BOLHAS
// Coração da aplicação. Gerencia todo o ciclo de vida:
//   - Criação de bolhas (com upload de mídia)
//   - Feed geral (inclui bolhas vazadas)
//   - Interações (like, dislike, sopro, comentário)
//   - Sistema de vazamento (score ≥ 12)
//   - Expansão/contração do tempo de vida
// ============================================================

const Bubble = require('../models/Bubble');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateBadges } = require('../utils/badgeUtils');
const { resetDailySoprosIfNeeded } = require('../utils/soproUtils');

// Limite de score para vazamento (configurável via .env)
const LEAK_SCORE_THRESHOLD = process.env.LEAK_SCORE_THRESHOLD || 12;

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Cria uma notificação e emite via Socket.IO em tempo real.
 * Centralizada para evitar repetição de código.
 */
const createNotification = async (io, data) => {
  try {
    const notification = await Notification.create(data);
    io.to(`user_${data.recipient}`).emit('new_notification', notification);
    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
};

/**
 * Calcula o score de engajamento de uma bolha.
 * Fórmula: likes + (comentários × 3) + (sopros × 4) - (dislikes × 2)
 * Se score ≥ 12, a bolha "vaza".
 */
const calculateEngagementScore = (bubble) => {
  return (
    bubble.likes.length +
    bubble.comments.length * 3 +
    bubble.sopros.length * 4 -
    bubble.dislikes.length * 2
  );
};

/**
 * Verifica se a bolha atingiu o limiar de vazamento.
 * Se sim, marca hasLeaked = true, notifica o autor
 * e emite evento global via Socket.IO.
 */
const checkForLeak = async (bubble, io) => {
  if (bubble.hasLeaked) return;
  const score = calculateEngagementScore(bubble);
  if (score >= LEAK_SCORE_THRESHOLD) {
    bubble.hasLeaked = true;
    await bubble.save();
    await User.findByIdAndUpdate(bubble.author, { $inc: { timesLeaked: 1 } });
    await createNotification(io, {
      recipient: bubble.author,
      type: 'leak',
      bubbleId: bubble._id,
      content: `💨 VAZOU! Sua bolha gerou ${score} pontos de energia e vazou para a rede geral!`
    });
    io.emit('bubble_leaked', { bubbleId: bubble._id, score, threshold: LEAK_SCORE_THRESHOLD });
  }
};

/**
 * Atualiza o recorde de tempo de vida do usuário.
 * Usado para o emblema "Sobrevivente".
 */
const updateSurvivorRecord = async (user, bubble) => {
  const ageInMinutes = (Date.now() - new Date(bubble.createdAt).getTime()) / (1000 * 60);
  if (ageInMinutes > user.maxBubbleLifeMinutes) {
    user.maxBubbleLifeMinutes = Math.floor(ageInMinutes);
    await user.save();
  }
};

// ============================================================
// 1. CRIAR BOLHA
// Suporta upload direto de imagem (Multer) ou URL externa.
// ============================================================
exports.createBubble = async (req, res) => {
  try {
    const { title, subject, content, mediaUrl, mediaType, parentBubble, isAnonymous = false } = req.body;
    
    // Validações
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'O título da bolha é obrigatório.' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'O conteúdo não pode estar vazio.' });
    }
    if (title.length > 60) {
      return res.status(400).json({ message: 'Título: máximo 60 caracteres.' });
    }
    
    const bubbleData = {
      title: title.trim(),
      subject: subject?.trim() || 'Geral',
      content: content.trim(),
      author: req.user._id,
      isAnonymous
    };
    
    // Upload direto (arquivo enviado via Multer)
    if (req.file) {
      bubbleData.mediaUrl = `/uploads/${req.file.filename}`;
      bubbleData.mediaType = req.file.mimetype.includes('gif') ? 'gif' : 'image';
    } 
    // URL externa (fallback)
    else if (mediaUrl && mediaUrl.trim()) {
      bubbleData.mediaUrl = mediaUrl.trim();
      bubbleData.mediaType = mediaType || (mediaUrl.includes('.gif') ? 'gif' : 'image');
    }
    
    // Sub-bolha (resposta a uma bolha existente)
    if (parentBubble) {
      const parentExists = await Bubble.findById(parentBubble);
      if (!parentExists || parentExists.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Bolha mãe não encontrada ou já expirou.' });
      }
      bubbleData.parentBubble = parentBubble;
    }
    
    const newBubble = await Bubble.create(bubbleData);
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalBubblesCreated: 1 } });
    const populated = await newBubble.populate('author', 'username');
    
    // Notifica em tempo real
    if (parentBubble) req.io.to(parentBubble).emit('new_child_bubble', populated);
    req.io.emit('new_bubble', populated);
    
    res.status(201).json({
      message: '💨 Bolha soprada com sucesso! Ela desaparecerá em 24h.',
      bubble: populated,
    });
  } catch (error) {
    console.error('Erro createBubble:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ errors: Object.values(error.errors).map(e => e.message) });
    }
    res.status(500).json({ message: 'Erro ao criar bolha.' });
  }
};

// ============================================================
// 2. EXCLUIR BOLHA
// Apenas o autor pode excluir sua própria bolha.
// ============================================================
exports.deleteBubble = async (req, res) => {
  try {
    const bubble = req.bubble; // Carregado pelo bubbleMiddleware
    if (bubble.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Apenas o autor pode excluir esta bolha.' });
    }
    await Bubble.deleteOne({ _id: bubble._id });
    req.io.emit('bubble_deleted', { bubbleId: bubble._id });
    res.json({ message: 'Bolha excluída com sucesso.' });
  } catch (error) {
    console.error('Erro deleteBubble:', error);
    res.status(500).json({ message: 'Erro ao excluir bolha.' });
  }
};

// ============================================================
// 3. FEED GERAL
// Retorna todas as bolhas ativas (não expiradas, não sub-bolhas).
// ✅ Inclui bolhas vazadas (hasLeaked: true) para destaque no feed.
// ============================================================
exports.getAllBubbles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const bubbles = await Bubble.find({ 
      expiresAt: { $gt: new Date() }, 
      parentBubble: null // Apenas bolhas principais, não sub-bolhas
    })
      .populate('author', 'username')
      .populate({ path: 'comments.author', select: 'username', options: { limit: 20 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Bubble.countDocuments({ 
      expiresAt: { $gt: new Date() }, 
      parentBubble: null
    });
    
    res.json({ page, totalPages: Math.ceil(total / limit), total, count: bubbles.length, bubbles });
  } catch (error) {
    console.error('Erro getAllBubbles:', error);
    res.status(500).json({ message: 'Erro ao carregar feed.' });
  }
};

// ============================================================
// 4. MINHAS BOLHAS
// Retorna todas as bolhas do usuário logado.
// ============================================================
exports.getMyBubbles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const bubbles = await Bubble.find({ author: req.user._id })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Bubble.countDocuments({ author: req.user._id });
    res.json({ page, totalPages: Math.ceil(total / limit), total, bubbles });
  } catch (error) {
    console.error('Erro getMyBubbles:', error);
    res.status(500).json({ message: 'Erro ao buscar suas bolhas.' });
  }
};

// ============================================================
// 5. BUSCAR BOLHA POR ID
// Inclui a cadeia de bolhas "mãe" e sub-bolhas.
// ============================================================
const buildParentChain = async (bubble) => {
  const chain = [];
  let current = bubble;
  while (current.parentBubble) {
    const parent = await Bubble.findById(current.parentBubble)
      .populate('author', 'username')
      .select('content author parentBubble createdAt');
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
};

exports.getBubbleById = async (req, res) => {
  try {
    const bubble = await Bubble.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.author', 'username');
    if (!bubble || bubble.expiresAt < new Date()) {
      return res.status(404).json({ message: 'Bolha não encontrada ou já estourou.' });
    }
    const parentChain = await buildParentChain(bubble);
    const childBubbles = await Bubble.find({ parentBubble: bubble._id, expiresAt: { $gt: new Date() } })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ bubble, childBubbles, parentChain });
  } catch (error) {
    console.error('Erro getBubbleById:', error);
    res.status(500).json({ message: 'Erro ao buscar bolha.' });
  }
};

// ============================================================
// 6. LIKE / DESLIKE (TOGGLE)
// Like: +10 minutos de vida
// Se já curtiu, remove o like e subtrai o tempo.
// Remove dislike automaticamente se existir.
// ============================================================
exports.toggleLike = async (req, res) => {
  try {
    const bubble = req.bubble;
    const userId = req.user._id;
    const hasLiked = bubble.likes.includes(userId);
    
    if (hasLiked) {
      bubble.likes.pull(userId);
      bubble.expiresAt = new Date(bubble.expiresAt.getTime() - 10 * 60 * 1000);
    } else {
      if (bubble.dislikes.includes(userId)) bubble.dislikes.pull(userId);
      bubble.likes.push(userId);
      bubble.expiresAt = new Date(bubble.expiresAt.getTime() + 10 * 60 * 1000);
    }
    
    await bubble.save();
    await checkForLeak(bubble, req.io);
    await updateSurvivorRecord(req.user, bubble);
    
    if (!hasLiked && bubble.author.toString() !== userId.toString()) {
      await createNotification(req.io, {
        recipient: bubble.author,
        sender: userId,
        type: 'trending',
        bubbleId: bubble._id,
        content: '❤️ Alguém curtiu sua bolha! +10 minutos de vida.'
      });
    }
    
    req.io.to(bubble._id.toString()).emit('bubble_updated', {
      bubbleId: bubble._id,
      likesCount: bubble.likes.length,
      dislikesCount: bubble.dislikes.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
    });
    
    res.json({
      message: hasLiked ? 'Like removido.' : '❤️ Curtida! +10 minutos de vida.',
      likesCount: bubble.likes.length,
      dislikesCount: bubble.dislikes.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
    });
  } catch (error) {
    console.error('Erro toggleLike:', error);
    res.status(500).json({ message: 'Erro ao processar like.' });
  }
};

// ============================================================
// 7. DISLIKE (TOGGLE)
// Dislike: -15 minutos de vida.
// Remove like automaticamente se existir.
// ============================================================
exports.toggleDislike = async (req, res) => {
  try {
    const bubble = req.bubble;
    const userId = req.user._id;
    const hasDisliked = bubble.dislikes.includes(userId);
    
    if (hasDisliked) {
      bubble.dislikes.pull(userId);
      bubble.expiresAt = new Date(bubble.expiresAt.getTime() + 15 * 60 * 1000);
    } else {
      if (bubble.likes.includes(userId)) bubble.likes.pull(userId);
      bubble.dislikes.push(userId);
      bubble.expiresAt = new Date(bubble.expiresAt.getTime() - 15 * 60 * 1000);
    }
    
    await bubble.save();
    await checkForLeak(bubble, req.io);
    await updateSurvivorRecord(req.user, bubble);
    
    req.io.to(bubble._id.toString()).emit('bubble_updated', {
      bubbleId: bubble._id,
      likesCount: bubble.likes.length,
      dislikesCount: bubble.dislikes.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
    });
    
    res.json({
      message: hasDisliked ? 'Dislike removido.' : '👎 Dislike aplicado. -15 minutos.',
      likesCount: bubble.likes.length,
      dislikesCount: bubble.dislikes.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
    });
  } catch (error) {
    console.error('Erro toggleDislike:', error);
    res.status(500).json({ message: 'Erro ao processar dislike.' });
  }
};

// ============================================================
// 8. SOPRO
// +120 minutos de vida. 1 sopro por usuário por bolha.
// Consome 1 sopro gratuito (3/dia) ou 1 sopro comprado.
// Não pode soprar a própria bolha.
// ============================================================
exports.useSopro = async (req, res) => {
  try {
    const bubble = req.bubble;
    const user = req.user;
    
    if (bubble.author.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'Você não pode usar sopro na sua própria bolha.' });
    }
    if (bubble.sopros.includes(user._id)) {
      return res.status(400).json({ message: 'Você já usou um sopro nesta bolha.' });
    }
    
    await resetDailySoprosIfNeeded(user);
    
    let soproUsado = false;
    if (user.soprosPurchased > 0) {
      user.soprosPurchased -= 1;
      soproUsado = true;
    } else if (user.dailySoprosUsed < 3) {
      user.dailySoprosUsed += 1;
      soproUsado = true;
    }
    
    if (!soproUsado) {
      return res.status(400).json({ message: 'Sem sopros disponíveis. Compre mais!' });
    }
    
    user.totalSoprosGiven += 1;
    await user.save();
    
    await createNotification(req.io, {
      recipient: bubble.author,
      sender: user._id,
      type: 'sopro',
      bubbleId: bubble._id,
      content: '💨 Sua bolha recebeu um SOPRO VITAL! +120 minutos!'
    });
    
    bubble.sopros.push(user._id);
    
    const wasCritical = (bubble.expiresAt.getTime() - Date.now()) < 10 * 60 * 1000;
    const currentExpiresAt = bubble.expiresAt > new Date() ? bubble.expiresAt.getTime() : Date.now();
    bubble.expiresAt = new Date(currentExpiresAt + 120 * 60 * 1000);
    await bubble.save();
    
    if (wasCritical && !bubble.hasLeaked) {
      await createNotification(req.io, {
        recipient: bubble.author,
        sender: user._id,
        type: 'saved_from_expiry',
        bubbleId: bubble._id,
        content: `🎉 MILAGRE! ${user.username} salvou sua bolha no último minuto! +120 minutos!`
      });
    }
    
    await checkForLeak(bubble, req.io);
    await updateSurvivorRecord(user, bubble);
    
    req.io.to(bubble._id.toString()).emit('bubble_updated', {
      bubbleId: bubble._id,
      soprosCount: bubble.sopros.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
    });
    
    res.json({
      message: '💨 Sopro usado! +120 minutos!',
      soprosCount: bubble.sopros.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
      remainingDaily: 3 - user.dailySoprosUsed,
      purchasedSopros: user.soprosPurchased
    });
  } catch (error) {
    console.error('Erro useSopro:', error);
    res.status(500).json({ message: 'Erro ao usar sopro.' });
  }
};

// ============================================================
// 9. COMENTÁRIO
// +30 minutos de vida. Máximo 280 caracteres.
// Anti-spam: 30 segundos entre comentários do mesmo usuário.
// ============================================================
exports.addComment = async (req, res) => {
  try {
    const bubble = req.bubble;
    const { text } = req.body;
    
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Comentário não pode estar vazio.' });
    }
    
    const lastComment = bubble.comments
      .filter(c => c.author.toString() === req.user._id.toString())
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (lastComment && (Date.now() - new Date(lastComment.createdAt).getTime()) < 30000) {
      return res.status(429).json({ message: 'Aguarde 30 segundos para comentar novamente.' });
    }
    
    bubble.comments.push({ author: req.user._id, text: text.trim(), createdAt: new Date() });
    bubble.expiresAt = new Date(bubble.expiresAt.getTime() + 30 * 60 * 1000);
    await bubble.save();
    
    if (bubble.author.toString() !== req.user._id.toString()) {
      await createNotification(req.io, {
        recipient: bubble.author,
        sender: req.user._id,
        type: 'comment',
        bubbleId: bubble._id,
        content: '💬 Comentaram na sua bolha! +30 minutos de vida.'
      });
    }
    
    const populated = await bubble.populate('comments.author', 'username');
    await checkForLeak(bubble, req.io);
    await updateSurvivorRecord(req.user, bubble);
    
    req.io.to(bubble._id.toString()).emit('bubble_updated', {
      bubbleId: bubble._id,
      commentsCount: bubble.comments.length,
      expiresAt: bubble.expiresAt,
      hasLeaked: bubble.hasLeaked,
    });
    
    res.status(201).json({
      message: 'Comentário adicionado! +30 minutos de vida.',
      comments: populated.comments,
      hasLeaked: bubble.hasLeaked,
    });
  } catch (error) {
    console.error('Erro addComment:', error);
    res.status(500).json({ message: 'Erro ao adicionar comentário.' });
  }
};

// ============================================================
// 10. BOLHAS VAZADAS
// Página dedicada para bolhas que atingiram o limiar de vazamento.
// ============================================================
exports.getLeakedBubbles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const leaked = await Bubble.find({ hasLeaked: true, expiresAt: { $gt: new Date() } })
      .populate('author', 'username')
      .populate({ path: 'comments.author', select: 'username', options: { limit: 20 } })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Bubble.countDocuments({ hasLeaked: true, expiresAt: { $gt: new Date() } });
    res.json({ page, totalPages: Math.ceil(total / limit), total, count: leaked.length, leaks: leaked });
  } catch (error) {
    console.error('Erro getLeakedBubbles:', error);
    res.status(500).json({ message: 'Erro ao buscar bolhas vazadas.' });
  }
};

// ============================================================
// 11. PERFIL DO USUÁRIO (com emblemas)
// ============================================================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const activeBubbles = await Bubble.find({ author: req.user._id, expiresAt: { $gt: new Date() } }).sort({ expiresAt: 1 }).limit(50);
    const badges = calculateBadges(user);
    const hasLeakedBubble = activeBubbles.some(bubble => bubble.hasLeaked === true);
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.googleId;
    res.json({
      user: { ...userObj, followerCount: user.followers.length, followingCount: user.following.length, isNeon: hasLeakedBubble },
      activeBubbles,
      badges
    });
  } catch (error) {
    console.error('Erro getProfile:', error);
    res.status(500).json({ message: 'Erro ao buscar perfil com conquistas.' });
  }
};

// ============================================================
// 12. HISTÓRICO DE BOLHAS DE UM USUÁRIO
// ============================================================
exports.getUserBubbles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const bubbles = await Bubble.find({ author: userId })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Bubble.countDocuments({ author: userId });
    res.json({ page, totalPages: Math.ceil(total / limit), total, bubbles });
  } catch (error) {
    console.error('Erro getUserBubbles:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico do usuário.' });
  }
};
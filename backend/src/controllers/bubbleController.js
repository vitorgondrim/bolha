// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: controllers/bubbleController.js
// Propósito: Controle de Bolhas de Alta Performance e Resiliência (Sênior)
// ============================================================

const Bubble = require('../models/Bubble');
const User = require('../models/User');
const Follow = require('../models/Follow'); 
const Notification = require('../models/Notification');
const Wallet = require('../models/Wallet');
const { calculateBadges } = require('../utils/badgeUtils');
const { resetDailySoprosIfNeeded } = require('../utils/soproUtils');
const { injectOxygen } = require('../services/bubbleService');
const logger = require('../utils/logger');
const { deleteOldFile } = require('./uploadController');

const LEAK_SCORE_THRESHOLD = parseInt(process.env.LEAK_SCORE_THRESHOLD, 10) || 12;

// ============================================================
// FUNÇÕES AUXILIARES CONFIÁVEIS
// ============================================================

const createNotification = async (io, data) => {
  try {
    const notification = await Notification.create(data);
    if (io) io.to(`user_${data.recipient}`).emit('new_notification', notification);
    return notification;
  } catch (error) {
    logger.error('Erro ao criar notificacao:', { error: error.message });
  }
};

const calculateEngagementScore = (bubble) => {
  const likesCount = bubble.likes?.length || 0;
  const commentsCount = bubble.comments?.length || 0;
  const soprosCount = bubble.sopros?.length || 0;
  const dislikesCount = bubble.dislikes?.length || 0;

  return likesCount + (commentsCount * 3) + (soprosCount * 4) - (dislikesCount * 2);
};

const checkForLeak = async (bubble, io) => {
  if (bubble.hasLeaked) return;
  
  const score = calculateEngagementScore(bubble);
  if (score >= LEAK_SCORE_THRESHOLD) {
    const updatedBubble = await Bubble.findOneAndUpdate(
      { _id: bubble._id, hasLeaked: false },
      { $set: { hasLeaked: true } },
      { new: true }
    );

    if (updatedBubble) {
      await User.findByIdAndUpdate(bubble.author, { $inc: { timesLeaked: 1 } });
      await createNotification(io, {
        recipient: bubble.author,
        type: 'leak',
        bubbleId: bubble._id,
        content: `💨 VAZOU! Sua bolha gerou ${score} pontos de energia e vazou para a rede geral!`
      });
      if (io) io.emit('bubble_leaked', { bubbleId: bubble._id, score, threshold: LEAK_SCORE_THRESHOLD });
    }
  }
};

const updateSurvivorRecord = async (user, bubble) => {
  const ageInMinutes = (Date.now() - new Date(bubble.createdAt).getTime()) / (1000 * 60);
  if (ageInMinutes > (user.maxBubbleLifeMinutes || 0)) {
    await User.findByIdAndUpdate(user._id, { $set: { maxBubbleLifeMinutes: Math.floor(ageInMinutes) } });
  }
};

// ============================================================
// 1. CRIAR BOLHA
// ============================================================
exports.createBubble = async (req, res, next) => {
  try {
    const { title, subject, content, mediaUrl, mediaType, parentBubble, isAnonymous = false } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'O título da bolha é obrigatório.' });
    }
    if (!content || !content.trim()) {
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
    
    if (req.file) {
      bubbleData.mediaUrl = `/uploads/${req.file.filename}`;
      bubbleData.mediaType = req.file.mimetype.includes('gif') ? 'gif' : 'image';
    } else if (mediaUrl && mediaUrl.trim()) {
      bubbleData.mediaUrl = mediaUrl.trim();
      bubbleData.mediaType = mediaType || (mediaUrl.includes('.gif') ? 'gif' : 'image');
    }
    
    if (parentBubble) {
      const parentExists = await Bubble.findOne({ _id: parentBubble, expiresAt: { $gt: new Date() } }).lean();
      if (!parentExists) {
        return res.status(400).json({ message: 'Bolha mãe não encontrada ou já expirou.' });
      }
      bubbleData.parentBubble = parentBubble;
    }
    
    const newBubble = await Bubble.create(bubbleData);
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalBubblesCreated: 1 } });
    
    const populated = await newBubble.populate('author', 'username');
    
    if (req.io) {
      if (parentBubble) req.io.to(parentBubble).emit('new_child_bubble', populated);
      req.io.emit('new_bubble', populated);
    }
    
    return res.status(201).json({
      success: true,
      message: '💨 Bolha soprada com sucesso! Ela desaparecerá em 24h.',
      bubble: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ errors: Object.values(error.errors).map(e => e.message) });
    }
    return next(error);
  }
};

// ============================================================
// 2. EXCLUIR BOLHA
// ============================================================
exports.deleteBubble = async (req, res, next) => {
  try {
    const bubble = req.bubble; 
    if (bubble.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Apenas o autor pode excluir esta bolha.' });
    }

    // Sênior: Busca a bolha completa para recuperar o mediaUrl antes de deletar
    const bubbleData = await Bubble.findById(bubble._id).select('mediaUrl').lean();
    
    await Bubble.deleteOne({ _id: bubble._id });

    // Limpa o arquivo de mídia do disco para evitar orfãos
    if (bubbleData?.mediaUrl) {
      deleteOldFile(bubbleData.mediaUrl);
    }

    if (req.io) req.io.emit('bubble_deleted', { bubbleId: bubble._id });
    return res.json({ success: true, message: 'Bolha excluída com sucesso.' });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 3. FEED GERAL
// ============================================================
exports.getAllBubbles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    
    const query = { 
      expiresAt: { $gt: new Date() }, 
      parentBubble: null 
    };

    const bubbles = await Bubble.find(query)
      .populate('author', 'username')
      .select('-comments') 
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Bubble.countDocuments(query);
    
    return res.json({ page, totalPages: Math.ceil(total / limit), total, count: bubbles.length, bubbles });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 4. FEED DE SEGUIDOS
// ============================================================
exports.getFollowingFeed = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const listFollowing = await Follow.find({ follower: req.user._id }).select('following').lean();
    const followingIds = listFollowing.map(f => f.following);

    if (followingIds.length === 0) {
      return res.json({ page, totalPages: 0, total: 0, bubbles: [], message: "Você não segue ninguém ainda." });
    }

    const query = {
      author: { $in: followingIds },
      expiresAt: { $gt: new Date() },
      parentBubble: null
    };

    const bubbles = await Bubble.find(query)
      .populate('author', 'username')
      .select('-comments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Bubble.countDocuments(query);
    return res.json({ page, totalPages: Math.ceil(total / limit), total, count: bubbles.length, bubbles });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 5. MINHAS BOLHAS
// ============================================================
exports.getMyBubbles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    
    const bubbles = await Bubble.find({ author: req.user._id })
      .populate('author', 'username')
      .select('-comments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Bubble.countDocuments({ author: req.user._id });
    return res.json({ page, totalPages: Math.ceil(total / limit), total, bubbles });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 6. BUSCAR BOLHA POR ID
// ============================================================
const buildParentChain = async (bubble) => {
  const chain = [];
  let current = bubble;
  let depth = 0;
  
  while (current.parentBubble && depth < 5) {
    const parent = await Bubble.findById(current.parentBubble)
      .populate('author', 'username')
      .select('content author parentBubble createdAt')
      .lean();
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
    depth++;
  }
  return chain;
};

exports.getBubbleById = async (req, res, next) => {
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
      .limit(10)
      .lean();
      
    return res.json({ bubble, childBubbles, parentChain });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 7. LIKE (TOGGLE ATÔMICO)
// ============================================================
exports.toggleLike = async (req, res, next) => {
  try {
    const bubbleId = req.bubble._id;
    const userId = req.user._id;
    
    let bubble = await Bubble.findById(bubbleId);
    if (!bubble || bubble.expiresAt < new Date()) {
      return res.status(444).json({ message: 'A bolha estourou antes da sua interação!' });
    }

    const hasLiked = bubble.likes.includes(userId);
    const timeChange = 10 * 60 * 1000;
    
    let updateOps = {};
    if (hasLiked) {
      updateOps = {
        $pull: { likes: userId },
        $inc: { expiresAt: -timeChange }
      };
    } else {
      updateOps = {
        $pull: { dislikes: userId },
        $push: { likes: userId },
        $inc: { expiresAt: timeChange }
      };
    }

    const updatedBubble = await Bubble.findByIdAndUpdate(bubbleId, updateOps, { new: true });
    
    await checkForLeak(updatedBubble, req.io);
    await updateSurvivorRecord(req.user, updatedBubble);
    
    if (!hasLiked && updatedBubble.author.toString() !== userId.toString()) {
      await createNotification(req.io, {
        recipient: updatedBubble.author,
        sender: userId,
        type: 'trending',
        bubbleId: updatedBubble._id,
        content: '❤️ Alguém curtiu sua bolha! +10 minutos de vida.'
      });
    }
    
    const updatePayload = {
      bubbleId: updatedBubble._id,
      likesCount: updatedBubble.likes.length,
      dislikesCount: updatedBubble.dislikes.length,
      expiresAt: updatedBubble.expiresAt,
      hasLeaked: updatedBubble.hasLeaked,
    };

    if (req.io) req.io.to(updatedBubble._id.toString()).emit('bubble_updated', updatePayload);
    
    return res.json({
      message: hasLiked ? 'Like removido.' : '❤️ Curtida! +10 minutos de vida.',
      ...updatePayload
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 8. DISLIKE (TOGGLE ATÔMICO)
// ============================================================
exports.toggleDislike = async (req, res, next) => {
  try {
    const bubbleId = req.bubble._id;
    const userId = req.user._id;
    
    let bubble = await Bubble.findById(bubbleId);
    if (!bubble || bubble.expiresAt < new Date()) {
      return res.status(444).json({ message: 'A bolha estourou antes do dislike!' });
    }

    const hasDisliked = bubble.dislikes.includes(userId);
    const timeChange = 15 * 60 * 1000;
    
    let updateOps = {};
    if (hasDisliked) {
      updateOps = {
        $pull: { dislikes: userId },
        $inc: { expiresAt: timeChange }
      };
    } else {
      updateOps = {
        $pull: { likes: userId },
        $push: { dislikes: userId },
        $inc: { expiresAt: -timeChange }
      };
    }

    const updatedBubble = await Bubble.findByIdAndUpdate(bubbleId, updateOps, { new: true });
    
    await checkForLeak(updatedBubble, req.io);
    await updateSurvivorRecord(req.user, updatedBubble);
    
    const updatePayload = {
      bubbleId: updatedBubble._id,
      likesCount: updatedBubble.likes.length,
      dislikesCount: updatedBubble.dislikes.length,
      expiresAt: updatedBubble.expiresAt,
      hasLeaked: updatedBubble.hasLeaked,
    };

    if (req.io) req.io.to(updatedBubble._id.toString()).emit('bubble_updated', updatePayload);
    
    return res.json({
      message: hasDisliked ? 'Dislike removido.' : '👎 Dislike aplicado. -15 minutos.',
      ...updatePayload
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 9. SOPRO (REFATORADO: Validação Atômica + Wallet + VIP)
// ============================================================
exports.useSopro = async (req, res, next) => {
  try {
    const bubbleId = req.bubble._id;
    const user = req.user;
    
    const bubble = await Bubble.findById(bubbleId);
    if (!bubble || bubble.expiresAt < new Date()) {
      return res.status(444).json({ message: 'Essa bolha já estourou!' });
    }

    if (bubble.author.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'Você não pode usar sopro na sua própria bolha.' });
    }
    if (bubble.sopros.includes(user._id)) {
      return res.status(400).json({ message: 'Você já usou um sopro nesta bolha.' });
    }

    // ============================================================
    // FASE 1: RESETA CONTADOR DIÁRIO SE NECESSÁRIO
    // ============================================================
    await resetDailySoprosIfNeeded(user);

    // ============================================================
    // FASE 2: DESCOBRE LIMITE DIÁRIO (considerando VIP da Wallet)
    // ============================================================
    let dailyLimit = 3;
    let applyVipMultiplier = false;

    try {
      const wallet = await Wallet.findOne({ user: user._id }).lean();
      // Verificação inline de VIP ativo (evita depender de método de instância com .lean())
      const isVipActive = wallet &&
        wallet.vipStatus !== 'none' &&
        wallet.vipExpiresAt &&
        new Date() <= new Date(wallet.vipExpiresAt);

      if (isVipActive) {
        dailyLimit = wallet.dailySoproLimit || 3;
        applyVipMultiplier = true;
      }
    } catch (walletErr) {
      logger.warn('Falha ao buscar Wallet para limite VIP, usando padrao:', { userId: user._id, error: walletErr.message });
    }

    // ============================================================
    // FASE 3: TENTATIVA ATÔMICA — Prioridade: Diário > Comprado > Wallet
    // ============================================================

    // 3a. Tenta usar sopro diário (findOneAndUpdate com barreira $lt)
    let updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        dailySoprosUsed: { $lt: dailyLimit },
      },
      {
        $inc: { dailySoprosUsed: 1, totalSoprosGiven: 1 },
      },
      { new: true }
    );

    let usedPurchasedSopro = false;

    // 3b. Se diário esgotou, tenta usar sopro comprado (findOneAndUpdate com barreira $gt)
    if (!updatedUser) {
      updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          soprosPurchased: { $gt: 0 },
        },
        {
          $inc: { soprosPurchased: -1, totalSoprosGiven: 1 },
        },
        { new: true }
      );
      usedPurchasedSopro = true;
    }

    // 3c. Se ambos falharam, retorna erro
    if (!updatedUser) {
      logger.warn('Sopro bloqueado: saldo insuficiente', { userId: user._id, bubbleId });
      return res.status(400).json({ message: 'Sem sopros disponíveis. Compre mais!' });
    }

    // ============================================================
    // FASE 4: INJETA OXIGÊNIO VIA BUBBLE SERVICE (com wallet se comprado)
    // ============================================================
    let updatedBubble;
    
    if (usedPurchasedSopro) {
      // Sopro comprado → débito atômico via Wallet + multiplicador VIP
      updatedBubble = await injectOxygen({
        bubbleId,
        userId: user._id,
        source: 'sopro',
        deductFromWallet: true,
        applyVipMultiplier,
      });
    } else {
      // Sopro diário → injeção direta (sem débito na wallet)
      updatedBubble = await injectOxygen({
        bubbleId,
        userId: user._id,
        source: 'sopro',
        customAmount: 40,
        deductFromWallet: false,
      });
    }

    if (!updatedBubble) {
      throw new Error('Falha ao injetar oxigenio na bolha');
    }

    // ============================================================
    // FASE 5: REGISTRO DA AÇÃO E NOTIFICAÇÕES
    // ============================================================
    await Bubble.findByIdAndUpdate(bubbleId, {
      $addToSet: { sopros: user._id },
    });

    await createNotification(req.io, {
      recipient: bubble.author,
      sender: user._id,
      type: 'sopro',
      bubbleId: bubble._id,
      content: '💨 Sua bolha recebeu um SOPRO VITAL! +40 de oxigênio!'
    });

    const wasCritical = updatedBubble.oxygenLevel <= 25;
    if (wasCritical && !updatedBubble.hasLeaked) {
      await createNotification(req.io, {
        recipient: updatedBubble.author,
        sender: user._id,
        type: 'saved_from_expiry',
        bubbleId: updatedBubble._id,
        content: `🎉 MILAGRE! ${user.username} salvou sua bolha no último minuto!`
      });
    }

    await checkForLeak(updatedBubble, req.io);
    await updateSurvivorRecord(updatedUser, updatedBubble);

    // ============================================================
    // FASE 6: RESPOSTA
    // ============================================================
    const updatePayload = {
      bubbleId: updatedBubble._id,
      soprosCount: (updatedBubble.sopros?.length || 0) + 1,
      oxygenLevel: updatedBubble.oxygenLevel,
      expiresAt: updatedBubble.expiresAt,
      hasLeaked: updatedBubble.hasLeaked,
      vipMultiplierApplied: applyVipMultiplier && usedPurchasedSopro,
    };

    if (req.io) req.io.to(updatedBubble._id.toString()).emit('bubble_updated', updatePayload);

    return res.json({
      success: true,
      message: usedPurchasedSopro
        ? `💨 Sopro VIP usado! +${Math.round(40 * (applyVipMultiplier ? 1.5 : 1))} de oxigênio!`
        : '💨 Sopro usado! +40 de oxigênio!',
      ...updatePayload,
      remainingDaily: Math.max(0, dailyLimit - (updatedUser.dailySoprosUsed || 0)),
      purchasedSopros: updatedUser.soprosPurchased || 0,
    });
  } catch (error) {
    logger.error('Erro no uso de sopro:', { userId: req.user?._id, bubbleId: req.bubble?._id, error: error.message });
    return next(error);
  }
};

// ============================================================
// 10. COMENTÁRIO
// ============================================================
exports.addComment = async (req, res, next) => {
  try {
    const bubbleId = req.bubble._id;
    const { text } = req.body;
    const userId = req.user._id;
    
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Comentário não pode estar vazio.' });
    }

    const bubbleCheck = await Bubble.findById(bubbleId).select('comments expiresAt author').lean();
    if (!bubbleCheck || bubbleCheck.expiresAt < new Date()) {
      return res.status(444).json({ message: 'A bolha estourou antes do envio do comentário!' });
    }
    
    const lastComment = bubbleCheck.comments
      .filter(c => c.author.toString() === userId.toString())
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (lastComment && (Date.now() - new Date(lastComment.createdAt).getTime()) < 30000) {
      return res.status(429).json({ message: 'Aguarde 30 segundos para comentar novamente.' });
    }
    
    const commentObj = { author: userId, text: text.trim(), createdAt: new Date() };
    const timeChange = 30 * 60 * 1000;

    const updatedBubble = await Bubble.findByIdAndUpdate(bubbleId, {
      $push: { comments: commentObj },
      $inc: { expiresAt: timeChange }
    }, { new: true }).populate('comments.author', 'username');
    
    if (updatedBubble.author.toString() !== userId.toString()) {
      await createNotification(req.io, {
        recipient: updatedBubble.author,
        sender: userId,
        type: 'comment',
        bubbleId: updatedBubble._id,
        content: '💬 Comentaram na sua bolha! +30 minutos de vida.'
      });
    }
    
    await checkForLeak(updatedBubble, req.io);
    await updateSurvivorRecord(req.user, updatedBubble);
    
    if (req.io) {
      req.io.to(updatedBubble._id.toString()).emit('bubble_updated', {
        bubbleId: updatedBubble._id,
        commentsCount: updatedBubble.comments.length,
        expiresAt: updatedBubble.expiresAt,
        hasLeaked: updatedBubble.hasLeaked,
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Comentário adicionado! +30 minutos de vida.',
      comments: updatedBubble.comments,
      hasLeaked: updatedBubble.hasLeaked,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 10.5 ESTOURAR BOLHA (POP)
// ============================================================
exports.popBubble = async (req, res, next) => {
  try {
    const bubbleId = req.bubble._id;
    const userId = req.user._id;

    const bubble = await Bubble.findById(bubbleId);
    if (!bubble || bubble.expiresAt < new Date()) {
      return res.status(444).json({ message: 'Esta bolha já não existe para ser estourada.' });
    }

    if (bubble.poppedBy && bubble.poppedBy.includes(userId)) {
      return res.status(400).json({ message: 'Você já estourou esta bolha!' });
    }

    const updatedBubble = await Bubble.findByIdAndUpdate(
      bubbleId,
      {
        $push: { poppedBy: userId },
        $inc: { popCount: 1 }
      },
      { new: true }
    );

    if (req.io) {
      req.io.to(updatedBubble._id.toString()).emit('bubble_popped', {
        bubbleId: updatedBubble._id,
        popCount: updatedBubble.popCount
      });
    }

    return res.status(200).json({
      success: true,
      message: '💥 Bolha estourada!',
      popCount: updatedBubble.popCount
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 11. BOLHAS VAZADAS
// ============================================================
exports.getLeakedBubbles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 15);
    const skip = (page - 1) * limit;
    
    const query = { hasLeaked: true, expiresAt: { $gt: new Date() } };

    const leaked = await Bubble.find(query)
      .populate('author', 'username')
      .select('-comments')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Bubble.countDocuments(query);
    return res.json({ page, totalPages: Math.ceil(total / limit), total, count: leaked.length, leaks: leaked });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 12. PERFIL DO USUÁRIO
// ============================================================
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -googleId').lean();
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const activeBubbles = await Bubble.find({ author: req.user._id, expiresAt: { $gt: new Date() } })
      .select('-comments')
      .sort({ expiresAt: 1 })
      .limit(50)
      .lean();
      
    const badges = calculateBadges(user);
    const hasLeakedBubble = activeBubbles.some(bubble => bubble.hasLeaked === true);
    
    return res.json({
      user: { 
        ...user, 
        followerCount: user.followersCount || 0,
        followingCount: user.followingCount || 0, 
        isNeon: hasLeakedBubble 
      },
      activeBubbles,
      badges
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 13. HISTÓRICO DE BOLHAS DE UM USUÁRIO
// ============================================================
exports.getUserBubbles = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    
    const bubbles = await Bubble.find({ author: userId, expiresAt: { $gt: new Date() } })
      .populate('author', 'username')
      .select('-comments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Bubble.countDocuments({ author: userId, expiresAt: { $gt: new Date() } });
    return res.json({ page, totalPages: Math.ceil(total / limit), total, bubbles });
  } catch (error) {
    return next(error);
  }
};
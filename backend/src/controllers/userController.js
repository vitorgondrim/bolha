const User = require('../models/User');
const Bubble = require('../models/Bubble');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { calculateBadges } = require('../utils/badgeUtils');
const { resetDailySoprosIfNeeded } = require('../utils/soproUtils');
const logger = require('../utils/logger');

const createNotification = async (io, data) => {
  try {
    const notification = await Notification.create(data);
    if (io) io.to(`user_${data.recipient}`).emit('new_notification', notification);
    return notification;
  } catch (error) {
    logger.error('Erro ao criar notificacao:', { error: error.message });
  }
};

const formatUserResponse = (userDoc, hasLeakedBubble = false) => {
  // CORRECAO: userDoc pode ser um documento Mongoose (com .toObject()) ou
  // um objeto .lean() (plano). Em ambos os casos, spread operator funciona.
  // Usar toObject() se disponível para garantir que é um objeto JS limpo.
  const userObj = (userDoc && typeof userDoc.toObject === 'function') ? userDoc.toObject() : { ...(userDoc || {}) };
  
  // Só deleta se as propriedades existirem (objeto plano vs documento)
  const result = { ...userObj };
  delete result.password;
  delete result.email;
  delete result.googleId;
  
  return {
    ...result,
    bubblesCreated: result.totalBubblesCreated || 0,
    leaksCount: result.timesLeaked || 0,
    soprosGiven: result.totalSoprosGiven || 0,
    followerCount: result.followersCount || 0,
    followingCount: result.followingCount || 0,
    isNeon: hasLeakedBubble
  };
};

exports.getOwnProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    await resetDailySoprosIfNeeded(user);
    const activeBubbles = await Bubble.find({ author: req.user._id, expiresAt: { $gt: new Date() } }).select('-comments').sort({ expiresAt: 1 }).limit(50).lean();
    const badges = calculateBadges(user);
    const hasLeakedBubble = activeBubbles.some(b => b.hasLeaked === true);
    return res.json({ user: formatUserResponse(user, hasLeakedBubble), activeBubbles, badges });
  } catch (error) { return next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { bio, pinnedBadge } = req.body;
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio.trim();
    if (pinnedBadge !== undefined) updateData.pinnedBadge = pinnedBadge;
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updateData }, { new: true, runValidators: true }).select('-password');
    return res.json({ message: 'Perfil atualizado!', user: formatUserResponse(user) });
  } catch (error) { return next(error); }
};

exports.toggleFollow = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const myId = req.user._id;
    if (targetUserId === myId.toString()) return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
    const existingFollow = await Follow.findOne({ follower: myId, following: targetUserId });
    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      await User.findByIdAndUpdate(myId, { $inc: { followingCount: -1 } });
      const updatedTarget = await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } }, { returnDocument: 'after' });
      return res.json({ success: true, isFollowing: false, followerCount: updatedTarget.followersCount || 0 });
    } else {
      await Follow.create({ follower: myId, following: targetUserId });
      await User.findByIdAndUpdate(myId, { $inc: { followingCount: 1 } });
      const updatedTarget = await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } }, { returnDocument: 'after' });
      await createNotification(req.io, { recipient: targetUserId, sender: myId, type: 'follow', content: `👥 ${req.user.username} começou a seguir você!` });
      return res.json({ success: true, isFollowing: true, followerCount: updatedTarget.followersCount || 0 });
    }
  } catch (error) { return next(error); }
};

exports.getPublicProfile = async (req, res, next) => {
  try {
    // 🔥 Normaliza o parâmetro: pode ser username ou _id (fallback legado)
    let user;
    const param = req.params?.username?.toLowerCase().trim();
    if (!param) return res.status(400).json({ message: 'Parâmetro de usuário inválido.' });

    // Tenta buscar por username primeiro
    user = await User.findOne({ username: param }).select('-password');

    // Fallback: se não achou por username, tenta por _id (para compatibilidade)
    if (!user && /^[0-9a-fA-F]{24}$/.test(param)) {
      user = await User.findById(param).select('-password');
    }

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    
    // CORREÇÃO: Verificar se req.user existe antes de acessar req.user._id
    // O middleware optionalAuth não garante que req.user esteja definido
    const userId = req.user?._id || null;
    let isFollowingRelation = false;
    if (userId) {
      isFollowingRelation = await Follow.exists({ follower: userId, following: user._id });
    }
    
    const activeBubbles = await Bubble.find({ author: user._id, expiresAt: { $gt: new Date() } })
      .select('-comments').sort({ expiresAt: 1 }).limit(50).lean();
    const badges = calculateBadges(user);
    const hasLeakedBubble = activeBubbles.some(b => b.hasLeaked === true);
    return res.json({ user: { ...formatUserResponse(user, hasLeakedBubble), isFollowing: !!isFollowingRelation }, activeBubbles, badges });
  } catch (error) { return next(error); }
};

exports.getPublicProfileById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const activeBubbles = await Bubble.find({ author: user._id, expiresAt: { $gt: new Date() } }).select('-comments').lean();
        const badges = calculateBadges(user);
        const hasLeakedBubble = activeBubbles.some(b => b.hasLeaked === true);
        return res.json({ user: formatUserResponse(user, hasLeakedBubble), activeBubbles, badges });
    } catch (error) { return next(error); }
};
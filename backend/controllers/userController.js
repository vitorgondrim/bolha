// ============================================================
// CONTROLLER: USUÁRIOS
// Gerencia perfis e relações sociais:
//   - Perfil próprio (logado)
//   - Perfil público (visitado por outros)
//   - Atualização de perfil (bio, emblema fixado)
//   - Sistema de seguir/deixar de seguir
// ============================================================

const User = require('../models/User');
const Bubble = require('../models/Bubble');
const Notification = require('../models/Notification');
const { calculateBadges } = require('../utils/badgeUtils');
const { resetDailySoprosIfNeeded } = require('../utils/soproUtils');

// ============================================================
// FUNÇÃO AUXILIAR: CRIAR NOTIFICAÇÃO
// Centralizada para evitar repetição nos controllers.
// ============================================================
const createNotification = async (io, data) => {
  try {
    const notification = await Notification.create(data);
    io.to(`user_${data.recipient}`).emit('new_notification', notification);
    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
};

// ============================================================
// 1. PERFIL PRÓPRIO (USUÁRIO LOGADO)
// Retorna todos os dados do usuário + bolhas ativas + emblemas.
// Remove campos sensíveis (password, googleId).
// Mapeia nomes de campos do banco para nomes do frontend.
// ============================================================
exports.getOwnProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    await resetDailySoprosIfNeeded(user);

    // Busca bolhas ativas do usuário (ordenadas por expiração)
    const activeBubbles = await Bubble.find({
      author: req.user._id,
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: 1 }).limit(50);

    // Calcula emblemas baseados nas estatísticas
    const badges = calculateBadges(user);
    
    // Verifica se tem alguma bolha vazada (para o status "Neon")
    const hasLeakedBubble = activeBubbles.some(bubble => bubble.hasLeaked === true);

    // Converte para objeto plano e remove campos sensíveis
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.googleId;

    // Mapeia nomes de campos para o formato que o frontend espera
    userObj.bubblesCreated = user.totalBubblesCreated;
    userObj.leaksCount = user.timesLeaked;
    userObj.soprosGiven = user.totalSoprosGiven;
    userObj.coverUrl = user.coverUrl;
    userObj.avatarUrl = user.avatarUrl;

    res.json({
      user: {
        ...userObj,
        followerCount: user.followers.length,
        followingCount: user.following.length,
        isNeon: hasLeakedBubble
      },
      activeBubbles,
      badges
    });
  } catch (error) {
    console.error('Erro getOwnProfile:', error);
    res.status(500).json({ message: 'Erro ao buscar seu perfil.' });
  }
};

// ============================================================
// 2. ATUALIZAR PERFIL
// Permite editar bio e fixar um emblema no perfil.
// Usa $set para atualizar apenas os campos enviados.
// ============================================================
exports.updateProfile = async (req, res) => {
  try {
    const { bio, pinnedBadge } = req.body;
    const updateData = {};
    
    if (bio !== undefined) updateData.bio = bio;
    if (pinnedBadge !== undefined) updateData.pinnedBadge = pinnedBadge;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.googleId;

    userObj.bubblesCreated = user.totalBubblesCreated;
    userObj.leaksCount = user.timesLeaked;
    userObj.soprosGiven = user.totalSoprosGiven;
    userObj.coverUrl = user.coverUrl;
    userObj.avatarUrl = user.avatarUrl;

    res.json({
      message: 'Perfil atualizado com sucesso!',
      user: {
        ...userObj,
        followerCount: user.followers.length,
        followingCount: user.following.length
      }
    });
  } catch (error) {
    console.error('Erro updateProfile:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  }
};

// ============================================================
// 3. SEGUIR / DEIXAR DE SEGUIR (TOGGLE)
// Adiciona ou remove o usuário alvo da lista de following.
// Adiciona ou remove o usuário logado da lista de followers do alvo.
// Notifica o usuário alvo quando alguém começa a segui-lo.
// ============================================================
exports.toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const myId = req.user._id;

    // Não pode seguir a si mesmo
    if (targetUserId === myId.toString()) {
      return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
    }

    const targetUser = await User.findById(targetUserId);
    const me = await User.findById(myId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const isCurrentlyFollowing = me.following.includes(targetUserId);

    if (isCurrentlyFollowing) {
      // DEIXAR DE SEGUIR
      me.following.pull(targetUserId);
      targetUser.followers.pull(myId);
    } else {
      // SEGUIR
      me.following.push(targetUserId);
      targetUser.followers.push(myId);
      
      // Notifica o usuário que recebeu um novo seguidor
      await createNotification(req.io, {
        recipient: targetUserId,
        sender: myId,
        type: 'follow',
        content: `👥 ${me.username} começou a seguir você!`
      });
    }

    await me.save();
    await targetUser.save();

    res.json({
      isFollowing: !isCurrentlyFollowing,
      followerCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Erro toggleFollow:', error);
    res.status(500).json({ message: 'Erro ao processar follow/unfollow.' });
  }
};

// ============================================================
// 4. PERFIL PÚBLICO (VISUALIZADO POR OUTROS)
// Busca um usuário pelo username.
// Retorna dados públicos + bolhas ativas + emblemas.
// Inclui se o usuário logado segue essa pessoa.
// Remove campos sensíveis (email, googleId).
// ============================================================
exports.getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -email -googleId');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const activeBubbles = await Bubble.find({
      author: user._id,
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: 1 }).limit(50);

    const badges = calculateBadges(user);
    const isCurrentUserFollowing = user.followers.includes(req.user._id);
    const hasLeakedBubble = activeBubbles.some(bubble => bubble.hasLeaked === true);

    const userObj = user.toObject();
    userObj.bubblesCreated = user.totalBubblesCreated;
    userObj.leaksCount = user.timesLeaked;
    userObj.soprosGiven = user.totalSoprosGiven;
    userObj.coverUrl = user.coverUrl;
    userObj.avatarUrl = user.avatarUrl;

    res.json({
      user: {
        ...userObj,
        followerCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing: isCurrentUserFollowing,
        isNeon: hasLeakedBubble
      },
      activeBubbles,
      badges
    });
  } catch (error) {
    console.error('Erro getPublicProfile:', error);
    res.status(500).json({ message: 'Erro ao buscar perfil público.' });
  }
};
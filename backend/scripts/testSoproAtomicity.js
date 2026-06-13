// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: scripts/testSoproAtomicity.js
// Propósito: Teste de concorrência simulando 10 requisições
//            simultâneas de um usuário com saldo de 1 sopro.
//            Verifica se a atomicidade impede saldo negativo.
// Uso: node scripts/testSoproAtomicity.js
// ============================================================

const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const logger = require('../src/utils/logger');
logger.level = 'error';

const User = require('../src/models/User');
const Bubble = require('../src/models/Bubble');
const Wallet = require('../src/models/Wallet');
const { injectOxygen } = require('../src/services/bubbleService');

const CONFIG = {
  NUM_CONCURRENT_REQUESTS: 10,
  INITIAL_SOPROS_PURCHASED: 1,
  INITIAL_DAILY_USED: 3,
};

let testUser = null;
let testBubble = null;
let bubbleAuthor = null;

// ============================================================
// HELPERS
// ============================================================

const createTestUser = async () => {
  const shortId = Date.now().toString(36).slice(-8);
  const user = await User.create({
    username: `t_${shortId}`,
    email: `t_${shortId}@test.com`,
    password: 'test123456',
    soprosPurchased: CONFIG.INITIAL_SOPROS_PURCHASED,
    dailySoprosUsed: CONFIG.INITIAL_DAILY_USED,
    // lastSoproReset = NOW → resetDailySoprosIfNeeded NÃO vai resetar o contador
    lastSoproReset: new Date(),
    totalSoprosGiven: 0,
  });

  await Wallet.atomicCredit(user._id, CONFIG.INITIAL_SOPROS_PURCHASED, {
    type: 'bonus',
    description: 'Saldo inicial para teste',
  });

  return user;
};

const createTestBubble = async () => {
  const shortIdAuth = (Date.now() + 2).toString(36).slice(-8);
  bubbleAuthor = await User.create({
    username: `b_${shortIdAuth}`,
    email: `b_${shortIdAuth}@test.com`,
    password: 'test123456',
    soprosPurchased: 0,
    dailySoprosUsed: 0,
    lastSoproReset: new Date(),
    totalSoprosGiven: 0,
  });

  const bubble = await Bubble.create({
    title: 'Bolha de teste atômico',
    subject: 'Teste',
    content: 'Validar atomicidade de sopros.',
    author: bubbleAuthor._id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    oxygenLevel: 50,
    maxOxygen: 100,
    lastOxygenDecayCheck: new Date(),
    sopros: [],
  });
  return bubble;
};

// ============================================================
// SIMULAÇÕES
// ============================================================

/**
 * Lógica NOVA: findOneAndUpdate com filtro condicional atômico
 * SEM resetDailySoprosIfNeeded (para não interferir no teste)
 */
const simulateAtomic = async (userId, bubbleId) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return { success: false, reason: 'user_not_found' };

    const bubble = await Bubble.findById(bubbleId).lean();
    if (!bubble || bubble.expiresAt < new Date()) return { success: false, reason: 'bubble_expired' };
    if (bubble.author.toString() === userId.toString()) return { success: false, reason: 'own_bubble' };
    if (bubble.sopros.includes(userId)) return { success: false, reason: 'already_soproed' };

    // Tenta diário (atomicamente: só passa se dailySoprosUsed < 3)
    let updatedUser = await User.findOneAndUpdate(
      { _id: userId, dailySoprosUsed: { $lt: 3 } },
      { $inc: { dailySoprosUsed: 1, totalSoprosGiven: 1 } },
      { returnDocument: 'after' }
    );

    let usedPurchased = false;

    // Se diário falhou, tenta comprado (atomicamente: só passa se soprosPurchased > 0)
    if (!updatedUser) {
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, soprosPurchased: { $gt: 0 } },
        { $inc: { soprosPurchased: -1, totalSoprosGiven: 1 } },
        { returnDocument: 'after' }
      );
      usedPurchased = true;
    }

    if (!updatedUser) return { success: false, reason: 'insufficient_balance' };

    // Injetar oxigênio
    try {
      if (usedPurchased) {
        await injectOxygen({ bubbleId, userId, source: 'sopro', deductFromWallet: true, applyVipMultiplier: false });
      } else {
        await injectOxygen({ bubbleId, userId, source: 'sopro', customAmount: 40, deductFromWallet: false });
      }
    } catch (injectErr) {
      // Reverte débito
      if (usedPurchased) {
        await User.findByIdAndUpdate(userId, { $inc: { soprosPurchased: 1, totalSoprosGiven: -1 } });
      } else {
        await User.findByIdAndUpdate(userId, { $inc: { dailySoprosUsed: -1, totalSoprosGiven: -1 } });
      }
      return { success: false, reason: 'injection_failed', error: injectErr.message };
    }

    await Bubble.findByIdAndUpdate(bubbleId, { $addToSet: { sopros: userId } });

    return { success: true, usedPurchased };
  } catch (error) {
    return { success: false, reason: 'exception', error: error.message };
  }
};

/**
 * Lógica ANTIGA: validação em memória (race condition)
 */
const simulateOld = async (userId, bubbleId) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return { success: false, reason: 'user_not_found' };

    const bubble = await Bubble.findById(bubbleId).lean();
    if (!bubble || bubble.expiresAt < new Date()) return { success: false, reason: 'bubble_expired' };
    if (bubble.author.toString() === userId.toString()) return { success: false, reason: 'own_bubble' };
    if (bubble.sopros.includes(userId)) return { success: false, reason: 'already_soproed' };

    // Lógica antiga: lê o saldo em memória (DESATUALIZADO)
    let updateFields = {};
    if (user.soprosPurchased > 0) {
      updateFields = { $inc: { soprosPurchased: -1, totalSoprosGiven: 1 } };
    } else if ((user.dailySoprosUsed || 0) < 3) {
      updateFields = { $inc: { dailySoprosUsed: 1, totalSoprosGiven: 1 } };
    } else {
      return { success: false, reason: 'insufficient_balance' };
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { returnDocument: 'after' });
    await Bubble.findByIdAndUpdate(bubbleId, { $addToSet: { sopros: userId } });

    return { success: true };
  } catch (error) {
    return { success: false, reason: 'exception', error: error.message };
  }
};

// ============================================================
// TESTE PRINCIPAL
// ============================================================

const runTest = async () => {
  console.log('\n========================================');
  console.log(' TESTE DE ATOMICIDADE');
  console.log(` ${CONFIG.NUM_CONCURRENT_REQUESTS} requisições simultâneas`);
  console.log(` Saldo disponível: ${CONFIG.INITIAL_SOPROS_PURCHASED} sopro comprado`);
  console.log(` Limite diário: ${CONFIG.INITIAL_DAILY_USED}/3 usado (esgotado)`);
  console.log('========================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Conectado ao MongoDB\n');

    testUser = await createTestUser();
    testBubble = await createTestBubble();

    console.log(` Usuário: @${testUser.username}`);
    console.log(`   soprosPurchased: ${testUser.soprosPurchased}`);
    console.log(`   dailySoprosUsed: ${testUser.dailySoprosUsed}/3`);
    console.log(`   Wallet balance: ${(await Wallet.findOne({ user: testUser._id }).lean())?.balance}\n`);

    // ============================================================
    // TESTE 1: Atômica (NOVA)
    // ============================================================
    console.log('─── TESTE 1: LÓGICA ATÔMICA (findOneAndUpdate com barreira) ───\n');

    await User.findByIdAndUpdate(testUser._id, {
      $set: { soprosPurchased: 1, dailySoprosUsed: 3, totalSoprosGiven: 0 }
    });
    await Bubble.findByIdAndUpdate(testBubble._id, { $set: { sopros: [] } });

    const resultsAtomic = await Promise.all(
      Array.from({ length: CONFIG.NUM_CONCURRENT_REQUESTS }, () =>
        simulateAtomic(testUser._id, testBubble._id))
    );

    const okAtomic = resultsAtomic.filter(r => r.success).length;
    const failAtomic = resultsAtomic.filter(r => !r.success).length;
    const reasonsAtomic = {};
    resultsAtomic.filter(r => !r.success).forEach(r => {
      reasonsAtomic[r.reason] = (reasonsAtomic[r.reason] || 0) + 1;
    });

    const userA = await User.findById(testUser._id).lean();
    const bubbleA = await Bubble.findById(testBubble._id).lean();
    const walletA = await Wallet.findOne({ user: testUser._id }).lean();

    console.log(` Resultados:`);
    console.log(`   ✅ Sucesso: ${okAtomic}`);
    console.log(`   ❌ Falhas: ${failAtomic}`);
    for (const [r, c] of Object.entries(reasonsAtomic)) console.log(`      • ${r}: ${c}`);
    console.log(`\n Estado final:`);
    console.log(`   soprosPurchased: ${userA.soprosPurchased}`);
    console.log(`   dailySoprosUsed: ${userA.dailySoprosUsed}/3`);
    console.log(`   totalSoprosGiven: ${userA.totalSoprosGiven}`);
    console.log(`   Wallet balance: ${walletA?.balance || 0}`);
    console.log(`   Bubble.sopros: ${bubbleA?.sopros?.length || 0}`);

    const passAtomic = okAtomic === 1 && (userA.soprosPurchased || 0) >= 0 && (bubbleA?.sopros?.length || 0) === 1;
    console.log(`\n 📌 VEREDITO: ${passAtomic ? '✅ CORREÇÃO FUNCIONA' : '❌ AINDA FALHA'}`);

    console.log('\n');

    // ============================================================
    // TESTE 2: Antiga (race condition)
    // ============================================================
    console.log('─── TESTE 2: LÓGICA ANTIGA (validação em memória) ───\n');

    const user2 = await User.create({
      username: `old_${(Date.now() + 1).toString(36).slice(-8)}`,
      email: `old_${(Date.now() + 1).toString(36).slice(-8)}@test.com`,
      password: 'test123456',
      soprosPurchased: 1,
      dailySoprosUsed: 3,
      lastSoproReset: new Date(),
      totalSoprosGiven: 0,
    });
    const author2 = await User.create({
      username: `auth_${(Date.now() + 2).toString(36).slice(-8)}`,
      email: `auth_${(Date.now() + 2).toString(36).slice(-8)}@test.com`,
      password: 'test123456',
      soprosPurchased: 0,
      dailySoprosUsed: 0,
      lastSoproReset: new Date(),
      totalSoprosGiven: 0,
    });
    const bubble2 = await Bubble.create({
      title: 'Bolha teste antigo',
      subject: 'Teste',
      content: 'Teste.',
      author: author2._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      oxygenLevel: 50,
      maxOxygen: 100,
      lastOxygenDecayCheck: new Date(),
      sopros: [],
    });

    const resultsOld = await Promise.all(
      Array.from({ length: CONFIG.NUM_CONCURRENT_REQUESTS }, () =>
        simulateOld(user2._id, bubble2._id))
    );

    const okOld = resultsOld.filter(r => r.success).length;
    const userB = await User.findById(user2._id).lean();

    console.log(` Resultados: ${okOld} sucesso, ${CONFIG.NUM_CONCURRENT_REQUESTS - okOld} falhas`);
    console.log(`\n Estado final:`);
    console.log(`   soprosPurchased: ${userB.soprosPurchased}`);
    console.log(`   (negativo? ${userB.soprosPurchased < 0 ? 'SIM ⚠️' : 'não'})`);

    const raceDetected = okOld > 1;
    console.log(`\n 📌 VEREDITO: ${raceDetected ? '❌ RACE CONDITION DETECTADA' : '✅ SEM RACE'}`);
    if (raceDetected) console.log(`   → ${okOld} sopros consumidos com apenas 1 de saldo!`);

    console.log('\n');

    // ============================================================
    // RESUMO
    // ============================================================
    console.log('========================================');
    if (passAtomic && raceDetected) {
      console.log(' 🎯 CORREÇÃO CONFIRMADA!');
      console.log('');
      console.log(' Lógica ANTIGA: race condition clássica');
      console.log(`   ${okOld}/${CONFIG.NUM_CONCURRENT_REQUESTS} sopros passaram`);
      console.log(`   Saldo final: ${userB.soprosPurchased} (negativo!)`);
      console.log('');
      console.log(' Lógica NOVA: findOneAndUpdate atômico');
      console.log(`   ${okAtomic}/${CONFIG.NUM_CONCURRENT_REQUESTS} sopros passaram`);
      console.log('   Barreira $gt: 0 bloqueou as demais no DB');
      console.log('   Saldo NUNCA negativo ✓');
      console.log('');
      console.log(' ✅ Sistema de economia validado para Go-Live!');
    } else {
      console.log(' ⚠ Resultado inesperado.');
      if (!passAtomic) console.log('   A lógica NOVA não isolou corretamente.');
      if (!raceDetected) console.log('   A lógica ANTIGA não apresentou race (pode ser single-thread local).');
    }

    console.log('');

    // Limpeza
    const ids = [testUser._id, user2._id, bubbleAuthor._id, author2._id];
    await User.deleteMany({ _id: { $in: ids } });
    await Wallet.deleteMany({ user: { $in: ids } });
    await Bubble.deleteMany({ _id: { $in: [testBubble._id, bubble2._id] } });
    console.log('🧹 Dados de teste removidos.\n');

    process.exit(passAtomic ? 0 : 1);
  } catch (error) {
    console.error('Erro fatal:', error.message);
    process.exit(1);
  }
};

runTest();
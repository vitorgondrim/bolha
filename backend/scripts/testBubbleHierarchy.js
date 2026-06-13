// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: scripts/testBubbleHierarchy.js
// Propósito: Teste de integração do sistema Mente Coletiva.
//            Simula o estouro de uma bolha Mãe e verifica
//            a herança/sobrevivência das filhas.
//
// Cenário:
//   Mãe (M1) → oxygenLevel: 0 (estourada)
//   ├── F1 → oxygenLevel: 80 (Alta vitalidade → deve ser promovida)
//   ├── F2 → oxygenLevel: 10 (Baixa vitalidade → deve morrer)
//   └── F3 → oxygenLevel: 35 (Média, 35% > 30% → deve ser promovida)
//
// Uso: node scripts/testBubbleHierarchy.js
// Exit: 0 se passar, 1 se falhar
// ============================================================

const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Suprime logs de debug/warn durante o teste para foco no resultado
logger.level = 'error';

const User = require('../src/models/User');
const Bubble = require('../src/models/Bubble');
const { handleBubbleDeath } = require('../src/services/bubbleService');

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const OXYGEN = {
  MAX_DEFAULT: 100,
  DECAY_RATE_DEFAULT: 4.1667,
  PROMOTION_MIN_RATIO: 0.30,
  PROMOTION_BONUS: 20,
};

// ============================================================
// RELATÓRIO DE AUDITORIA
// ============================================================
const report = {
  passed: 0,
  failed: 0,
  assertions: [],
  details: [],
};

const assert = (condition, message) => {
  if (condition) {
    report.passed++;
    report.assertions.push(`  ✅ ${message}`);
  } else {
    report.failed++;
    report.assertions.push(`  ❌ ${message}`);
  }
};

const detail = (message) => {
  report.details.push(`  ${message}`);
};

// ============================================================
// SETUP
// ============================================================

let maeId = null;
let f1Id = null;
let f2Id = null;
let f3Id = null;
let testAuthor = null;

const setup = async () => {
  // Cria autor para todas as bolhas
  const shortId = Date.now().toString(36).slice(-5);
  testAuthor = await User.create({
    username: `h_${shortId}`,
    email: `h_${shortId}@test.com`,
    password: 'test123456',
  });

  const baseBubble = {
    subject: 'Teste Hierarquia',
    author: testAuthor._id,
    maxOxygen: OXYGEN.MAX_DEFAULT,
    oxygenDecayRate: OXYGEN.DECAY_RATE_DEFAULT,
    lastOxygenDecayCheck: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    sopros: [],
    childrenBubbles: [],
    depthLevel: 0,
    isOrphan: false,
    promotedFromChild: false,
    parentBubble: null,
    hasLeaked: false,
  };

  // Mãe (M1) — oxygenLevel = 0 (já estourada)
  const mae = await Bubble.create({
    ...baseBubble,
    title: 'Mãe M1',
    content: 'Bolha mãe que vai estourar.',
    oxygenLevel: 0,
  });
  maeId = mae._id;

  // Filha 1 (F1) — Alta vitalidade: 80% → deve ser promovida
  const f1 = await Bubble.create({
    ...baseBubble,
    title: 'Filha F1',
    content: 'Alta vitalidade, deve sobreviver.',
    oxygenLevel: 80,
    parentBubble: maeId,
    depthLevel: 1,
  });
  f1Id = f1._id;

  // Filha 2 (F2) — Baixa vitalidade: 10% → deve morrer (10% <= 30%)
  const f2 = await Bubble.create({
    ...baseBubble,
    title: 'Filha F2',
    content: 'Baixa vitalidade, deve morrer.',
    oxygenLevel: 10,
    parentBubble: maeId,
    depthLevel: 1,
  });
  f2Id = f2._id;

  // Filha 3 (F3) — Média: 35% → deve ser promovida (35% > 30%)
  const f3 = await Bubble.create({
    ...baseBubble,
    title: 'Filha F3',
    content: 'Vitalidade média, deve ser promovida.',
    oxygenLevel: 35,
    parentBubble: maeId,
    depthLevel: 1,
  });
  f3Id = f3._id;

  // Atualiza a mãe com o array de childrenBubbles
  await Bubble.findByIdAndUpdate(maeId, {
    $set: { childrenBubbles: [f1Id, f2Id, f3Id] },
  });

  detail(`Mãe (M1)  : ${maeId}  | oxygenLevel=0   | depthLevel=0`);
  detail(`Filha (F1): ${f1Id}  | oxygenLevel=80  | depthLevel=1`);
  detail(`Filha (F2): ${f2Id}  | oxygenLevel=10  | depthLevel=1`);
  detail(`Filha (F3): ${f3Id}  | oxygenLevel=35  | depthLevel=1`);
};

// ============================================================
// LIMPEZA
// ============================================================

const cleanup = async () => {
  const allIds = [maeId, f1Id, f2Id, f3Id, testAuthor?._id].filter(Boolean);
  if (allIds.length > 0) {
    await Bubble.deleteMany({ _id: { $in: allIds } });
    await User.deleteMany({ _id: { $in: [testAuthor?._id].filter(Boolean) } });
  }
};

// ============================================================
// TESTE PRINCIPAL
// ============================================================

const runTest = async () => {
  console.log('\n==============================================');
  console.log(' TESTE DE HIERARQUIA - MENTE COLETIVA');
  console.log('==============================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Conectado ao MongoDB\n');

    // ---- SETUP ----
    console.log('─── CENÁRIO DE TESTE ───\n');
    await setup();

    console.log('\n Bolha Mãe (M1) com 3 filhas criadas.');
    console.log(' M1 oxygenLevel = 0 (simulando estouro)\n');

    // ---- EXECUÇÃO ----
    console.log('─── EXECUTANDO handleBubbleDeath(M1) ───\n');
    const result = await handleBubbleDeath(maeId);
    console.log(` Resultado do processamento:`);
    console.log(`   Promovidas: ${result.promoted.length}`);
    console.log(`   Mortas: ${result.dead.length}`);
    console.log(`   Total processados: ${result.totalProcessed}\n`);

    // ---- VARREDURA PÓS-MORTE ----
    console.log('─── VERIFICAÇÕES PÓS-MORTE ───\n');

    // Busca estado atual de todas as bolhas
    const mae = await Bubble.findById(maeId).lean();
    const f1 = await Bubble.findById(f1Id).lean();
    const f2 = await Bubble.findById(f2Id).lean();
    const f3 = await Bubble.findById(f3Id).lean();

    // ============================================================
    // VERIFICAÇÃO 1: Mãe M1
    // ============================================================
    console.log(' 📍 Bolha Mãe (M1):');
    detail(`M1 — hasLeaked: ${mae?.hasLeaked}, oxygenLevel: ${mae?.oxygenLevel}, parentBubble: ${mae?.parentBubble}`);

    assert(
      mae && mae.hasLeaked === true,
      'M1 deve estar marcada como hasLeaked = true'
    );
    assert(
      mae && mae.oxygenLevel === 0,
      'M1 deve ter oxygenLevel = 0'
    );
    console.log('');

    // ============================================================
    // VERIFICAÇÃO 2: F1 (Alta: 80%) → Promovida
    // ============================================================
    console.log(' 📍 Filha F1 (oxygenLevel=80):');

    const f1Promovida = result.promoted.some(id => id.toString() === f1Id.toString());
    const f1Morta = result.dead.some(id => id.toString() === f1Id.toString());
    const f1Status = f1Promovida ? 'Promovida' : f1Morta ? 'Morta' : 'Indeterminado';

    const f1OxygenEsperado = Math.min(OXYGEN.MAX_DEFAULT, 80 + OXYGEN.PROMOTION_BONUS);

    detail(`F1 — Status: ${f1Status}`);
    detail(`F1 — parentBubble: ${f1?.parentBubble}, isOrphan: ${f1?.isOrphan}, promotedFromChild: ${f1?.promotedFromChild}`);
    detail(`F1 — oxygenLevel: ${f1?.oxygenLevel} (esperado: ${f1OxygenEsperado})`);
    detail(`F1 — depthLevel: ${f1?.depthLevel} (esperado: 0)`);

    assert(f1Promovida, 'F1 deve estar na lista de promovidas');
    assert(f1 && f1.parentBubble === null, 'F1 deve ter parentBubble = null (virou raiz)');
    assert(f1 && f1.isOrphan === true, 'F1 deve ser marcada como isOrphan = true');
    assert(f1 && f1.promotedFromChild === true, 'F1 deve ser marcada como promotedFromChild = true');
    assert(f1 && f1.depthLevel === 0, 'F1 deve ter depthLevel = 0 (era 1, promovida)');
    assert(
      f1 && f1.oxygenLevel === f1OxygenEsperado,
      `F1 deve ter oxygenLevel = ${f1OxygenEsperado} (80 original + 20 bônus)`
    );
    assert(
      f1 && f1.inheritanceChain && f1.inheritanceChain.length === 1,
      'F1 deve ter 1 registro no inheritanceChain'
    );
    assert(
      f1 && f1.oxygenInjections && f1.oxygenInjections.some(i => i.source === 'promotion'),
      'F1 deve ter uma injeção de oxigênio do tipo promotion'
    );
    console.log('');

    // ============================================================
    // VERIFICAÇÃO 3: F2 (Baixa: 10%) → Morta
    // ============================================================
    console.log(' 📍 Filha F2 (oxygenLevel=10):');

    const f2Promovida = result.promoted.some(id => id.toString() === f2Id.toString());
    const f2Morta = result.dead.some(id => id.toString() === f2Id.toString());
    const f2Status = f2Promovida ? 'Promovida' : f2Morta ? 'Morta' : 'Indeterminado';

    detail(`F2 — Status: ${f2Status}`);
    detail(`F2 — hasLeaked: ${f2?.hasLeaked}, oxygenLevel: ${f2?.oxygenLevel}`);

    // 10/100 = 10% < 30% → deve morrer em cascata
    assert(f2Morta, 'F2 deve estar na lista de mortas');
    assert(f2 && f2.hasLeaked === true, 'F2 deve ter hasLeaked = true');
    assert(f2 && f2.oxygenLevel === 0, 'F2 deve ter oxygenLevel = 0');
    console.log('');

    // ============================================================
    // VERIFICAÇÃO 4: F3 (Média: 35%) → Promovida
    // ============================================================
    console.log(' 📍 Filha F3 (oxygenLevel=35):');

    const f3Promovida = result.promoted.some(id => id.toString() === f3Id.toString());
    const f3Morta = result.dead.some(id => id.toString() === f3Id.toString());
    const f3Status = f3Promovida ? 'Promovida' : f3Morta ? 'Morta' : 'Indeterminado';

    const f3OxygenEsperado = Math.min(OXYGEN.MAX_DEFAULT, 35 + OXYGEN.PROMOTION_BONUS);

    detail(`F3 — Status: ${f3Status}`);
    detail(`F3 — parentBubble: ${f3?.parentBubble}, isOrphan: ${f3?.isOrphan}, promotedFromChild: ${f3?.promotedFromChild}`);
    detail(`F3 — oxygenLevel: ${f3?.oxygenLevel} (esperado: ${f3OxygenEsperado})`);
    detail(`F3 — depthLevel: ${f3?.depthLevel} (esperado: 0)`);

    // 35/100 = 35% > 30% → deve ser promovida
    assert(f3Promovida, 'F3 deve estar na lista de promovidas');
    assert(f3 && f3.parentBubble === null, 'F3 deve ter parentBubble = null (virou raiz)');
    assert(f3 && f3.isOrphan === true, 'F3 deve ser marcada como isOrphan = true');
    assert(f3 && f3.promotedFromChild === true, 'F3 deve ser marcada como promotedFromChild = true');
    assert(f3 && f3.depthLevel === 0, 'F3 deve ter depthLevel = 0 (era 1, promovida)');
    assert(
      f3 && f3.oxygenLevel === f3OxygenEsperado,
      `F3 deve ter oxygenLevel = ${f3OxygenEsperado} (35 original + 20 bônus)`
    );
    assert(
      f3 && f3.inheritanceChain && f3.inheritanceChain.length === 1,
      'F3 deve ter 1 registro no inheritanceChain'
    );
    console.log('');

    // ============================================================
    // VERIFICAÇÃO 5: Consistência do Resultado
    // ============================================================
    console.log(' 📍 Consistência do resultado:\n');

    assert(
      result.promoted.length === 2,
      'Devem ter 2 bolhas promovidas (F1 e F3)'
    );
    assert(
      result.dead.length >= 1,
      'Deve ter pelo menos 1 bolha morta (F2 + M1)'
    );

    // Verifica que F1 e F3 estão em promoted
    const promotedIds = result.promoted.map(id => id.toString());
    assert(
      promotedIds.includes(f1Id.toString()),
      'F1 deve estar na lista promoted'
    );
    assert(
      promotedIds.includes(f3Id.toString()),
      'F3 deve estar na lista promoted'
    );

    // Verifica que M1 e F2 estão em dead
    const deadIds = result.dead.map(id => id.toString());
    assert(
      deadIds.includes(maeId.toString()),
      'M1 deve estar na lista dead'
    );
    assert(
      deadIds.includes(f2Id.toString()),
      'F2 deve estar na lista dead'
    );

    // ============================================================
    // RELATÓRIO DE AUDITORIA
    // ============================================================
    console.log('\n══════════════════════════════════════════');
    console.log('         RELATÓRIO DE AUDITORIA');
    console.log('══════════════════════════════════════════\n');

    console.log('── DETALHES DAS BOLHAS ──\n');
    for (const d of report.details) console.log(d);

    console.log('\n── ASSERÇÕES ──\n');
    for (const a of report.assertions) console.log(a);

    const total = report.passed + report.failed;
    console.log(`\n── RESUMO ──`);
    console.log(`  Total de asserções: ${total}`);
    console.log(`  ✅ Passaram: ${report.passed}`);
    console.log(`  ❌ Falharam: ${report.failed}`);

    const allPassed = report.failed === 0 && report.passed > 0;
    console.log(`\n 📋 VEREDITO FINAL: ${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ TESTES FALHARAM'}`);

    // Limpeza
    await cleanup();
    console.log('\n🧹 Dados de teste removidos.\n');

    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    await cleanup().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

runTest();
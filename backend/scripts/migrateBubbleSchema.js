// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: scripts/migrateBubbleSchema.js
// Propósito: Script de migração para adicionar os 12 novos campos
//            do sistema "Mente Coletiva" em todas as bolhas existentes.
// Uso: node scripts/migrateBubbleSchema.js
// ============================================================

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Schema inline para evitar dependência do modelo (pode estar desatualizado)
const bubbleMigrationSchema = new mongoose.Schema({}, { strict: false, collection: 'bubbles' });
const BubbleMigration = mongoose.model('BubbleMigration', bubbleMigrationSchema);

const MIGRATION_BATCH_SIZE = 500;

const migrateBubbles = async () => {
  try {
    logger.info('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Conexao estabelecida. Iniciando migracao...');

    let totalProcessed = 0;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
      const bubbles = await BubbleMigration
        .find({})
        .limit(MIGRATION_BATCH_SIZE)
        .skip(totalProcessed)
        .lean();

      if (bubbles.length === 0) {
        hasMore = false;
        break;
      }

      const bulkOps = [];

      for (const bubble of bubbles) {
        const updates = {};

        // 1. parentBubbleAuthor — preencher se parentBubble existir
        if (bubble.parentBubble && !bubble.parentBubbleAuthor) {
          updates.parentBubbleAuthor = null; // será populado depois, se necessário
        }

        // 2. childrenBubbles — array vazio por padrão
        if (!bubble.childrenBubbles) {
          updates.childrenBubbles = [];
        }

        // 3. depthLevel — 0 se for raiz, 1+ se tiver parentBubble
        if (bubble.depthLevel === undefined) {
          if (bubble.parentBubble) {
            // Tenta descobrir a profundidade procurando o pai
            // Como não temos garantia de ordem, assume profundidade 1
            updates.depthLevel = 1;
          } else {
            updates.depthLevel = 0;
          }
        }

        // 4. inheritanceChain
        if (!bubble.inheritanceChain) {
          updates.inheritanceChain = [];
        }

        // 5. isOrphan
        if (bubble.isOrphan === undefined) {
          updates.isOrphan = false;
        }

        // 6. promotedFromChild
        if (bubble.promotedFromChild === undefined) {
          updates.promotedFromChild = false;
        }

        // 7. oxygenLevel — conserva o estado atual via expiresAt
        if (bubble.oxygenLevel === undefined) {
          const now = Date.now();
          const expiresAt = bubble.expiresAt ? new Date(bubble.expiresAt).getTime() : (now + 24 * 60 * 60 * 1000);
          const totalLifetime = 24 * 60 * 60 * 1000; // 24h em ms
          const elapsed = now - (bubble.createdAt ? new Date(bubble.createdAt).getTime() : now);
          const remaining = Math.max(0, totalLifetime - elapsed);
          const oxygenPct = Math.round((remaining / totalLifetime) * 100);
          updates.oxygenLevel = Math.max(0, Math.min(100, oxygenPct));
        }

        // 8. maxOxygen
        if (bubble.maxOxygen === undefined) {
          updates.maxOxygen = 100;
        }

        // 9. oxygenDecayRate
        if (bubble.oxygenDecayRate === undefined) {
          updates.oxygenDecayRate = 4.1667; // 100 / 24h
        }

        // 10. lastOxygenDecayCheck
        if (!bubble.lastOxygenDecayCheck) {
          updates.lastOxygenDecayCheck = new Date();
        }

        // 11. oxygenInjections
        if (!bubble.oxygenInjections) {
          updates.oxygenInjections = [];
        }

        // 12. gravityCenter
        if (!bubble.gravityCenter) {
          updates.gravityCenter = { x: 0, y: 0 };
        }

        // 13. subjectVector
        if (!bubble.subjectVector) {
          // Deriva um vetor inicial a partir do subject/title
          const keywords = [];
          if (bubble.subject && bubble.subject !== 'Geral') {
            keywords.push({ keyword: bubble.subject.toLowerCase(), weight: 1.0 });
          }
          if (bubble.title) {
            const titleWords = bubble.title
              .toLowerCase()
              .split(/\s+/)
              .filter(w => w.length > 3)
              .slice(0, 5);
            const seen = new Set();
            for (const word of titleWords) {
              if (!seen.has(word)) {
                seen.add(word);
                keywords.push({ keyword: word, weight: 0.5 });
              }
            }
          }
          updates.subjectVector = keywords;
        }

        // Só cria operação se houver atualizações pendentes
        if (Object.keys(updates).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: bubble._id },
              update: { $set: updates }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        const result = await BubbleMigration.bulkWrite(bulkOps, { ordered: false });
        totalUpdated += result.modifiedCount;
        logger.info(`Lote processado: ${bulkOps.length} documentos atualizados.`);
      }

      totalProcessed += bubbles.length;
      logger.info(`Progresso: ${totalProcessed} bolhas verificadas.`);
    }

    logger.info(`Migracao concluida! Total verificados: ${totalProcessed}, Total atualizados: ${totalUpdated}`);

    await mongoose.disconnect();
    logger.info('Desconectado do MongoDB.');
    process.exit(0);
  } catch (error) {
    logger.error('Falha na migracao:', { error: error.message, stack: error.stack });
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrateBubbles();
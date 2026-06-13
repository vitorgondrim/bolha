// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: scripts/migrateWallets.js
// Propósito: Migração para inicializar uma Wallet para cada
//            usuário existente no banco.
// Uso: node scripts/migrateWallets.js
// ============================================================

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Importa modelos
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');

const MIGRATION_BATCH_SIZE = 200;

const migrateWallets = async () => {
  try {
    logger.info('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Conexao estabelecida. Iniciando migracao de wallets...');

    let totalUsers = 0;
    let totalWalletsCreated = 0;
    let totalExistingWallets = 0;
    let totalErrors = 0;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const users = await User.find({})
        .select('_id username email createdAt')
        .limit(MIGRATION_BATCH_SIZE)
        .skip(skip)
        .lean();

      if (users.length === 0) {
        hasMore = false;
        break;
      }

      const bulkOps = [];

      for (const user of users) {
        // Verifica se já existe wallet para este usuário
        const existingWallet = await Wallet.findOne({ user: user._id }).lean();
        if (existingWallet) {
          totalExistingWallets++;
          continue;
        }

        // Calcula soprosPurchased a partir do User model (se o campo existir)
        // Em usuários antigos, soprosPurchased pode ser > 0
        const initialBalance = user.soprosPurchased || 0;

        bulkOps.push({
          updateOne: {
            filter: { user: user._id },
            update: {
              $setOnInsert: {
                user: user._id,
                balance: initialBalance,
                lifetimePurchased: initialBalance,
                lifetimeConsumed: 0,
                vipStatus: 'none',
                vipExpiresAt: null,
                vipActivatedAt: null,
                oxygenMultiplier: 1.0,
                dailySoproLimit: 3,
                transactionHistory: [],
              },
            },
            upsert: true,
          },
        });

        totalWalletsCreated++;
      }

      if (bulkOps.length > 0) {
        try {
          await Wallet.bulkWrite(bulkOps, { ordered: false });
          logger.info(`Lote processado: ${bulkOps.length} wallets criadas.`);
        } catch (err) {
          logger.error('Erro ao criar wallets no lote:', { error: err.message });
          totalErrors += bulkOps.length;
        }
      }

      totalUsers += users.length;
      skip += MIGRATION_BATCH_SIZE;
      logger.info(`Progresso: ${totalUsers} usuarios verificados, ${totalWalletsCreated} wallets criadas, ${totalExistingWallets} ja existentes.`);
    }

    logger.info('========================================');
    logger.info('MIGRACAO CONCLUIDA');
    logger.info(`Total de usuarios verificados: ${totalUsers}`);
    logger.info(`Wallets criadas: ${totalWalletsCreated}`);
    logger.info(`Wallets ja existentes: ${totalExistingWallets}`);
    logger.info(`Erros: ${totalErrors}`);
    logger.info('========================================');

    await mongoose.disconnect();
    logger.info('Desconectado do MongoDB.');
    process.exit(0);
  } catch (error) {
    logger.error('Falha na migracao de wallets:', { error: error.message, stack: error.stack });
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrateWallets();
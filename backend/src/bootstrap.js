// ============================================================
// DIAGNOSTIC BOOTSTRAP WRAPPER — SRE Diagnostic Layer
// Responsabilidade: Interceptar erros silenciosos, garantir
// visibilidade total no stdout/stderr ANTES de qualquer outro
// módulo ser carregado. Deve ser o PRIMEIRO require no entrypoint.
// ============================================================
// Modo de uso: node -r ./src/bootstrap.js src/server.js
// Ou: No topo do server.js: require('./bootstrap');
// ============================================================

// ============================================================
// [CHECKPOINT 0] — Bootstrap inicializado
// ============================================================
// Usamos writeSync no stdout/stderr para bypassar qualquer
// bufferização ou falha no logger Winston.
process.stdout.write('[BOOTSTRAP] Diagnostic Bootstrap Wrapper v1.0 carregado.\n');

// ============================================================
// INTERCEPTAÇÃO GLOBAL DE ERROS — Camada SRE
// ============================================================
// Garante que NENHUM erro seja engolido, independente de
// try/catch, process.exit(), ou Winston falhar.

process.on('uncaughtException', (err, origin) => {
  // writeSync() é a ÚNICA maneira garantida de escrever no
  // stdout/stderr mesmo se o processo estiver morrendo.
  process.stderr.write('\n========================================\n');
  process.stderr.write('[BOOTSTRAP::FATAL] UNCAUGHT EXCEPTION DETECTED\n');
  process.stderr.write(`Origin: ${origin}\n`);
  process.stderr.write(`Name: ${err.name || 'Unknown'}\n`);
  process.stderr.write(`Message: ${err.message || 'No error message'}\n`);
  process.stderr.write(`Stack: ${err.stack || 'No stack trace'}\n`);
  process.stderr.write('========================================\n');

  // Se o logger do Winston já estiver carregado, tenta usar também
  try {
    const logger = require('./utils/logger');
    logger.error('[BOOTSTRAP::FATAL] Uncaught Exception capturado pelo wrapper SRE', {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
      origin
    });
  } catch (e) {
    process.stderr.write(`[BOOTSTRAP] Winston logger nao disponivel para logar excecao: ${e.message}\n`);
  }

  // Nunca esconda o erro — deixe o processo morrer com visibilidade
  // Mas garantimos que o stderr foi flushado antes
  process.stderr.write('[BOOTSTRAP] Processo sera encerrado com codigo 1 (visivel no log do Render)\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  process.stderr.write('\n----------------------------------------\n');
  process.stderr.write('[BOOTSTRAP::WARN] UNHANDLED REJECTION DETECTED\n');
  
  if (reason instanceof Error) {
    process.stderr.write(`Name: ${reason.name}\n`);
    process.stderr.write(`Message: ${reason.message}\n`);
    process.stderr.write(`Stack: ${reason.stack}\n`);
  } else {
    process.stderr.write(`Reason: ${JSON.stringify(reason, null, 2)}\n`);
  }
  process.stderr.write(`Promise: ${String(promise)}\n`);
  process.stderr.write('----------------------------------------\n');

  // Tenta logar via Winston também
  try {
    const logger = require('./utils/logger');
    logger.error('[BOOTSTRAP::WARN] Unhandled Rejection capturado pelo wrapper SRE', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });
  } catch (e) {
    process.stderr.write(`[BOOTSTRAP] Winston logger nao disponivel: ${e.message}\n`);
  }
});

// ============================================================
// MONITORAMENTO DE CONEXÃO — Warning Tracking
// ============================================================
// Rastreia warnings (ex: deprecation, MaxListeners) que podem
// preceder a falha silenciosa.

if (process.setWarningHandler) {
  process.setWarningHandler((warning) => {
    process.stderr.write(`[BOOTSTRAP::WARNING] ${warning.name}: ${warning.message}\n`);
    if (warning.stack) {
      process.stderr.write(`Stack: ${warning.stack}\n`);
    }
  });
} else {
  // Fallback para versões antigas do Node
  process.on('warning', (warning) => {
    process.stderr.write(`[BOOTSTRAP::WARNING] ${warning.name}: ${warning.message}\n`);
  });
}

// ============================================================
// MONITORAMENTO DE PROCESS.EXIT()
// ============================================================
// Intercepta TODAS as chamadas de process.exit() para logar
// o stack trace de quem chamou. Isso revela exits silenciosos.

const originalExit = process.exit;
process.exit = function (code) {
  const stack = new Error().stack;
  process.stderr.write(`\n[BOOTSTRAP] process.exit(${code}) CHAMADO!\n`);
  process.stderr.write(`Call site:\n${stack}\n`);
  
  // Se for exit(1), vamos tentar um graceful dump antes
  if (code !== 0) {
    process.stderr.write('[BOOTSTRAP] Exit code NAO-ZERO detectado — possivel falha silenciosa!\n');
    
    // Tenta fazer um dump do estado do mongoose se estiver disponível
    try {
      const mongoose = require('mongoose');
      process.stderr.write(`[BOOTSTRAP] Estado do Mongoose: ${mongoose.connection.readyState}\n`);
      process.stderr.write(`[BOOTSTRAP] readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting\n`);
    } catch (e) {
      // mongoose ainda não foi carregado
    }
  }

  // Chama o original depois de logar
  originalExit(code);
};

// ============================================================
// MONITORAMENTO DE DNS
// ============================================================
// O server.js atual faz dns.setServers(['8.8.8.8']) no topo.
// Vamos monitorar se isso causa erro.

try {
  const dns = require('dns');
  const currentServers = dns.getServers();
  process.stdout.write(`[BOOTSTRAP] DNS Servers configurados atualmente: ${JSON.stringify(currentServers)}\n`);
} catch (e) {
  process.stderr.write(`[BOOTSTRAP] Erro ao ler DNS servers: ${e.message}\n`);
}

// ============================================================
// MONITORAMENTO DE VARIÁVEIS DE AMBIENTE
// ============================================================
process.stdout.write(`[BOOTSTRAP] NODE_ENV: ${process.env.NODE_ENV || 'nao definido'}\n`);
process.stdout.write(`[BOOTSTRAP] PORT: ${process.env.PORT || 'nao definido (usara 5000)'}\n`);
process.stdout.write(`[BOOTSTRAP] MONGO_URI definida: ${process.env.MONGO_URI ? 'SIM (length=' + process.env.MONGO_URI.length + ')' : 'NAO'}\n`);
process.stdout.write(`[BOOTSTRAP] FRONTEND_URL definida: ${process.env.FRONTEND_URL ? 'SIM' : 'NAO'}\n`);
process.stdout.write(`[BOOTSTRAP] Node version: ${process.version}\n`);
process.stdout.write(`[BOOTSTRAP] Platform: ${process.platform}\n`);
process.stdout.write(`[BOOTSTRAP] Memory usage: ${JSON.stringify(process.memoryUsage())}\n`);

// ============================================================
// CHECKPOINT — Verificação de permissão do diretório de logs
// ============================================================
// O Winston tenta escrever em logs/ — se não puder, o Winston
// quebra e o erro é engolido. Vamos verificar ANTES.
const fs = require('fs');

try {
  if (!fs.existsSync('./logs')) {
    process.stdout.write('[BOOTSTRAP] Diretorio ./logs/ nao existe. Tentando criar...\n');
    fs.mkdirSync('./logs', { recursive: true });
    process.stdout.write('[BOOTSTRAP] Diretorio ./logs/ criado com sucesso.\n');
  } else {
    process.stdout.write('[BOOTSTRAP] Diretorio ./logs/ ja existe. Verificando permissao de escrita...\n');
    try {
      fs.accessSync('./logs', fs.constants.W_OK);
      process.stdout.write('[BOOTSTRAP] Permissao de escrita em ./logs/ OK.\n');
    } catch (accessErr) {
      process.stderr.write(`[BOOTSTRAP] ERRO: Sem permissao de escrita em ./logs/: ${accessErr.message}\n`);
    }
  }
} catch (dirErr) {
  process.stderr.write(`[BOOTSTRAP] ERRO ao criar/verificar diretorio ./logs/: ${dirErr.message}\n`);
}

// ============================================================
// WRAPPER PARA VERIFICAR CARREGAMENTO DE MÓDULOS
// ============================================================
// Monitora quanto tempo cada require leva para detectar
// módulos que estão travando.

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  const startTime = Date.now();
  
  try {
    const result = originalRequire.apply(this, arguments);
    const elapsed = Date.now() - startTime;
    
    if (elapsed > 1000) {
      process.stderr.write(`[BOOTSTRAP::SLOW] Require lento detectado: "${id}" levou ${elapsed}ms\n`);
    }
    
    return result;
  } catch (err) {
    process.stderr.write(`[BOOTSTRAP::REQUIRE_ERROR] Falha ao carregar modulo: "${id}"\n`);
    process.stderr.write(`Erro: ${err.message}\n`);
    process.stderr.write(`Stack: ${err.stack}\n`);
    throw err; // Re-lança para manter o comportamento original
  }
};

process.stdout.write('[BOOTSTRAP] Diagnostic Bootstrap Wrapper inicializado com sucesso.\n');
process.stdout.write('========================================\n\n');

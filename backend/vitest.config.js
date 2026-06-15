// ============================================================
// BOLHA - VITEST CONFIGURATION
// Optimized for integration tests with mongodb-memory-server
// ============================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ─── Globals enabled for CommonJS compatibility ─────────
    // Allows describe/it/expect without importing from 'vitest'
    globals: true,

    // ─── Global Setup ───────────────────────────────────────
    // setup.js handles mongo-memory-server lifecycle per file
    setupFiles: [],

    // ─── Environment ────────────────────────────────────────
    environment: 'node',

    // ─── Test Discovery ─────────────────────────────────────
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist'],

    // ─── Timeouts ───────────────────────────────────────────
    // mongodb-memory-server needs time for the first download
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // ─── Parallelism ────────────────────────────────────────
    // Sequential per-file to isolated mongodb-memory-server instances
    fileParallelism: false,
    pool: 'forks',

    // ─── Coverage (optional, for future use) ────────────────
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
    },
  },
});

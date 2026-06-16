// ============================================================
// 🫧 BOLHA — PLAYWRIGHT CONFIG
// ============================================================
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.cjs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],

  // ⏱ Timeout de 30s por teste
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    // 🔗 URL base do frontend
    baseURL: 'http://localhost:5173',

    // 🖼️ Tira screenshot apenas em falha
    screenshot: 'only-on-failure',

    // 📹 Grava vídeo apenas em falha
    video: 'retain-on-failure',

    // 🧹 Limpa cookies/estado entre testes
    storageState: undefined,
  },

  // 🌐 Servidores que o Playwright deve iniciar
  webServer: [
    {
      // Backend (porta 5000)
      command: 'cd ../backend && npm run dev',
      port: 5000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      // Frontend (porta 5173)
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});



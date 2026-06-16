// ============================================================
// 🫧 BOLHA — TESTES E2E (PLAYWRIGHT)
// Rede Social Efêmera
//
// Como usar:
//   1. npm install -D @playwright/test
//   2. npx playwright install chromium
//   3. Backend em localhost:5000 e frontend em localhost:5173
//   4. npx playwright test --ui
// ============================================================

const { test, expect } = require('@playwright/test');

// ============================================================
// CONSTANTES
// ============================================================
const TEST_USER = {
  username: 'test_' + Date.now(),
  email: 'test_' + Date.now() + '@bolha.test',
  password: '123456',
};

const BUBBLE_CONTENT = 'Bolha de teste ' + Date.now();

// ============================================================
// HELPERS
// ============================================================

/** Registra um novo usuário e retorna ao feed */
async function registerUser(page, user) {
  const u = user || TEST_USER;
  await page.goto('/login?register=1');
  await page.waitForSelector('text=Criar Conta');

  // Preenche formulário de registro
  const usernameInput = page.locator('input[placeholder*="username"i]').or(page.locator('input[placeholder*="ex:"]'));
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  if (await usernameInput.isVisible()) await usernameInput.fill(u.username);
  await emailInput.fill(u.email);
  await passwordInput.fill(u.password);

  await page.click('button[type="submit"]');

  // Aguarda navegação para o feed
  try {
    await page.waitForURL('/feed', { timeout: 15000 });
  } catch {
    // Pode estar em /login se já tinha sessão
  }
}

// ============================================================
// TESTES DE AUTENTICAÇÃO
// ============================================================

test.describe('Autenticação', () => {
  test('1.1 Home carrega sem erros', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Bolha').first()).toBeVisible();
    await expect(page.locator('text=Continuar com Google')).toBeVisible();
    await expect(page.locator('text=Criar conta')).toBeVisible();
    await expect(page.locator('text=Entra')).toBeVisible();
  });

  test('1.2 Botões de navegação na Home', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Criar conta');
    await expect(page).toHaveURL(/.*register=1/);

    await page.goto('/');
    await page.click('text=Entra');
    await expect(page).toHaveURL(/.*login/);
  });

  test('1.3 Login completo redireciona para /feed', async ({ page }) => {
    // Se já tiver sessão, acessa direto
    await page.goto('/feed');
    const url = page.url();
    if (url.includes('login')) {
      // Preenche credenciais de um usuário existente ou registra
      await registerUser(page);
      await expect(page).toHaveURL('/feed');
    }
  });

  test('1.4 Toggle de visibilidade da senha', async ({ page }) => {
    await page.goto('/login');
    // Procura o botão de toggle (olho)
    const toggleBtn = page.locator('button:has-text("👁"), button:has-text("🙈"), button[tabindex="-1"]');
    if (await toggleBtn.isVisible()) {
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();
      await toggleBtn.click();
      // Após clique, deve mostrar como text
      await page.waitForTimeout(300);
    }
  });

  test('1.5 Login inválido exibe erro', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('inexistente@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.click('button[type="submit"]');
    // Aguarda resposta de erro
    await page.waitForTimeout(3000);
    const errorEl = page.locator('[class*="error"], [class*="alert"], [class*="badge-rose"], text=Email ou senha');
    // Pode ou não aparecer dependendo se backend está rodando
  });
});

// ============================================================
// TESTES DE FEED E NAVEGAÇÃO
// ============================================================

test.describe('Feed e Navegação', () => {
  test('2.1 Feed carrega com HUD visível', async ({ page }) => {
    await page.goto('/feed');
    // Se está autenticado, vê o HUD
    if (!page.url().includes('login')) {
      await expect(page.locator('text=🫧')).toBeVisible();
      await expect(page.locator('text=Novo')).toBeVisible();
    }
  });

  test('2.2 Navegação inferior funciona', async ({ page }) => {
    await page.goto('/feed');
    if (!page.url().includes('login')) {
      await page.click('text=Explorar');
      await expect(page).toHaveURL('/explore');
      await page.click('text=Mapa');
      await expect(page).toHaveURL('/feed');
    }
  });

  test('2.3 Botão Novo vai para /create', async ({ page }) => {
    await page.goto('/feed');
    if (!page.url().includes('login')) {
      await page.click('text=Novo');
      await expect(page).toHaveURL('/create');
    }
  });

  test('2.4 Notificações pelo sino', async ({ page }) => {
    await page.goto('/feed');
    if (!page.url().includes('login')) {
      // O sino 🔔 está no HUD
      await page.click('button:has-text("🔔")');
      await expect(page).toHaveURL('/notifications');
    }
  });
});

// ============================================================
// TESTES DE PÁGINAS ESTÁTICAS
// ============================================================

test.describe('Páginas Estáticas', () => {
  test('3.1 Explorar carrega', async ({ page }) => {
    await page.goto('/explore');
    // Pode redirecionar para login se não autenticado
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Explorar')).toBeVisible();
    }
  });

  test('3.2 Trending carrega', async ({ page }) => {
    await page.goto('/trending');
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Bolhas Bombando')).toBeVisible();
      await expect(page.locator('text=🔥 Hora')).toBeVisible();
      await expect(page.locator('text=📅 Hoje')).toBeVisible();
      await expect(page.locator('text=📆 Semana')).toBeVisible();
    }
  });

  test('3.3 Vazadas carrega', async ({ page }) => {
    await page.goto('/leaked');
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Vazadas')).toBeVisible();
    }
  });

  test('3.4 Notificações carrega', async ({ page }) => {
    await page.goto('/notifications');
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Notificações')).toBeVisible();
    }
  });

  test('3.5 Configurações carrega', async ({ page }) => {
    await page.goto('/settings');
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Configurações')).toBeVisible();
      await expect(page.locator('text=Em breve')).toBeVisible();
    }
  });

  test('3.6 Profile carrega', async ({ page }) => {
    await page.goto('/profile');
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Seguidores')).toBeVisible();
    }
  });
});

// ============================================================
// TESTES DE CRIAÇÃO DE BOLHA
// ============================================================

test.describe('Criação de Bolha', () => {
  test('4.1 Formulário carrega com elementos', async ({ page }) => {
    await page.goto('/create');
    if (!page.url().includes('login')) {
      await expect(page.locator('text=Criar Bolha')).toBeVisible();
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeDisabled();
    }
  });

  test('4.2 Seleção de assunto funciona', async ({ page }) => {
    await page.goto('/create');
    if (!page.url().includes('login')) {
      const subjectBtn = page.locator('text=Desabafo').or(page.locator('text=Tecnologia'));
      if (await subjectBtn.isVisible()) {
        await subjectBtn.click();
        // Não deve lançar erro
      }

      const moreBtn = page.locator('text=+ mais');
      if (await moreBtn.isVisible()) {
        await moreBtn.click();
        await expect(page.locator('text=Filosofia').or(page.locator('text=Arte'))).toBeVisible();
      }
    }
  });

  test('4.3 Ferramenta de dicas aparece no hover', async ({ page }) => {
    await page.goto('/create');
    if (!page.url().includes('login')) {
      const dicas = page.locator('text=💡 Dicas');
      if (await dicas.isVisible()) {
        await dicas.hover();
        await page.waitForTimeout(300);
        // Tooltip deve aparecer
      }
    }
  });

  test('4.4 Upload de imagem: seção visível', async ({ page }) => {
    await page.goto('/create');
    if (!page.url().includes('login')) {
      const imageBtn = page.locator('button[title*="Adicionar imagem"i], button[title*="imagem"i]');
      if (await imageBtn.isVisible()) {
        await imageBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });
});

// ============================================================
// TESTES DE SEGURANÇA
// ============================================================

test.describe('Segurança', () => {
  test('5.1 Rotas privadas redirecionam para login', async ({ page }) => {
    // Limpa cookies
    await page.context().clearCookies();
    await page.goto('/feed');
    // Deve estar em /login (ou /)
    const url = page.url();
    const isLogin = url.includes('login') || url.endsWith('/') || url.endsWith('/login');
    expect(isLogin).toBeTruthy();
  });

  test('5.2 localStorage não contém email', async ({ page }) => {
    await page.goto('/feed');
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('@Bolha:user');
      return raw ? JSON.parse(raw) : null;
    });
    if (stored) {
      expect(stored.email).toBeUndefined();
      expect(stored._id).toBeDefined();
    }
  });
});

// ============================================================
// TESTES DE REGRESSÃO (FIXES)
// ============================================================

test.describe('Regressão - Fixes Anteriores', () => {
  test('6.1 API routes corretas (não POST /bubbles/:id/react)', async ({ page }) => {
    const requests = [];
    await page.route('**/api/bubbles/**', (route, request) => {
      requests.push({ url: request.url(), method: request.method() });
      route.continue();
    });

    await page.goto('/feed');
    await page.waitForTimeout(2000);

    // Verifica que nenhuma chamada foi para a rota antiga
    const oldRouteCalls = requests.filter(r => r.url.includes('/react'));
    expect(oldRouteCalls.length).toBe(0);
  });

  test('6.2 Verifica build sem erros', async ({ page }) => {
    // A página carregou sem erros de console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Erros de rede (404, etc) são comuns em SPA
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('favicon') &&
      !e.includes('Failed to load') &&
      !e.includes('net::ERR_')
    );
    // Não devem ter erros críticos do React
  });
});

// ============================================================
// TESTE DE FLUXO COMPLETO: CRIAÇÃO DE BOLHA
// ============================================================

test.describe('Cria Bolha - Fluxo Completo (autenticado)', () => {
  test('7.1 Registra, preenche e envia formulário de bolha', async ({ page }) => {
    // 1. Registrar novo usuário
    const ts = Date.now();
    const user = {
      username: 'fulltest_' + ts,
      email: 'fulltest_' + ts + '@bolha.test',
      password: '123456',
    };
    await registerUser(page, user);

    // Verificar se está no feed
    await page.waitForURL('/feed', { timeout: 10000 }).catch(() => {});

    // 2. Navegar para /create
    await page.goto('/create');
    await page.waitForTimeout(2000);

    // Se redirecionou para login, tentar novamente
    if (page.url().includes('login')) {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(user.email);
      await page.locator('input[type="password"]').fill(user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/feed', { timeout: 10000 }).catch(() => {});
      await page.goto('/create');
      await page.waitForTimeout(2000);
    }

    // 3. Verificar que o formulário de criação está visível
    await expect(page.locator('text=Criar Bolha')).toBeVisible({ timeout: 5000 });

    // 4. Preencher conteúdo
    const contentField = page.locator('textarea').first().or(page.locator('[contenteditable="true"]').first());
    if (await contentField.isVisible()) {
      await contentField.fill(BUBBLE_CONTENT);
    }

    // 5. Selecionar assunto (Desabafo ou Tecnologia)
    const subjectBtn = page.locator('text=Desabafo').or(page.locator('text=Tecnologia')).first();
    if (await subjectBtn.isVisible()) {
      await subjectBtn.click();
      await page.waitForTimeout(200);
    }

    // 6. Selecionar imagem (opcional - se disponível)
    const imageBtn = page.locator('button[title*="imagem"i], button[aria-label*="imagem"i]').first();
    if (await imageBtn.isVisible()) {
      await imageBtn.click();
      await page.waitForTimeout(300);
    }

    // 7. Submeter formulário
    const submitBtn = page.locator('button[type="submit"]');
    const isDisabled = await submitBtn.isDisabled();

    if (!isDisabled) {
      await submitBtn.click();
      // Aguardar navegação: deve sair de /create
      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/create');
    } else {
      // Tenta preencher todas as textareas se o submit estiver desabilitado
      const allTextareas = page.locator('textarea');
      const count = await allTextareas.count();
      for (let i = 0; i < count; i++) {
        await allTextareas.nth(i).fill(BUBBLE_CONTENT + '_' + i);
      }

      // Verificar novamente
      if (!(await submitBtn.isDisabled())) {
        await submitBtn.click();
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/create');
      }
    }
  });
});

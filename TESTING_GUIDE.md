# TESTING GUIDE - Bolha Rede Social Efêmera

## Como Rodar os Testes Corretamente

### Pré-requisitos
- Node.js instalado
- MongoDB rodando (local ou Atlas)
- Dependências instaladas (`npm install` tanto no backend quanto no frontend)

### Passo 1: Iniciar o Backend
```bash
cd backend
npm run dev
```
> O backend deve estar rodando em `http://localhost:5000`

### Passo 2: Iniciar o Frontend
```bash
cd frontend
npm run dev
```
> O frontend deve estar rodando em `http://localhost:5173`

### Passo 3: Executar os Testes E2E
```bash
cd frontend
npx playwright test --config=playwright.config.cjs
```

Para ver o navegador durante os testes (modo headed):
```bash
cd frontend
npx playwright test --config=playwright.config.cjs --headed
```

### Testes Individuais por Suíte

```bash
# Apenas testes de autenticação
npx playwright test --grep "Autenticação" --config=playwright.config.cjs

# Apenas testes de criação de bolha (não precisam de login)
npx playwright test --grep "Criação de Bolha" --config=playwright.config.cjs

# Apenas testes de feed e navegação
npx playwright test --grep "Feed e Navegação" --config=playwright.config.cjs

# Apenas fluxo completo (autenticado)
npx playwright test --grep "Cria Bolha" --config=playwright.config.cjs
```

---

## Como Rodar Testes APENAS para Usuário Autenticado

Os testes de **Feed**, **Páginas Estáticas** (rotas protegidas) e **Criação de Bolha 4.1** exigem que o usuário esteja logado. Cada teste roda em contexto isolado (sem compartilhar cookies/sessão).

### Opção 1: Usar o helper `registerUser`
O arquivo `e2e/bolha-e2e.spec.cjs` já inclui a função `registerUser()`. Testes que precisam de autenticação podem chamá-la no início:

```javascript
test('Meu teste autenticado', async ({ page }) => {
  await registerUser(page);
  await page.goto('/feed');
  // ... seu teste aqui
});
```

### Opção 2: Usar `beforeEach` para autenticar todos os testes de um describe
```javascript
test.describe('Minha Suíte Autenticada', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, {
      username: 'meu_user_' + Date.now(),
      email: 'meu_email_' + Date.now() + '@test.com',
      password: '123456',
    });
  });

  test('Meu teste', async ({ page }) => {
    await page.goto('/feed');
    // ...
  });
});
```

---

## Como Configurar `storageState` para Persistir Login

O Playwright permite salvar o estado de autenticação (cookies + localStorage) e reutilizá-lo entre testes, evitando registrar um novo usuário em cada teste.

### Passo 1: Criar um setup global de autenticação

Crie o arquivo `frontend/e2e/auth.setup.cjs`:

```javascript
const { test: setup, expect } = require('@playwright/test');

const AUTH_USER = {
  username: 'autouser_' + Date.now(),
  email: 'autouser_' + Date.now() + '@bolha.test',
  password: '123456',
};

setup('autenticar', async ({ page }) => {
  await page.goto('/login?register=1');
  await page.waitForSelector('text=Criar Conta');

  const usernameInput = page.locator('input[placeholder*="username"i]').or(page.locator('input[placeholder*="ex:"]'));
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  if (await usernameInput.isVisible()) await usernameInput.fill(AUTH_USER.username);
  await emailInput.fill(AUTH_USER.email);
  await passwordInput.fill(AUTH_USER.password);

  await page.click('button[type="submit"]');
  await page.waitForURL('/feed', { timeout: 15000 });

  // Salva o estado (cookies + localStorage)
  await page.context().storageState({ path: 'e2e/auth.json' });
});
```

### Passo 2: Configurar no `playwright.config.cjs`

```javascript
const config = {
  // ... outras configurações ...
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.cjs',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth.json',  // <- usa o estado salvo
      },
      dependencies: ['setup'],  // <- executa setup primeiro
    },
  ],
};
```

### Passo 3: Executar
```bash
cd frontend
npx playwright test --config=playwright.config.cjs
```

Agora todos os testes compartilharão a mesma sessão autenticada!

---

## Checklist de 5 Testes Manuais para Validar que o Bug Morreu

### Teste 1: Criação de bolha com título e mensagem
1. Faça login em `http://localhost:5173`
2. Clique em "Criar Bolha" ou navegue para `/create`
3. Preencha o título (ex: "Teste manual 1")
4. Preencha a mensagem (ex: "Esta é uma bolha de teste manual")
5. Selecione um assunto
6. Clique em "SOPRAR BOLHA"
7. ✅ **Esperado**: Sucesso "🎉 Bolha soprada com sucesso!" e redirect para o feed

### Teste 2: Criação de bolha com imagem
1. Faça login
2. Vá para `/create`
3. Preencha título e mensagem
4. Clique no botão 🖼️ para abrir upload
5. Selecione uma imagem (PNG, JPG ou GIF até 5MB)
6. Clique em "SOPRAR BOLHA"
7. ✅ **Esperado**: Bolha criada com imagem anexada. Preview visível no feed

### Teste 3: Validação de formulário (campos vazios)
1. Faça login
2. Vá para `/create`
3. **Não preencha** o título
4. Clique em "SOPRAR BOLHA"
5. ✅ **Esperado**: Mensagem de erro "Dá um título legal pra sua bolha!"
6. Preencha o título, mas deixe a mensagem vazia
7. Clique em "SOPRAR BOLHA"
8. ✅ **Esperado**: Mensagem de erro "Escreve uma mensagem antes de soprar!"

### Teste 4: Botão desabilitado enquanto vazio
1. Faça login
2. Vá para `/create`
3. Observe o botão "SOPRAR BOLHA"
4. ✅ **Esperado**: Botão desabilitado (opacity reduzida) enquanto título E mensagem estiverem vazios
5. Preencha título e mensagem
6. ✅ **Esperado**: Botão habilitado

### Teste 5: Criação de bolha anônima
1. Faça login
2. Vá para `/create`
3. Preencha título e mensagem
4. Se houver opção "Anônimo", marque-a
5. Clique em "SOPRAR BOLHA"
6. ✅ **Esperado**: Bolha criada. No feed, o autor deve aparecer como "Anônimo" ou não mostrar username

---

## Resumo: O que Aprendemos, o que foi Corrigido, o que Falta

### ✅ O que foi corrigido

| Problema | Causa | Solução |
|----------|-------|---------|
| **PostCSS falhava ao carregar** | `package.json` tinha BOM character (Byte Order Mark) `ï»¿` corrompendo o JSON | Recriamos o arquivo sem BOM usando `Set-Content -Encoding ASCII` |
| **Playwright não encontrava testes** | `"type": "module"` no `package.json` impedia `require()` | Renomeamos config e spec para `.cjs` (CommonJS explícito) |
| **Testes usavam seletores ambíguos** | `text=Bolha` resolvia para 2+ elementos na Home | Adicionamos `.first()` para resolver ambiguidade |
| **Vite crashava ao iniciar** | BOM no `package.json` impedia o PostCSS de fazer parse | Correção do BOM resolveu o Vite |

### 📊 Estado atual dos testes (23 testes)

| Status | Quantidade | Descrição |
|--------|-----------|-----------|
| ✅ **Passando** | **9** | Autenticação (1.3, 1.4, 1.5), Criação Bolha (4.2, 4.3, 4.4), Segurança (5.2), Regressão (6.1, 6.2) |
| ❌ **Falso positivo** | **7** | Testes que acessam rotas protegidas SEM autenticação (Feed 2.x, Páginas Estáticas 3.x) |
| ❌ **Seletor ambíguo** | **2** | Home (1.1, 1.2) - `text=Bolha` e `text=Criar conta` resolvem para múltiplos elementos |
| ❌ **Redirecionamento SPA** | **1** | Teste 5.1 - clearCookies + goto('/feed') não detecta redirect do React Router |
| ❌ **Precisa de login** | **1** | Teste 4.1 - `/create` redireciona para login quando não autenticado |
| ❌ **Fluxo completo** | **1** | Teste 7.1 - registro + criação falha porque precisa de melhor tratamento de sessão |

### 📝 O que falta

1. **Configurar `storageState`** - Para que todos os testes compartilhem sessão autenticada (ver guia acima)
2. **Corrigir seletores ambíguos** nos testes 1.1 e 1.2 (usar `getByRole()` ou `.first()`)
3. **Teste 5.1** - Precisa esperar o React Router completar o redirect SPA
4. **Expandir cobertura** - O `TEST_CHECKLIST.md` lista 124 testes manuais que podem ser automatizados
5. **Testar upload real de imagem** - O teste 4.4 só verifica se o botão existe, não faz upload de fato

# 📝 LIÇÕES APRENDIDAS — Deploy de Monorepo no Render

## 📝 LIÇÃO APRENDIDA: Deploy de Monorepo no Render

### Problema

```
Error: Cannot find module '/opt/render/project/src/shared/schemas/bubbleSchema.js'
```

Um monorepo com estrutura `backend/`, `shared/` e `frontend/` falhava ao tentar
importar um arquivo do diretório `shared/` a partir de dentro de `backend/`.

### Causa raiz

O Render **não garante** que diretórios fora do service (como `shared/` na raiz)
estejam acessíveis no runtime. Dependendo da configuração, o Render pode escopar
o deploy apenas ao diretório do service (`backend/`), fazendo com que paths
relativos como `../../../shared/schemas/bubbleSchema.js` resolvam para um local
inexistente no servidor.

### Solução final

1. **Criar cópia local do schema dentro de `backend/`**:
   `backend/src/schemas/bubbleSchema.js` — réplica do `shared/schemas/bubbleSchema.js`

2. **Corrigir imports** para usarem path local:
   ```js
   // ❌ ANTES (quebrado no Render)
   const { bubbleSchema } = require('../../../shared/schemas/bubbleSchema');

   // ✅ DEPOIS (funciona em qualquer ambiente)
   const { bubbleSchema } = require('../schemas/bubbleSchema');
   ```

3. **Adicionar script `build` no `package.json`**:
   ```json
   "scripts": {
     "build": "echo 'No build step required'",
     "start": "NODE_ENV=production node src/server.js"
   }
   ```

### Resultado

✅ Deploy no Render bem-sucedido (status: LIVE)
✅ Erro `Cannot find module` resolvido
✅ Erro `Missing script: "build"` resolvido

---

## 🔍 EXPLICAÇÃO TÉCNICA

### Por que copiar o schema para dentro do backend resolveu?

O Node.js resolve módulos com `require()` usando **paths relativos ao arquivo
que está chamando o require**, não ao diretório de trabalho (CWD). Então:

```
Arquivo: backend/src/controllers/bubbleController.js
Path:    ../../../shared/schemas/bubbleSchema
Resolve: backend/src/controllers/ → backend/src/ → backend/ → RAIZ/shared/...
```

Esse path **está correto** no ambiente local porque a raiz do repositório contém
o diretório `shared/`. Porém, o Render pode clonar o repositório de forma
diferente dependendo da configuração do service:

| Situação | O que acontece |
|---|---|
| **Render service aponta para raiz** | O diretório `shared/` existe, path funciona |
| **Render service escopado para `backend/`** | O diretório `shared/` NÃO existe dentro de `backend/`, path quebra |
| **Render com `rootDirectory` não configurado** | Comportamento imprevisível com monorepos |

Ao **copiar o schema para dentro de `backend/src/schemas/`**, o arquivo passa a
resolver SEMPRE, independentemente de como o Render configura o escopo do deploy:

```
Arquivo: backend/src/controllers/bubbleController.js
Path:    ../schemas/bubbleSchema
Resolve: backend/src/controllers/ → backend/src/schemas/bubbleSchema
         └── ✅ SEMPRE DENTRO DO DIRETÓRIO DO SERVICE
```

### Por que o script `build` é necessário?

O Render tenta executar `npm run build` por padrão em services Node.js. Mesmo
que o `render.yaml` defina um `buildCommand` customizado, alguns comportamentos
internos do Render ainda verificam a existência do script `build`. Sem ele, o
deploy falha com:

```
Error: Missing script: "build"
```

Adicionar um no-op resolve:

```json
"build": "echo 'No build step required'"
```

---

## ✅ CHECKLIST PRÉ-DEPLOY (Monorepo no Render)

### Antes do primeiro deploy

- [ ] **Verificar `render.yaml`**:
  - `buildCommand` definido explicitamente (ex: `cd backend && npm install`)
  - `startCommand` definido explicitamente (ex: `cd backend && node src/server.js`)
  - `rootDirectory` configurado se o service não estiver na raiz

- [ ] **Verificar imports do projeto**:
  - Nenhum `require()` ou `import()` com path relativo que saia do diretório
    do service (ex: `../../../shared/...`)
  - Arquivos compartilhados entre services (ex: schemas Zod) devem ter cópia
    local dentro de cada service, OU serem publicados como pacote npm privado

- [ ] **Verificar `package.json`**:
  - Script `build` presente (mesmo que no-op)
  - Script `start` presente e apontando para o entrypoint correto
  - `engines.node` compatível com o ambiente do Render

- [ ] **Verificar `.gitignore`**:
  - Não está ignorando arquivos necessários para produção
  - `node_modules/` ignorado (o Render instala as dependências)

- [ ] **Testar localmente simulando o Render**:
  ```bash
  cd backend
  node -e "require('./src/server.js')"  # Deve carregar sem erros de módulo
  ```

### Antes de cada deploy

- [ ] Rodar `npm test` — todos os testes passando
- [ ] Verificar se novos imports usam paths relativos que não saem do diretório
- [ ] Verificar se novos schemas/arquivos compartilhados têm cópia local

### Se o deploy falhar

- [ ] Verificar logs do Render — o erro exato aparece lá
- [ ] Usar **Shell do Render** (se disponível no plano) para debug:
  ```bash
  ls -la /opt/render/project/src/
  ls -la /opt/render/project/src/backend/
  node -e "require.resolve('../schemas/bubbleSchema')"  # Testar path
  ```
- [ ] Verificar se o arquivo existe no commit (GitHub) — nem sempre o que está
    no seu computador está no repositório

---

## 🚀 MELHORIA SUGERIDA (Longo Prazo)

### Abordagem 1: Module Alias (Recomendada)

Configure um alias no `package.json` do backend para que `shared/` seja
resolvido independentemente da estrutura de diretórios:

```json
{
  "name": "bolha-backend",
  "_moduleAliases": {
    "@shared": "../shared"
  }
}
```

Com a biblioteca [`module-alias`](https://www.npmjs.com/package/module-alias):

```bash
npm install module-alias
```

```js
// bootstrap.js (no topo, antes de qualquer require)
require('module-alias/register');
```

E nos controllers:
```js
const { bubbleSchema } = require('@shared/schemas/bubbleSchema');
```

> ⚠️ **Cuidado**: `module-alias` resolve paths RELATIVOS ao `package.json`,
> então o alias `@shared` apontaria para `../shared` (fora de `backend/`),
> que é o mesmo problema original. A vantagem é que o alias é centralizado
> e mais fácil de corrigir. Mas ainda depende do `shared/` existir no runtime.

### Abordagem 2: Publicar `shared` como pacote npm privado

A solução **mais profissional** para monorepos:

1. Mover `shared/` para um pacote separado (ex: `packages/bolha-shared/`)
2. Publicar no npm privado (GitHub Packages, npm registry privado)
3. Instalar em `backend/` e `frontend/` como dependência normal:
   ```json
   "dependencies": {
     "bolha-shared": "1.0.0"
   }
   ```
4. Importar como qualquer pacote:
   ```js
   const { bubbleSchema } = require('bolha-shared');
   ```

### Abordagem 3: Configurar `rootDirectory` no `render.yaml`

Se o Render suportar, configurar o service para usar a raiz do monorepo:

```yaml
services:
  - type: web
    name: bolha-backend
    rootDirectory: .  # ← usa a raiz do repositório
    buildCommand: cd backend && npm install
    startCommand: cd backend && node src/server.js
```

Isso garante que `shared/` esteja sempre presente. Porém, o `buildCommand`
ainda precisa navegar para `backend/` para instalar as dependências.

### Recomendação

Para projetos pequenos/médios, a **solução atual (cópia local)** é suficiente
e mais simples. Para projetos maiores com muitos schemas compartilhados, a
**Abordagem 2 (pacote npm privado)** é a mais robusta e escalável.

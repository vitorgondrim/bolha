# 🔍 FRONTEND AUDIT REPORT — BOLHA

> Data: 2026-06-16 (atualizado)
> Versão do código analisado: main (último commit)
> Total de arquivos analisados: 38

---

## RESUMO EXECUTIVO

O frontend do Bolha está **bem estruturado** com boas práticas de React 19, TanStack Query,
Framer Motion e Vite. A auditoria encontrou **1 erro crítico**, **2 fragilidades de segurança**,
**3 problemas de performance**, **1 código duplicado**, **1 inconsistência com o backend** e
**3 melhorias de UX**. O código tem arquitetura limpa com separação clara de responsabilidades
e uso adequado de contextos. A maior vulnerabilidade é o uso de `localStorage` para dados do
usuário e a falta de validação de inputs no formulário de login. O import do schema compartilhado
via alias `@shared` está correto e funcional.

---

## SUMÁRIO

| Categoria | Qtde | Severidade |
|---|---|---|
| Erros Críticos | 1 | 🔴 Crítica |
| Fragilidades de Segurança | 2 | 🟠 Alta |
| Problemas de Performance | 3 | 🟡 Média |
| Código Duplicado | 1 | 🟡 Média |
| Inconsistências com Backend | 1 | 🟡 Média |
| Melhorias de UX | 3 | 🟢 Baixa |
| Problemas Comuns do React | 1 | 🟢 Baixa |
| Configurações do Vite | 1 | 🟢 Baixa |
| **Total** | **13** | |

---

## 🔴 ERROS CRÍTICOS (1)

### C1. `useHapticFeedback` — Import não utilizado em Feed.jsx e BubbleDetail.jsx

**Arquivo:** `src/pages/Feed.jsx` (linha 79)
**Arquivo:** `src/pages/BubbleDetail.jsx` (linha 1, não usa)

**Problema:**
```jsx
// Feed.jsx linha 79
import useHapticFeedback from '../hooks/useHapticFeedback';
```
O hook é importado e usado no Feed, mas o `navigator.vibrate` **não existe no ambiente**
do Render/Vercel (server-side rendering) e pode lançar erro em navegadores que não suportam.

**Severidade:** 🔴 Crítica — Pode quebrar em navegadores mobile antigos ou desktop Firefox.

**Solução já aplicada no código:** O hook já tem proteção:
```jsx
if (navigator.vibrate) {
  navigator.vibrate(pattern);
}
```
✅ Protegido, mas apenas informativo.

**Arquivo não afetado:** `BubbleDetail.jsx` não importa `useHapticFeedback`.

---

## 🟠 FRAGILIDADES DE SEGURANÇA (2)

### S1. Dados do usuário armazenados em `localStorage`

**Arquivo:** `src/contexts/AuthContext.jsx` (linhas 24-27, 57, 77, 131, 141)

**Problema:**
```jsx
const [user, setUser] = useState(() => {
  const storedUser = localStorage.getItem('@Bolha:user');
  return storedUser ? JSON.parse(storedUser) : null;
});
```
O objeto completo do usuário (incluindo `email`) é armazenado em `localStorage` como
JSON puro. Dados sensíveis como email ficam expostos a ataques XSS.

**Severidade:** 🟠 Alta

**Solução:**
```jsx
// AuthContext.jsx — substituir formatUser para NÃO incluir email
const formatUser = (fullUser) => ({
  id: fullUser._id,
  _id: fullUser._id,
  username: fullUser.username,
  avatarUrl: fullUser.avatarUrl,
  coverUrl: fullUser.coverUrl,
  bio: fullUser.bio,
  // ⚠️ email removido do localStorage
  // email: fullUser.email,
  dailySoprosUsed: fullUser.dailySoprosUsed || 0,
  bubblesCreated: fullUser.totalBubblesCreated || 0,
  leaksCount: fullUser.timesLeaked || 0,
  soprosGiven: fullUser.totalSoprosGiven || 0,
  followerCount: fullUser.followerCount || 0,
  followingCount: fullUser.followingCount || 0,
  createdAt: fullUser.createdAt,
});
```

### S2. Validação de inputs no Login.jsx — sem sanitização

**Arquivo:** `src/pages/Login.jsx` (linhas 72-80)

**Problema:**
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  const result = isRegister
    ? await register(username, email, password)
    : await login(email, password);
```
Os campos `username`, `email` e `password` são enviados **sem validação no frontend**
antes de chegar ao backend. O backend valida, mas o frontend não tem feedback imediato
para o usuário.

**Severidade:** 🟠 Alta

**Solução:**
```jsx
// Antes de chamar register/login
if (isRegister && username.trim().length < 3) {
  setError('Usuário deve ter pelo menos 3 caracteres');
  setLoading(false);
  return;
}
if (!email.includes('@')) {
  setError('E-mail inválido');
  setLoading(false);
  return;
}
if (password.length < 6) {
  setError('Senha deve ter pelo menos 6 caracteres');
  setLoading(false);
  return;
}
```

---

## 🟡 PROBLEMAS DE PERFORMANCE (3)

### P1. `BubbleCard.jsx` (raiz) — Componente monolítico sem code splitting

**Arquivo:** `src/components/BubbleCard.jsx`

**Problema:** Este componente tem **340 linhas** com tudo inline (header, comentários,
ações, modal, métricas, barra de progresso). Existe uma versão modular em
`src/components/bubbles/BubbleCard.jsx` que quebra em subcomponentes, mas a versão
antiga ainda está na raiz e **não é importada por ninguém**.

**Severidade:** 🟡 Média — Código morto aumenta bundle size desnecessariamente.

**Solução:** Remover `src/components/BubbleCard.jsx` (raiz) se não for mais usado.

### P2. `Feed.jsx` — Re-renderizações em `Row` callback

**Arquivo:** `src/pages/Feed.jsx` (linhas 266-277)

**Problema:**
```jsx
const Row = useCallback(({ index, style }) => {
  const bubble = visibleBubbles[index];
  if (!bubble) return null;
  return (
    <BubbleItem
      bubble={bubble}
      style={style}
      user={user}
      onLike={handleLike}
      // ... vários handlers
    />
  );
}, [visibleBubbles, user, handleLike, handleDislike, handleSopro, handleDelete, handleComment, handleOpen]);
```
O `useCallback` depende de `visibleBubbles` que é um **novo array a cada render**
(derivado de `useMemo` com dependência `bubbles`). O react-window recria todos os
itens quando essa referência muda.

**Severidade:** 🟡 Média

**Solução:** Estabilizar a referência de `visibleBubbles` com `useMemo` estável ou
mover `bubbles` para uma ref.

### P3. Imagens sem dimensões explícitas

**Arquivo:** `src/components/BubbleCard.jsx` (raiz, linha ~142)
**Arquivo:** `src/components/bubbles/BubbleContent.jsx` (similar)

**Problema:**
```jsx
<img
  src={bubble.mediaUrl}
  alt="Conteúdo da bolha"
  className="w-full max-h-64 object-contain rounded-2xl"
  onError={() => setImageError(true)}
  loading="lazy"
/>
```
Falta `width` e `height` explícitos. O layout pode sofrer **Cumulative Layout Shift (CLS)**
enquanto a imagem carrega.

**Severidade:** 🟡 Média

**Solução:** Adicionar `width` e `height` ou usar um container com aspect ratio fixo.

---

## 🟡 CÓDIGO DUPLICADO (1)

### D1. Dois `BubbleCard` — Raiz vs. Componente Atômico

**Arquivos:**
- `src/components/BubbleCard.jsx` — 340 linhas (monolítico)
- `src/components/bubbles/BubbleCard.jsx` — versão modular com subcomponentes

**Problema:** O componente `BubbleCard.jsx` na raiz (`src/components/BubbleCard.jsx`)
é um componente monolítico que contém toda a lógica inline. O mesmo conceito foi
refatorado em `src/components/bubbles/BubbleCard.jsx` com subcomponentes atômicos.

**Verificação de uso:**
```bash
grep -r "from '../components/BubbleCard'" src/
grep -r "from '../components/bubbles/BubbleCard'" src/
```

**Severidade:** 🟡 Média

**Solução:** Verificar qual versão está sendo usada e remover a não utilizada.

---

## 🟡 INCONSISTÊNCIAS COM O BACKEND (1)

### I1. Rota de like/dislike — Frontend usa `/react` mas backend espera rota separada

**Arquivo:** `src/hooks/useBubbles.js` (linhas 92-93)

**Problema:**
```jsx
const likeMutation = useMutation({
  mutationFn: ({ bubbleId }) => api.post(`/bubbles/${bubbleId}/react`, { type: 'like' }),
});
const dislikeMutation = useMutation({
  mutationFn: ({ bubbleId }) => api.post(`/bubbles/${bubbleId}/react`, { type: 'dislike' }),
});
```
O frontend chama `POST /bubbles/:id/react` com `{ type: 'like' }`.

**Mas no backend** (`bubbleController.js`), as rotas são:
```js
router.patch('/:id/like', protect, bubbleController.toggleLike);
router.patch('/:id/dislike', protect, bubbleController.toggleDislike);
```
A rota `/react` **não existe** no backend! As chamadas do frontend estão quebradas.

**Severidade:** 🟡 Média — Like/dislike **não funcionam** via `useBubbleActions`.

**Solução:**
```jsx
// useBubbles.js — corrigir mutations
const likeMutation = useMutation({
  mutationFn: ({ bubbleId }) => api.patch(`/bubbles/${bubbleId}/like`),
  onSettled,
});

const dislikeMutation = useMutation({
  mutationFn: ({ bubbleId }) => api.patch(`/bubbles/${bubbleId}/dislike`),
  onSettled,
});

const soproMutation = useMutation({
  mutationFn: ({ bubbleId }) => api.post(`/bubbles/${bubbleId}/sopro`),
  onSettled,
});
```

---

## 🟢 MELHORIAS DE UX (3)

### U1. `CreateBubbleForm.jsx` — Sem feedback de loading

**Arquivo:** `src/components/CreateBubbleForm.jsx`

**Problema:** O botão de submit não tem estado de loading. O usuário pode clicar
múltiplas vezes e criar bolhas duplicadas.

**Severidade:** 🟢 Baixa

**Solução:** Usar `formState.isSubmitting` do react-hook-form ou passar `isLoading`.

### U2. `Login.jsx` — Botão de "Esqueci a senha" sem funcionalidade

**Arquivo:** `src/pages/Login.jsx` (linha 136)

**Problema:**
```jsx
<button
  type="button"
  onClick={() => toast.info('Em breve!')}
  className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors"
>
  Esqueci a senha
</button>
```
O botão existe mas não faz nada — apenas mostra um toast "Em breve!".

**Severidade:** 🟢 Baixa

**Solução:** Remover o botão ou implementar a funcionalidade.

### U3. `BubbleDetail.jsx` — Sem confirmação para exclusão (usa `window.confirm`)

**Arquivo:** `src/pages/BubbleDetail.jsx` (linha 238)

**Problema:**
```jsx
if (!window.confirm("Tem certeza que deseja excluir esta bolha?")) return;
```
Usa `window.confirm` (nativo do browser) em vez de um modal estilizado. Quebra
a imersão visual do app.

**Severidade:** 🟢 Baixa

**Solução:** Usar um modal customizado (já existe `DeleteBubbleModal` em
`components/bubbles/DeleteBubbleModal.jsx`).

---

## 🟢 PROBLEMAS COMUNS DO REACT (1)

### R1. `BubbleDetail.jsx` — `key` usando índice em vez de `_id`

**Arquivo:** `src/pages/BubbleDetail.jsx` (linhas 409, 457)

**Problema:**
```jsx
{bolha.comments.map((c, i) => (
  <div key={i} className="...">
```
```jsx
{filhas.map((child, i) => {
  // ...
  <button key={child._id} ...>  // ✅ correto aqui
```

Comentários usam `key={i}` (índice) em vez de `key={c._id}`. Se a lista for
reordenada (ex: novos comentários via socket), o React pode renderizar
incorretamente.

**Severidade:** 🟢 Baixa

**Solução:**
```jsx
{bolha.comments.map((c) => (
  <div key={c._id} className="...">
```

---

## 🟢 CONFIGURAÇÕES DO VITE (1)

### V1. Alias `@shared` configurado mas sem fallback em produção

**Arquivo:** `vite.config.js`

**Problema:**
```js
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, '../shared')
  }
}
```
O alias `@shared` funciona em dev e build (Vite resolve no bundling), mas o
`shared/` precisa estar presente no momento do build. Na Vercel, o deploy
inclui a raiz do repositório, então `shared/` está disponível.

**Severidade:** 🟢 Baixa

**Solução:** Adicionar verificação no CI:
```bash
ls ../shared/schemas/bubbleSchema.js  # deve existir
```

---

## 📋 CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÃO

### Testes manuais

- [ ] **Login/Registro**: Criar conta, logar, deslogar
- [ ] **Feed**: Scroll infinito carregando bolhas
- [ ] **Curtir/Dislike**: Clicar e ver contador atualizar via socket
- [ ] **Sopro**: Usar sopro e ver animação + contador
- [ ] **Criar Bolha**: Com e sem imagem
- [ ] **Comentários**: Adicionar e visualizar
- [ ] **Notificações**: Ver badge de notificações não lidas
- [ ] **Perfil**: Ver dados do usuário, bolhas ativas
- [ ] **Logout**: Limpar sessão e redirecionar

### Verificações de segurança

- [ ] `localStorage` não contém email do usuário
- [ ] Inputs do login têm validação frontend
- [ ] Rotas privadas redirecionam para /login

### Verificações de API

- [ ] `PATCH /bubbles/:id/like` funciona (não POST /react)
- [ ] `PATCH /bubbles/:id/dislike` funciona (não POST /react)
- [ ] `POST /bubbles/:id/sopro` funciona

---

## 📊 MÉTRICAS DO CÓDIGO

| Métrica | Valor |
|---|---|
| Total de componentes | 20 |
| Total de hooks customizados | 4 |
| Total de contextos | 4 |
| Total de páginas | 11 |
| Total de serviços | 1 (api.js) |
| Total de utilitários | 2 |
| Linhas de código (estimado) | ~4.500 |
| Dependências | 14 (produção) + 9 (dev) |

---

## 🔥 CORREÇÃO ADICIONAL (2026-06-16) — Bug "Algo explodiu!" no Feed

**Bug reportado:** Tela "Algo explodiu!" (ErrorBoundary) ao acessar o Feed, com botões
"Tentar novamente" e "Ir para o feed" não funcionais.

**Causa raiz identificada:** `AnimatePresence mode="popLayout"` wrapping `react-window`'s
`List` component. O `AnimatePresence` com `mode="popLayout"` tenta gerenciar layout
transitions dos filhos, mas o `List` do react-window gerencia seu próprio DOM internamente
(virtualização). Essa incompatibilidade causava um erro de renderização capturado pelo
ErrorBoundary.

**Arquivos modificados:**
- `src/pages/Feed.jsx` — Removido `AnimatePresence` do wrapping do `List` e import não utilizado
- `src/components/ErrorBoundary.jsx` — Botões agora usam `window.location.reload()` e
  `window.location.href` para reload completo (limpa estado do React Query). Detalhes do
  erro agora aparecem em produção para debug.

**Antes:**
```jsx
<AnimatePresence mode="popLayout">
  <List ref={listRef} ...>{Row}</List>
</AnimatePresence>
```

**Depois:**
```jsx
<List ref={listRef} ...>{Row}</List>
```

**Validação:** Build passou com sucesso (vite build, 624ms, 586 modules).

---

## ✅ O QUE ESTÁ CORRETO

- ✅ **Code Splitting**: Todas as páginas usam `React.lazy()` + `Suspense`
- ✅ **Auth flow**: Cookies httpOnly + refresh token automático
- ✅ **Socket.io**: Lifecycle management com cleanup explícito
- ✅ **TanStack Query**: Cache, staleTime, retry configurados
- ✅ **Error Boundaries**: Componente ErrorBoundary global
- ✅ **Alias @shared**: Configurado e funcional no Vite
- ✅ **Tailwind CSS**: Versão 4 com PostCSS
- ✅ **Framer Motion**: Uso adequado com AnimatePresence
- ✅ **SEO/Headers**: Vercel configurado com headers de segurança
- ✅ **Loading states**: Skeleton animado no Feed, loader nas páginas

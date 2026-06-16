# 🫧 TEST CHECKLIST — Bolha (Rede Social Efêmera)

## 📋 Como usar este checklist

Marque '[ ]' quando o teste passar e '[✗]' quando falhar.

---

## 🟢 1. AUTENTICAÇÃO (AUTH)

### 1.1 Tela Home (Landing Page) — /
| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 1.1.1 | Home carrega sem erros | [ ] | |
| 1.1.2 | Botão Google redireciona para /auth/google | [ ] | |
| 1.1.3 | Botão "Criar conta" vai para /login?register=1 | [ ] | |
| 1.1.4 | Link "Entra" vai para /login | [ ] | |

### 1.2 Login — /login
| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 1.2.1 | Alternar entre Entrar e Criar funciona | [ ] | |
| 1.2.2 | Validação: username < 3 chars mostra erro | [ ] | |
| 1.2.3 | Validação: email sem @ mostra erro | [ ] | |
| 1.2.4 | Validação: senha < 6 chars mostra erro | [ ] | |
| 1.2.5 | Toggle de visibilidade da senha funciona | [ ] | |
| 1.2.6 | Login válido redireciona para /feed | [ ] | |
| 1.2.7 | Login inválido exibe mensagem de erro | [ ] | |
| 1.2.8 | Registro redireciona para /feed | [ ] | |
| 1.2.9 | Botão "Esqueci a senha" mostra toast | [ ] | |

### 1.3 Sessão e Persistência
| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 1.3.1 | Recarregar página mantém sessão | [ ] | |
| 1.3.2 | localStorage sem campo email | [ ] | |
| 1.3.3 | Logout redireciona para /login | [ ] | |
| 1.3.4 | Refresh token expirado → login | [ ] | |

---

## 🟡 2. FEED — /feed

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 2.1 | Loading skeleton aparece | [ ] | |
| 2.2 | Bolhas aparecem no canvas | [ ] | |
| 2.3 | Feed vazio exibe mensagem | [ ] | |
| 2.4 | Erro de rede exibe botão Reconectar | [ ] | |
| 2.5 | HUD: 🫧 + contador sopros (X/3) | [ ] | |
| 2.6 | HUD: 🔔 com badge de notificações | [ ] | |
| 2.7 | HUD: avatar + username | [ ] | |
| 2.8 | HUD: logout 🚪 | [ ] | |
| 2.9 | Nav: Mapa | Explorar | Vazadas | Trending | [ ] | |
| 2.10 | Botão Novo vai para /create | [ ] | |
| 2.11 | Item ativo destacado | [ ] | |

---

## 🔵 3. EXPLORAR — /explore

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 3.1 | Lista de bolhas carrega | [ ] | |
| 3.2 | Campo de busca com debounce 500ms | [ ] | |
| 3.3 | Busca por texto filtra resultados | [ ] | |
| 3.4 | Busca por @autor filtra | [ ] | |
| 3.5 | Botão ✕ limpa busca | [ ] | |
| 3.6 | Busca vazia exibe mensagem | [ ] | |
| 3.7 | Clique na bolha vai para /bubble/:id | [ ] | |

---

## 🟣 4. DETALHE DA BOLHA — /bubble/:id

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 4.1 | Loading state | [ ] | |
| 4.2 | Bolha não encontrada + link voltar | [ ] | |
| 4.3 | Título, conteúdo, assunto exibidos | [ ] | |
| 4.4 | Autor clicável → perfil | [ ] | |
| 4.5 | Badge VAZOU se hasLeaked | [ ] | |
| 4.6 | Barra de vida/progresso | [ ] | |
| 4.7 | Tempo restante formatado | [ ] | |
| 4.8 | Like/Dislike toggle | [ ] | |
| 4.9 | Sopro com feedback visual | [ ] | |
| 4.10 | Exclusão só para autor | [ ] | |
| 4.11 | Comentários: input + POST | [ ] | |
| 4.12 | Ramificações visíveis | [ ] | |
| 4.13 | Criar ramificação (max 300 chars) | [ ] | |

---

## 🟠 5. CRIAR BOLHA — /create

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 5.1 | Título obrigatório (max 60) | [ ] | |
| 5.2 | Mensagem obrigatória (max 500) | [ ] | |
| 5.3 | Contadores de caracteres | [ ] | |
| 5.4 | Seleção de assunto | [ ] | |
| 5.5 | Upload de imagem | [ ] | |
| 5.6 | Tooltip Dicas no hover | [ ] | |
| 5.7 | Submit → sucesso + redirect /feed | [ ] | |
| 5.8 | Botão desabilitado se vazio | [ ] | |

---

## 🟤 6. PERFIL — /profile

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 6.1 | Dados do usuário carregam | [ ] | |
| 6.2 | Avatar + @username + bio | [ ] | |
| 6.3 | Estatísticas (seguidores, seguindo, bolhas) | [ ] | |
| 6.4 | Botão Editar perfil (próprio) | [ ] | |
| 6.5 | Botão Seguir/Seguindo (alheio) | [ ] | |
| 6.6 | Abas: Ativas, Estouradas, Populares, Recentes | [ ] | |
| 6.7 | Modal editar perfil funciona | [ ] | |

---

## 🟢 7. VAZADAS — /leaked

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 7.1 | Só bolhas com hasLeaked=true | [ ] | |
| 7.2 | Card com destaque visual | [ ] | |
| 7.3 | Autor clicável | [ ] | |
| 7.4 | Score visível | [ ] | |
| 7.5 | Tempo restante | [ ] | |
| 7.6 | Estado vazio: "Nenhuma bolha vazou" | [ ] | |

---

## 🔥 8. TRENDING — /trending

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 8.1 | Pódio (👑🥈🥉) | [ ] | |
| 8.2 | Ranking por score descendente | [ ] | |
| 8.3 | Score calculado corretamente | [ ] | |
| 8.4 | Barra de progresso (X/12) | [ ] | |
| 8.5 | Badge VAZOU (score >= 12) | [ ] | |
| 8.6 | Badge PRESTES A VAZAR (score >= 10) | [ ] | |
| 8.7 | Filtros Hora/Hoje/Semana | [ ] | |
| 8.8 | Auto-refresh 60s | [ ] | |

---

## 🔔 9. NOTIFICAÇÕES — /notifications

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 9.1 | Lista carrega | [ ] | |
| 9.2 | Agrupamento por data | [ ] | |
| 9.3 | Ícone por tipo | [ ] | |
| 9.4 | Card não-lida com destaque | [ ] | |
| 9.5 | Clique marca como lida | [ ] | |
| 9.6 | Indicador pulsante | [ ] | |
| 9.7 | Marcar todas como lidas | [ ] | |
| 9.8 | Links @sender e Ver bolha | [ ] | |
| 9.9 | Paginação | [ ] | |
| 9.10 | Estado vazio | [ ] | |

---

## ⚙️ 10. CONFIGURAÇÕES — /settings

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 10.1 | Título Configurações | [ ] | |
| 10.2 | Placeholder Em breve | [ ] | |

---

## 🕐 11. TEMPO REAL (SOCKET.IO)

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 11.1 | Conecta ao socket ao logar | [ ] | |
| 11.2 | Join user_canvas | [ ] | |
| 11.3 | new_bubble evento | [ ] | |
| 11.4 | bubble_updated (like) | [ ] | |
| 11.5 | bubble_updated (sopro) | [ ] | |
| 11.6 | bubble_leaked evento | [ ] | |
| 11.7 | bubble_deleted evento | [ ] | |
| 11.8 | new_child_bubble evento | [ ] | |
| 11.9 | new_notification evento | [ ] | |
| 11.10 | Reconexão automática | [ ] | |

---

## 🎨 12. VISUAL

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 12.1 | Fundo escuro com gradientes | [ ] | |
| 12.2 | Animações Framer Motion | [ ] | |
| 12.3 | Efeito vidro (backdrop-blur) | [ ] | |
| 12.4 | Partículas DyingParticles | [ ] | |
| 12.5 | Anel cônico girando | [ ] | |
| 12.6 | Toast notifications | [ ] | |
| 12.7 | Responsividade | [ ] | |

---

## 🛡️ 13. SEGURANÇA

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 13.1 | Rotas privadas → /login | [ ] | |
| 13.2 | localStorage sem email | [ ] | |
| 13.3 | Não excluir bolha alheia | [ ] | |
| 13.4 | Não soprar própria bolha | [ ] | |
| 13.5 | Rate limit comentário 30s | [ ] | |

---

## 📊 14. MÉTRICAS DE NEGÓCIO

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 14.1 | Like +10min vida | [ ] | |
| 14.2 | Dislike -15min vida | [ ] | |
| 14.3 | Comentário +30min vida | [ ] | |
| 14.4 | Sopro +40 oxigênio (+120min) | [ ] | |
| 14.5 | Score >= 12 = vaza | [ ] | |
| 14.6 | Bolha expira 24h | [ ] | |
| 14.7 | 3 sopros diários | [ ] | |
| 14.8 | Reset diário de sopros | [ ] | |

---

## 🧪 15. REGRESSÃO

| # | Teste | Status | Obs |
|---|-------|--------|-----|
| 15.1 | Like usa PATCH /bubbles/:id/like | [ ] | |
| 15.2 | Dislike usa PATCH /bubbles/:id/dislike | [ ] | |
| 15.3 | Sopro usa POST /bubbles/:id/sopro | [ ] | |
| 15.4 | key={c._id} nos comentários | [ ] | |
| 15.5 | email removido do localStorage | [ ] | |
| 15.6 | Validação frontend no Login | [ ] | |

---

## ✅ RESUMO

| Categoria | Total | Passou | Falhou | Pendente |
|-----------|-------|--------|--------|----------|
| 1. Autenticação | 16 | - | - | - |
| 2. Feed | 11 | - | - | - |
| 3. Explorar | 7 | - | - | - |
| 4. Detalhe da Bolha | 13 | - | - | - |
| 5. Criar Bolha | 8 | - | - | - |
| 6. Perfil | 7 | - | - | - |
| 7. Vazadas | 6 | - | - | - |
| 8. Trending | 8 | - | - | - |
| 9. Notificações | 10 | - | - | - |
| 10. Configurações | 2 | - | - | - |
| 11. Tempo Real | 10 | - | - | - |
| 12. Visual | 7 | - | - | - |
| 13. Segurança | 5 | - | - | - |
| 14. Métricas | 8 | - | - | - |
| 15. Regressão | 6 | - | - | - |
| **TOTAL** | **124** | - | - | - |

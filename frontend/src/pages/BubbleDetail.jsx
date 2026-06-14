// ============================================================
// BOLHA 🫧 - Camara de Pensamento
// Rota: /bubble/:id
//
// CONCEITO VISUAL:
//   Nao eh uma "pagina de post". Eh uma CAMARA.
//   Voce esta DENTRO da bolha. O pensamento eh o centro.
//   Ao redor: ecos de quem soprou, ramificacoes, criar nova.
//
//   Parece um cerebro/mente expandindo ideias.
//   Tudo eh organico, pulsante, vivo.
//
//   Estrutura:
//   ┌─ Cabecalho flutuante ──────────────────────────────┐
//   │  ← Voltar     🫧 2     ⚡ VAZOU     🗑️            │
//   ├─ O Pensamento (centro, grande) ────────────────────┤
//   │                                                     │
//   │           💭 "TITULO"                               │
//   │           #assunto                                  │
//   │           "conteudo em destaque"                    │
//   │           @autor                                    │
//   │           ████████████░░ 65%                        │
//   │           ⏳ 23h restante                           │
//   │                                                     │
//   ├─ Orbe de acoes (flutuando ao redor) ───────────────┤
//   │     ❤️ Curtir     🫧 Pensar     💬 Comentar        │
//   │                                                     │
//   ├─ Ecos (vozes de quem pensa igual) ──────────────────┤
//   │     💭 "Concordo" - @maria                          │
//   │     💭 "Faz sentido" - @pedro                       │
//   │                                                     │
//   ├─ Ramificacoes (novas bolhas daqui) ─────────────────┤
//   │     🫧 Titulo da ramificacao       →               │
//   │     🫧 Outra ideia                 →               │
//   │                                                     │
//   └─ Criar nova ramificacao ────────────────────────────┘
//        [O que isso faz voce pensar?....................]
//        [🫧 Criar ramificacao]
// ============================================================

import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { TimeContext } from "../contexts/TimeContext";
import BubbleHUD from "../components/BubbleHUD";
import { useToast } from "../contexts/ToastContext";
import { useBubbleEvents } from "../hooks/useBubbleEvents";
import api from "../services/api";

const CORES_RAMO = [
  { from: "from-cyan-500/20", to: "to-blue-600/20", border: "border-cyan-500/25", bolha: "from-cyan-400/30 to-blue-500/30" },
  { from: "from-lime-500/20", to: "to-emerald-600/20", border: "border-lime-500/25", bolha: "from-lime-400/30 to-emerald-500/30" },
  { from: "from-purple-500/20", to: "to-pink-600/20", border: "border-purple-500/25", bolha: "from-purple-400/30 to-pink-500/30" },
  { from: "from-amber-500/20", to: "to-orange-600/20", border: "border-amber-500/25", bolha: "from-amber-400/30 to-orange-500/30" },
  { from: "from-rose-500/20", to: "to-red-600/20", border: "border-rose-500/25", bolha: "from-rose-400/30 to-red-500/30" },
  { from: "from-teal-500/20", to: "to-cyan-600/20", border: "border-teal-500/25", bolha: "from-teal-400/30 to-cyan-500/30" },
  { from: "from-indigo-500/20", to: "to-violet-600/20", border: "border-indigo-500/25", bolha: "from-indigo-400/30 to-violet-500/30" },
];

export default function BubbleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { timeNow } = useContext(TimeContext);

  const [bolha, setBolha] = useState(null);
  const [filhas, setFilhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState({ texto: "", tipo: "" });
  const [comentario, setComentario] = useState("");
  const [comentEnviando, setComentEnviando] = useState(false);
  const [novoPensamento, setNovoPensamento] = useState("");
  const [criando, setCriando] = useState(false);
  const [mostrarComents, setMostrarComents] = useState(false);
  const [animSopro, setAnimSopro] = useState(false);
  const toast = useToast();

  // ============================================================
  // CARREGAR BOLHA
  // ============================================================
  useEffect(() => {
    let cancel = false;
    async function carregar() {
      setCarregando(true);
      try {
        const res = await api.get(`/bubbles/${id}`);
        if (!cancel) {
          setBolha(res.data.bubble);
          setFilhas(res.data.childBubbles || []);
        }
      } catch {
        if (!cancel) {
          setErro("Bolha nao encontrada");
          setMsg({ texto: "Essa bolha estourou ou nao existe", tipo: "erro" });
        }
      } finally {
        if (!cancel) setCarregando(false);
      }
    }
    carregar();
    return () => { cancel = true; };
  }, [id]);

  // ============================================================
  // SOCKET: EVENTOS EM TEMPO REAL (substitui polling)
  // ============================================================
  const handleBubbleUpdated = useCallback((data) => {
    setBolha((prev) => {
      if (!prev || prev._id !== data.bubbleId) return prev;
      return {
        ...prev,
        likes: data.likesCount !== undefined
          ? Array.from({ length: data.likesCount }, (_, i) => prev.likes?.[i] || `placeholder_${i}`)
          : prev.likes,
        sopros: data.soprosCount !== undefined
          ? Array.from({ length: data.soprosCount }, (_, i) => prev.sopros?.[i] || `placeholder_${i}`)
          : prev.sopros,
        expiresAt: data.expiresAt || prev.expiresAt,
        hasLeaked: data.hasLeaked ?? prev.hasLeaked,
        commentsCount: data.commentsCount ?? prev.comments?.length,
      };
    });
  }, []);

  const handleBubblePopped = useCallback((data) => {
    if (data.bubbleId === id) {
      mostrarMsg("💥 Alguém estourou esta bolha!", "info");
    }
  }, [id]);

  const handleBubbleDeleted = useCallback((data) => {
    if (data.bubbleId === id) {
      mostrarMsg("🗑️ Esta bolha foi excluída pelo autor", "erro");
      setTimeout(() => navigate("/feed"), 2000);
    }
  }, [id, navigate]);

  const handleNewChildBubble = useCallback((child) => {
    setFilhas((prev) => {
      if (prev.some((b) => b._id === child._id)) return prev;
      return [child, ...prev];
    });
  }, []);

  // Registra listeners de tempo real para esta bolha
  useBubbleEvents(id, {
    onBubbleUpdated: handleBubbleUpdated,
    onBubblePopped: handleBubblePopped,
    onBubbleDeleted: handleBubbleDeleted,
    onNewChildBubble: handleNewChildBubble,
  });

  // Recarrega dados completos do servidor (usado apenas em ações do usuário)
  const recarregar = async () => {
    try {
      const res = await api.get(`/bubbles/${id}`);
      setBolha(res.data.bubble);
      setFilhas(res.data.childBubbles || []);
    } catch {
      // Erro silenciado — bolha pode ter expirado entre o clique e a requisição
    }
  };

  const mostrarMsg = (texto, tipo = "info") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "" }), 3000);
  };

  // ============================================================
  // CALCULOS
  // ============================================================
  if (carregando) {
    return (
      <BubbleHUD>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          {/* Animacao de entrada na bolha */}
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-cyan-400/5 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-4 rounded-full border border-cyan-400/20 animate-spin" style={{ animationDuration: "5s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">🫧</div>
          </div>
          <p className="text-xs text-slate-500 animate-pulse">Entrando na camara...</p>
        </div>
      </BubbleHUD>
    );
  }

  if (erro || !bolha) {
    return (
      <BubbleHUD>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="text-6xl animate-float">🌪️</span>
          <p className="text-sm text-slate-500">{erro || "Bolha estourou"}</p>
          <button
            onClick={() => navigate("/feed")}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            ← Voltar para o mapa
          </button>
        </div>
      </BubbleHUD>
    );
  }

  const likes = bolha?.likes?.length || 0;
  const sopros = bolha?.sopros?.length || 0;
  const conexoes = likes + sopros;
  const tempoRestante = bolha?.expiresAt ? new Date(bolha.expiresAt).getTime() - timeNow : 0;
  const totalMs = bolha?.expiresAt && bolha?.createdAt ? new Date(bolha.expiresAt).getTime() - new Date(bolha.createdAt).getTime() : 0;
  const vidaPct = totalMs > 0 ? Math.max(0, tempoRestante / totalMs) : 0;
  const ehAutor = bolha ? String(bolha.author?._id || bolha.author) === String(user?._id || user?.id) : false;
  const jaCurtiu = bolha?.likes?.includes(user?._id || user?.id) ?? false;
  const jaSoprou = bolha?.sopros?.includes(user?._id || user?.id) ?? false;

  // ============================================================
  // ACOES (COM OPTIONAL CHAINING PARA SEGURANCA)
  // ============================================================
  const handleCurtir = async () => {
    if (!bolha?._id) return; // CORRECAO: Protecao contra objeto indefinido
    try {
      await api.patch(`/bubbles/${bolha._id}/like`);
      await recarregar();
      mostrarMsg(jaCurtiu ? "💔 Like removido" : "❤️ Curtiu! +10 min de vida", "sucesso");
    } catch (err) {
      mostrarMsg(err.response?.data?.message || "Erro", "erro");
    }
  };

  const handleSopro = async () => {
    if (!bolha?._id) return; // CORRECAO: Protecao contra objeto indefinido
    setAnimSopro(true);
    setTimeout(() => setAnimSopro(false), 600);
    try {
      const res = await api.post(`/bubbles/${bolha._id}/sopro`);
      await recarregar();
      mostrarMsg(`🫧 ${res.data.message || "Soprou! +120 min"}`, "sucesso");
    } catch (err) {
      mostrarMsg(err.response?.data?.message || "Erro ao soprar", "erro");
    }
  };

  const handleComentario = async (e) => {
    e.preventDefault();
    if (!comentario.trim() || !bolha?._id) return; // CORRECAO: Protecao contra objeto indefinido
    setComentEnviando(true);
    try {
      const res = await api.post(`/bubbles/${id}/comment`, { text: comentario.trim() });
      await recarregar();
      setComentario("");
      mostrarMsg(`💬 ${res.data.message || "Comentario +30min"}`, "sucesso");
    } catch (err) {
      mostrarMsg(err.response?.data?.message || "Erro ao comentar", "erro");
    } finally {
      setComentEnviando(false);
    }
  };

  const handleCriarRamificacao = async (e) => {
    e.preventDefault();
    if (!novoPensamento.trim()) return;
    setCriando(true);
    try {
      const res = await api.post("/bubbles", {
        title: "Ramificacao",
        content: novoPensamento.trim(),
        parentBubble: id,
      });
      setFilhas((prev) => [res.data.bubble, ...prev]);
      setNovoPensamento("");
      mostrarMsg("🌱 Nova ramificacao criada!", "sucesso");
    } catch (err) {
      mostrarMsg(err.response?.data?.message || "Erro ao criar", "erro");
    } finally {
      setCriando(false);
    }
  };

  return (
    <BubbleHUD>
      {/* Efeito de fundo - como se estivesse dentro da bolha */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-lime-500/4 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-400/3 rounded-full blur-[200px] animate-pulse" style={{ animationDuration: "8s" }} />
      </div>

      <div className="relative space-y-4">

        {/* ===== MENSAGEM FLUTUANTE ===== */}
        {msg.texto && (
          <div className={`rounded-full px-5 py-2.5 text-xs font-bold text-center backdrop-blur-xl shadow-lg ${
            msg.tipo === "erro"
              ? "bg-rose-500/20 border border-rose-400/30 text-rose-300 shadow-rose-500/10"
              : msg.tipo === "sucesso"
              ? "bg-lime-500/20 border border-lime-400/30 text-lime-300 shadow-lime-500/10"
              : "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 shadow-cyan-500/10"
          }`}>
            {msg.texto}
          </div>
        )}

        {/* ===== CABECALHO FLUTUANTE ===== */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => navigate("/feed")}
            className="h-8 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 px-3 text-[10px] text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5 group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Conexoes como orbe */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/5">
              <span className="text-[10px]">🫧</span>
              <span className="text-[9px] text-slate-400 font-mono">{conexoes}</span>
            </div>

            {bolha.hasLeaked && (
              <span className="text-[8px] font-black text-black bg-gradient-to-r from-lime-400 to-emerald-400 px-2.5 py-1 rounded-full tracking-wider shadow-lg shadow-lime-500/30 animate-pulse">
                ⚡ VAZOU
              </span>
            )}

            {ehAutor && (
              <button
                onClick={async () => {
                  if (!bolha?._id) return; // CORRECAO: Protecao contra objeto indefinido
                  if (!window.confirm("Tem certeza que deseja excluir esta bolha? Esta ação não pode ser desfeita.")) return;
                  try {
                    await api.delete(`/bubbles/${bolha._id}`);
                    navigate("/feed");
                  } catch {
                    mostrarMsg("Erro ao excluir", "erro");
                  }
                }}
                className="h-8 px-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] text-rose-400/60 hover:text-rose-400 hover:border-rose-400/30 transition-all"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* ===== CAMARA DO PENSAMENTO ===== */}
        <div className="rounded-3xl bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-950/60 border border-white/5 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-cyan-500/5">

          {/* CONTEUDO CENTRAL - O PENSAMENTO */}
          <div className="px-6 py-8 text-center">
            {/* Orbe decorativo */}
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/20 to-lime-400/20 border border-cyan-400/20 flex items-center justify-center shadow-xl shadow-cyan-500/10">
              <span className="text-2xl">💭</span>
            </div>

            {/* Titulo - GRANDE, CENTRAL, NEGRITO */}
            <h1 className="text-2xl font-black text-white leading-tight tracking-tight max-w-lg mx-auto">
              {bolha?.title || "..."}
            </h1>

            {/* Tag assunto */}
            {bolha?.subject && bolha.subject !== "Geral" && (
              <div className="mt-3">
                <span className="inline-block text-[9px] font-bold text-cyan-400/40 bg-cyan-500/8 px-3 py-1 rounded-full border border-cyan-500/15 uppercase tracking-widest">
                  # {bolha.subject.replace(/\s+/g, "").toLowerCase()}
                </span>
              </div>
            )}

            {/* Conteudo - DESTAQUE */}
            {bolha?.content && (
              <div className="mt-6 mx-auto max-w-md">
                <div className="relative">
                  <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/40 via-lime-400/20 to-transparent rounded-full" />
                  <p className="text-sm text-slate-300/80 leading-relaxed italic font-light">
                    "{bolha.content}"
                  </p>
                </div>
              </div>
            )}

            {/* Autor */}
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400/40 to-lime-400/40 flex items-center justify-center text-[7px] font-bold text-white/60">
                  {(bolha.author?.username || "A").charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] text-slate-400">
                  @{bolha.author?.username || "anonimo"}
                </span>
              </div>
            </div>

            {/* Tempo de vida */}
            <div className="mt-4">
              <span className={`text-[10px] ${tempoRestante < 3600000 ? "text-orange-400/70" : "text-slate-500"}`}>
                ⏳ {tempoRestante > 0
                  ? `${Math.floor(tempoRestante / 3600000)}h ${Math.floor((tempoRestante % 3600000) / 60000)}m restante`
                  : "Expirada"}
              </span>
            </div>

            {/* Barra de vida - ORGANICA */}
            {tempoRestante > 0 && (
              <div className="mt-4 mx-auto max-w-xs">
                <div className="relative h-1.5 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      vidaPct < 0.15 ? "bg-gradient-to-r from-rose-400 to-orange-400" : vidaPct < 0.35 ? "bg-gradient-to-r from-orange-400 to-amber-400" : "bg-gradient-to-r from-slate-400 to-slate-500"
                    }`}
                    style={{ width: `${Math.max(3, vidaPct * 100)}%` }}
                  />
                  {/* Brilho na barra */}
                  <div
                    className="absolute top-0 bottom-0 w-6 bg-white/10 blur-sm rounded-full"
                    style={{
                      left: `${Math.max(3, vidaPct * 100)}%`,
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                  />
                </div>
                <span className={`text-[8px] font-mono mt-1 inline-block ${vidaPct < 0.35 ? "text-orange-400/70" : "text-slate-600"}`}>
                  {Math.round(vidaPct * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* ORBE DE ACOES - flutuando */}
          <div className="px-4 py-4 border-t border-white/5">
            <div className="flex items-center justify-center gap-3">
              {/* Curtir */}
              <button
                onClick={handleCurtir}
                className={`h-10 rounded-full border px-4 text-[10px] font-bold transition-all flex items-center gap-2 ${
                  jaCurtiu
                    ? "bg-cyan-500/15 border-cyan-400/25 text-cyan-300 shadow-lg shadow-cyan-500/10"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                } active:scale-90`}
              >
                <span className={`text-sm ${jaCurtiu ? "" : "opacity-50"}`}>❤️</span>
                <span>{likes}</span>
              </button>

              {/* Sopro / Pensar */}
              <button
                onClick={handleSopro}
                className={`h-10 rounded-full border px-4 text-[10px] font-bold transition-all flex items-center gap-2 ${
                  jaSoprou
                    ? "bg-lime-500/15 border-lime-400/25 text-lime-300 shadow-lg shadow-lime-500/10"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                } active:scale-90 ${animSopro ? "scale-110 shadow-lg shadow-lime-500/30" : ""}`}
              >
                <span className={`text-sm ${animSopro ? "animate-bounce" : jaSoprou ? "" : "opacity-50"}`}>🫧</span>
                <span className="hidden sm:inline">{sopros} penso assim</span>
                <span className="sm:hidden">{sopros}</span>
              </button>

              {/* Comentarios */}
              <button
                onClick={() => setMostrarComents(!mostrarComents)}
                className={`h-10 rounded-full border px-4 text-[10px] font-bold transition-all flex items-center gap-2 ${
                  mostrarComents
                    ? "bg-purple-500/15 border-purple-400/25 text-purple-300 shadow-lg shadow-purple-500/10"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span className={`text-sm ${mostrarComents ? "" : "opacity-50"}`}>💬</span>
                <span>{bolha.comments?.length || 0}</span>
              </button>
            </div>

            {/* Input comentario */}
            <form onSubmit={handleComentario} className="mt-3 flex gap-2">
              <input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Seu comentario (+30min de vida)..."
                className="flex-1 h-10 rounded-full bg-black/40 border border-white/10 px-4 text-[10px] text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/15 transition-all"
              />
              <button
                type="submit"
                disabled={!comentario.trim() || comentEnviando}
                className="h-10 px-5 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 text-black text-[10px] font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 flex items-center gap-1"
              >
                {comentEnviando ? "..." : "💬"}
              </button>
            </form>
          </div>

          {/* COMENTARIOS */}
          {mostrarComents && bolha.comments && bolha.comments.length > 0 && (
            <div className="border-t border-white/5 px-4 py-4 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold text-purple-400/50 uppercase tracking-wider">💬 Fios</span>
                <div className="h-px flex-1 bg-gradient-to-r from-purple-400/10 to-transparent" />
              </div>
              {bolha.comments.map((c, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-lime-500/30 flex items-center justify-center text-[8px] font-bold text-white/60 flex-shrink-0">
                    {(c.username || c.author?.username || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-cyan-300/60">
                        @{c.username || c.author?.username || "anonimo"}
                      </span>
                      {c.createdAt && (
                        <span className="text-[7px] text-slate-600">
                          {new Date(c.createdAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== ECOS = QUEM PENSA IGUAL ===== */}
        {sopros > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 border border-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] font-bold text-lime-400/50 uppercase tracking-wider">💭 Ecos</span>
              <div className="h-px flex-1 bg-gradient-to-r from-lime-400/10 to-transparent" />
              <span className="text-[8px] text-slate-600">{sopros} eco{sopros !== 1 ? "s" : ""}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Contador */}
              <div className="rounded-full bg-gradient-to-br from-lime-500/15 to-emerald-500/15 border border-lime-400/20 px-4 py-2">
                <span className="text-[10px] text-lime-300/70 font-bold">🫧 {sopros} pessoa{sopros !== 1 ? "s" : ""} pensam assim</span>
              </div>
              {/* Comentadores */}
              {bolha.comments && bolha.comments.slice(0, 5).map((c, i) => (
                <div key={i} className="rounded-full bg-white/5 border border-white/10 px-3 py-2">
                  <span className="text-[8px] text-slate-500">@</span>
                  <span className="text-[9px] text-slate-400">{c.username || c.author?.username || "alguem"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== RAMIFICACOES ===== */}
        {filhas.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/40 to-slate-950/40 border border-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] font-bold text-cyan-400/50 uppercase tracking-wider">🌱 Ramificacoes</span>
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/10 to-transparent" />
              <span className="text-[8px] text-slate-600">{filhas.length} ramo{filhas.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-2">
              {filhas.map((child, i) => {
                const cConex = (child.likes?.length || 0) + (child.sopros?.length || 0);
                const cor = CORES_RAMO[i % CORES_RAMO.length];
                return (
                  <button
                    key={child._id}
                    onClick={() => navigate(`/bubble/${child._id}`)}
                    className="w-full text-left rounded-2xl bg-gradient-to-br ${cor.from} ${cor.to} border ${cor.border} p-4 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cor.bolha} flex items-center justify-center text-sm flex-shrink-0 shadow-lg`}>
                        🫧
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white/80 truncate group-hover:text-white transition-colors">
                          {child.title || "Pensamento"}
                        </p>
                        <p className="text-[8px] text-slate-500 mt-0.5">
                          {cConex} conex · @{child.author?.username || "anonimo"}
                        </p>
                      </div>
                      <span className="text-slate-500 text-xs opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== CRIAR RAMIFICACAO ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-cyan-400/10 backdrop-blur-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xl mt-0.5">🌱</span>
            <div>
              <h3 className="text-sm font-bold text-white">Criar ramificacao</h3>
              <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">
                Seu pensamento vira uma nova bolha, ligada a esta. Como um galho que cresce de uma arvore.
              </p>
            </div>
          </div>

          <form onSubmit={handleCriarRamificacao} className="space-y-3">
            <textarea
              value={novoPensamento}
              onChange={(e) => setNovoPensamento(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="O que isso faz voce pensar?"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/15 resize-none transition-all"
            />
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-slate-600">{novoPensamento.length}/300</span>
              <button
                type="submit"
                disabled={!novoPensamento.trim() || criando}
                className="h-10 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 text-black px-6 text-[10px] font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 flex items-center gap-1.5"
              >
                {criando ? "🫧..." : "🫧 Criar ramificacao"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </BubbleHUD>
  );
}

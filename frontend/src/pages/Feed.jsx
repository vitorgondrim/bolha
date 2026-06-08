// ============================================================
// FEED - Mapa de pensamentos
// Rota: /feed
// Usa BubbleHUD para navegacao estilo bolha.
// Mapa ocupa tela inteira (isFeed=true no HUD).
// ============================================================

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { TimeContext } from "../context/TimeContext";
import BubbleHUD from "../components/BubbleHUD";
import BubbleMap from "../components/BubbleMap";
import api from "../services/api";

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { timeNow } = useContext(TimeContext);

  const [bubbles, setBubbles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarPainel, setMostrarPainel] = useState(false);

  const fetchBubbles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/bubbles");
      setBubbles(res.data.bubbles || []);
    } catch (err) {
      console.error("Erro ao carregar bolhas:", err);
      setError("Nao foi possivel carregar as bolhas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBubbles();
  }, [fetchBubbles]);

  const handleBubbleClick = useCallback(
    (bubbleId) => {
      navigate(`/bubble/${bubbleId}`);
    },
    [navigate]
  );

  const minhasBolhas = useMemo(() => {
    return bubbles
      .filter((b) => b.author?._id === user?._id || b.author === user?._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bubbles, user]);

  const formatTempo = (ms) => {
    if (ms <= 0) return "Expirou";
    const horas = Math.floor(ms / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
  };

  return (
    <BubbleHUD>
      {/* MAPA TELA INTEIRA */}
      {bubbles.length > 0 ? (
        <BubbleMap bubbles={bubbles} onBubbleClick={handleBubbleClick} />
      ) : !loading && !error ? (
        <div className="fixed inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bubble-pulse">🫧</div>
            <h2 className="text-2xl font-black text-white mb-2">Nenhum pensamento ainda</h2>
            <p className="text-slate-500 text-sm mb-8">Seja o primeiro a soprar uma ideia na rede</p>
            <button
              onClick={() => navigate("/create")}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 text-black font-bold text-base hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
            >
              🫧 Criar primeiro pensamento
            </button>
          </div>
        </div>
      ) : null}

      {/* ============================================================
          📋 PAINEL MINHAS BOLHAS (so no feed)
          ============================================================ */}
      {minhasBolhas.length > 0 && (
        <button
          onClick={() => setMostrarPainel(!mostrarPainel)}
          className="fixed left-4 bottom-20 z-30 pointer-events-auto w-11 h-11 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/25 shadow-lg shadow-cyan-500/15 backdrop-blur-md flex items-center justify-center text-slate-300 hover:border-cyan-400/40 hover:text-white transition-all"
          title="Minhas bolhas"
        >
          <span className="text-sm">📋</span>
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-lime-500 text-black text-[8px] font-bold flex items-center justify-center shadow-lg">
            {minhasBolhas.length}
          </span>
        </button>
      )}

      {mostrarPainel && minhasBolhas.length > 0 && (
        <div className="fixed left-4 bottom-28 z-30 w-56 max-h-72 overflow-y-auto pointer-events-auto">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-cyan-400/20 shadow-xl shadow-cyan-500/10 backdrop-blur-xl p-3">
            <h3 className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-wider px-2 mb-2">
              Minhas bolhas
            </h3>
            {minhasBolhas.map((bubble) => {
              const tempoRestante = new Date(bubble.expiresAt).getTime() - timeNow;
              const conexoes = (bubble.likes?.length || 0) + (bubble.sopros?.length || 0);
              const expirou = tempoRestante <= 0;

              return (
                <button
                  key={bubble._id}
                  onClick={() => handleBubbleClick(bubble._id)}
                  className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${
                      expirou ? "bg-slate-600" : conexoes > 5 ? "bg-lime-400 shadow-lime-400/50" : conexoes > 0 ? "bg-cyan-400 shadow-cyan-400/50" : "bg-orange-400 shadow-orange-400/50"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white truncate">{bubble.title || "..."}</p>
                      <p className="text-[8px] text-slate-500">
                        {conexoes} conex{conexoes !== 1 ? "oes" : "ao"}
                        {!expirou && ` · ${formatTempo(tempoRestante)}`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </BubbleHUD>
  );
}

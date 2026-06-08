// ============================================================
// PAGINA: VAZADAS
// Rota: /leaked
//
// Bolhas que viralizaram (hasLeaked = true).
// Lista com destaque especial.
// ============================================================

import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TimeContext } from "../context/TimeContext";
import BubbleHUD from "../components/BubbleHUD";
import api from "../services/api";

export default function Leaked() {
  const navigate = useNavigate();
  const { timeNow } = useContext(TimeContext);
  const [bubbles, setBubbles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/bubbles");
      const todas = res.data.bubbles || [];
      setBubbles(todas.filter((b) => b.hasLeaked));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaked();
  }, [fetchLeaked]);

  const formatTempo = (ms) => {
    if (ms <= 0) return "Expirou";
    const horas = Math.floor(ms / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
  };

  return (
    <BubbleHUD>
      <div className="space-y-4">
        {/* Cabecalho */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 border border-lime-400/30 flex items-center justify-center shadow-lg shadow-lime-500/10">
            <span className="text-base">⚡</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-black tracking-tight">Vazadas</h1>
            <p className="text-slate-500 text-[10px]">Bolhas que viralizaram</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
            </div>
          </div>
        )}

        {!loading && bubbles.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🫧</p>
            <p className="text-slate-400 text-sm">Nenhuma bolha vazou ainda</p>
            <p className="text-slate-600 text-xs mt-1">Quando uma bolha viralizar, aparece aqui</p>
          </div>
        )}

        {!loading && bubbles.length > 0 && (
          <div className="space-y-3">
            {bubbles.map((bubble) => {
              const tempoRestante = new Date(bubble.expiresAt).getTime() - timeNow;
              const conexoes = (bubble.likes?.length || 0) + (bubble.sopros?.length || 0);
              const score = conexoes + (bubble.comments?.length || 0) * 3;

              return (
                <button
                  key={bubble._id}
                  onClick={() => navigate(`/bubble/${bubble._id}`)}
                  className="bubble-card-leaked rounded-2xl p-4 w-full text-left hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 border border-lime-400/30 flex items-center justify-center text-sm flex-shrink-0">
                      ⚡
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{bubble.title || "..."}</h3>
                        <span className="text-[8px] font-bold text-black bg-lime-500 px-1.5 py-0.5 rounded-full">Vazou</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                        <span> by {bubble.author?.username || "anonimo"}</span>
                        <span> Score: {score}</span>
                        {tempoRestante > 0 && (
                          <span className="text-lime-400/70">{formatTempo(tempoRestante)}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-slate-600 text-sm mt-1">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BubbleHUD>
  );
}

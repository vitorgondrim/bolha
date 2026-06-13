// ============================================================
// FEED - Mapa de pensamentos
// Rota: /feed
// Usa BubbleHUD para navegacao estilo bolha.
// Mapa ocupa tela inteira (isFeed=true no HUD).
// ============================================================

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../contexts/AuthContext";
import { TimeContext } from "../contexts/TimeContext";
import { useToast } from "../contexts/ToastContext";
import BubbleHUD from "../components/BubbleHUD";
import BubbleMap from "../components/BubbleMap";
import api from "../services/api";

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { timeNow } = useContext(TimeContext);
  const toast = useToast();

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
      toast.error("Não foi possível carregar as bolhas.");
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
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-base hover:shadow-lg hover:shadow-[#7c3aed]/30 transition-all"
            >
              🫧 Criar primeiro pensamento
            </button>
          </div>
        </div>
      ) : null}

      {/* ============================================================
          📋 DRAWER LATERAL DIREITO — MINHAS BOLHAS
          ============================================================ */}
      {minhasBolhas.length > 0 && (
        <>
          {/* FAB — Botão flutuante para abrir/fechar o drawer */}
          <button
            onClick={() => setMostrarPainel(!mostrarPainel)}
            className={`fixed right-4 bottom-20 z-30 pointer-events-auto w-11 h-11 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center transition-all duration-300 ${
              mostrarPainel
                ? 'bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white shadow-[#7c3aed]/30'
                : 'bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-[#7c3aed]/25 text-slate-300 hover:border-[#3b82f6]/40 hover:text-white'
            }`}
            title="Minhas bolhas"
          >
            <span className="text-sm">{mostrarPainel ? '✕' : '📋'}</span>
            {!mostrarPainel && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white text-[8px] font-bold flex items-center justify-center shadow-lg">
                {minhasBolhas.length}
              </span>
            )}
          </button>

          {/* Drawer animado com Framer Motion — slide-in da direita */}
          <AnimatePresence>
            {mostrarPainel && (
              <motion.div
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-4 bottom-32 z-30 w-64 max-h-[65vh] overflow-y-auto pointer-events-auto"
              >
                <div className="rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-[#7c3aed]/20 shadow-xl shadow-[#7c3aed]/10 backdrop-blur-xl p-4">
                  {/* Cabeçalho do drawer */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
                    <h3 className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider">
                      Minhas bolhas
                    </h3>
                    <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                      {minhasBolhas.length}
                    </span>
                  </div>

                  {/* Lista de bolhas com animação de entrada em stagger */}
                  {minhasBolhas.map((bubble, index) => {
                    const tempoRestante = new Date(bubble.expiresAt).getTime() - timeNow;
                    const conexoes = (bubble.likes?.length || 0) + (bubble.sopros?.length || 0);
                    const expirou = tempoRestante <= 0;

                    return (
                      <motion.button
                        key={bubble._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.25 }}
                        onClick={() => {
                          setMostrarPainel(false);
                          handleBubbleClick(bubble._id);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Indicador de status (bolinha colorida) */}
                          <div className={`relative w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm transition-transform group-hover:scale-125 ${
                            expirou
                              ? 'bg-slate-600'
                              : conexoes > 5
                                ? 'bg-[#7c3aed] shadow-[#7c3aed]/50'
                                : conexoes > 0
                                  ? 'bg-[#3b82f6] shadow-[#3b82f6]/50'
                                  : 'bg-orange-400 shadow-orange-400/50'
                          }`}>
                            {conexoes > 0 && !expirou && (
                              <span className="absolute inset-0 rounded-full animate-ping opacity-30"
                                style={{ backgroundColor: conexoes > 5 ? '#7c3aed' : '#3b82f6' }}
                              />
                            )}
                          </div>

                          {/* Informações da bolha */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-white truncate group-hover:text-[#a78bfa] transition-colors">
                              {bubble.title || "..."}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-slate-500">
                                {conexoes} {conexoes === 1 ? 'conexão' : 'conexões'}
                              </span>
                              {!expirou && (
                                <>
                                  <span className="text-[6px] text-slate-700">•</span>
                                  <span className="text-[9px] text-slate-500">{formatTempo(tempoRestante)}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Seta indicativa */}
                          <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </BubbleHUD>
  );
}

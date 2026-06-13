// ============================================================
// PÁGINA: TRENDING (BOLHAS BOMBANDO)
// Rota: /trending
//
// Exibe um ranking das bolhas mais engajadas do momento.
//
// Funcionalidades:
//   - Pódio visual (top 3 em destaque)
//   - Ranking completo com barra de progresso
//   - Score calculado: likes + comentários×3 + sopros×4 - dislikes×2
//   - Badge "VAZOU" para bolhas com 12+ pontos
//   - Badge "PRESTES A VAZAR" para bolhas com 10-11 pontos
//   - Filtros de tempo (placeholder: Hora, Hoje, Semana)
//   - Atualização automática a cada 60 segundos
//   - Combina bolhas do feed geral + vazadas (sem duplicatas)
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BubbleHUD from '../components/BubbleHUD';
import api from '../services/api';

// ============================================================
// CONSTANTES
// ============================================================
const TIME_FRAMES = [
  { id: 'hour', label: '🔥 Hora' },
  { id: 'day', label: '📅 Hoje' },
  { id: 'week', label: '📆 Semana' },
];

const REFRESH_INTERVAL = 60000; // 60 segundos

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Trending() {
  const navigate = useNavigate();

  // ============================================================
  // ESTADO
  // ============================================================
  const [bubbles, setBubbles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('day');

  // ============================================================
  // CÁLCULO DE SCORE
  // ============================================================
  const calculateScore = useCallback((bubble) => {
    const likes = bubble.likes?.length || 0;
    const dislikes = bubble.dislikes?.length || 0;
    const comments = bubble.comments?.length || 0;
    const sopros = bubble.sopros?.length || 0;
    return likes + comments * 3 + sopros * 4 - dislikes * 2;
  }, []);

  // ============================================================
  // BUSCAR BOLHAS E MONTAR RANKING
  // Combina feed geral + vazadas, remove duplicatas,
  // calcula score e ordena do maior para o menor.
  // ============================================================
  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      // Busca as duas fontes em paralelo
      const [leakedRes, allRes] = await Promise.all([
        api.get('/bubbles/leaked?limit=20'),
        api.get('/bubbles?limit=50'),
      ]);

      // Combina e remove duplicatas (por _id)
      let allBubbles = [
        ...(leakedRes.data.leaks || []),
        ...(allRes.data.bubbles || []),
      ];
      const unique = new Map();
      allBubbles.forEach((b) => unique.set(b._id, b));
      allBubbles = Array.from(unique.values());

      // Calcula score e ordena
      const withScore = allBubbles.map((b) => ({
        ...b,
        score: calculateScore(b),
        isLeaked: b.hasLeaked || false,
      }));

      withScore.sort((a, b) => b.score - a.score);
      setBubbles(withScore.slice(0, 15));
    } catch (err) {
      // Erro silenciado — tratado pelo estado bubblesError
    } finally {
      setLoading(false);
    }
  }, [calculateScore]);

  // ============================================================
  // CARREGAR DADOS + ATUALIZAÇÃO AUTOMÁTICA
  // ============================================================
  useEffect(() => {
    fetchTrending();
    const interval = setInterval(() => fetchTrending(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  // ============================================================
  // ESTILO DO RANK (TOP 3 COM DESTAQUE)
  // ============================================================
  const getRankStyle = (index) => {
    if (index === 0) {
      return {
        bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10',
        border: 'border-yellow-500/50',
        rankBg: 'bg-yellow-500',
        rankText: 'text-yellow-400',
        icon: '👑',
      };
    }
    if (index === 1) {
      return {
        bg: 'bg-gradient-to-r from-gray-400/20 to-gray-500/10',
        border: 'border-gray-400/50',
        rankBg: 'bg-gray-400',
        rankText: 'text-gray-300',
        icon: '🥈',
      };
    }
    if (index === 2) {
      return {
        bg: 'bg-gradient-to-r from-amber-700/20 to-amber-800/10',
        border: 'border-amber-600/50',
        rankBg: 'bg-amber-600',
        rankText: 'text-amber-400',
        icon: '🥉',
      };
    }
    return {
      bg: 'bg-slate-900/40',
      border: 'border-slate-800/50',
      rankBg: 'bg-slate-700',
      rankText: 'text-slate-400',
      icon: `${index + 1}º`,
    };
  };

  // ============================================================
  // COR DA BARRA DE PROGRESSO
  // ============================================================
  const getProgressColor = (score) => {
    if (score >= 12) return 'bg-gradient-to-r from-lime-400 to-cyan-400';
    if (score >= 8) return 'bg-gradient-to-r from-orange-400 to-amber-400';
    if (score >= 4) return 'bg-gradient-to-r from-cyan-400 to-blue-400';
    return 'bg-gradient-to-r from-slate-500 to-slate-600';
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <BubbleHUD>
      <div className="space-y-6">
        {/* ============================================================
            CABEÇALHO COM PÓDIO VISUAL
            ============================================================ */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-800/80 p-6 backdrop-blur-md">
          {/* Luzes decorativas */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-lime-500/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Título */}
            <div>
              <div className="flex items-center gap-3">
                <div className="text-5xl animate-pulse">🔥</div>
                <div>
                  <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                    Bolhas Bombando
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    As mais quentes do momento
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros de tempo (placeholder visual) */}
            <div className="flex gap-2 bg-slate-900/50 rounded-full p-1 border border-slate-800/50">
              {TIME_FRAMES.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeFrame(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    timeFrame === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-lime-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================
              MINI PÓDIO (TOP 3)
              Destaque visual para os 3 primeiros colocados.
              ============================================================ */}
          {!loading && bubbles.length >= 3 && (
            <div className="mt-8 flex justify-center items-end gap-4">
              {/* 2º lugar (esquerda) */}
              <div className="text-center order-1">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gray-400/20 to-gray-500/10 border-2 border-gray-400/50 flex items-center justify-center text-2xl">
                  {bubbles[1]?.title?.charAt(0) || '🥈'}
                </div>
                <div className="mt-2 text-xs text-gray-300">2º</div>
                <div className="text-[10px] text-gray-400 max-w-20 truncate">
                  @{bubbles[1]?.author?.username}
                </div>
              </div>

              {/* 1º lugar (centro, maior) */}
              <div className="text-center order-0 sm:order-2 transform scale-110">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-500/30 to-amber-500/20 border-2 border-yellow-500 shadow-lg shadow-yellow-500/20 flex items-center justify-center text-3xl animate-pulse">
                  👑
                </div>
                <div className="mt-2 text-sm font-bold text-yellow-400">1º</div>
                <div className="text-xs text-yellow-400/80 max-w-[90px] truncate font-medium">
                  @{bubbles[0]?.author?.username}
                </div>
              </div>

              {/* 3º lugar (direita) */}
              <div className="text-center order-2 sm:order-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-700/20 to-amber-800/10 border border-amber-600/50 flex items-center justify-center text-xl">
                  {bubbles[2]?.title?.charAt(0) || '🥉'}
                </div>
                <div className="mt-2 text-xs text-amber-400">3º</div>
                <div className="text-[10px] text-amber-400/70 max-w-[70px] truncate">
                  @{bubbles[2]?.author?.username}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            LISTA DE BOLHAS (RANKING COMPLETO)
            ============================================================ */}

        {/* Loading */}
        {loading && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-12 text-center">
            <div className="animate-pulse text-cyan-400">
              ⏳ Carregando as bolhas mais quentes...
            </div>
          </div>
        )}

        {/* Vazio */}
        {!loading && bubbles.length === 0 && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-12 text-center text-slate-400">
            <div className="text-6xl mb-4">🫧</div>
            <p>Nenhuma bolha bombando ainda.</p>
            <p className="text-sm mt-2">Seja o primeiro a criar uma viral!</p>
          </div>
        )}

        {/* Ranking */}
        {!loading && bubbles.length > 0 && (
          <div className="space-y-3">
            {bubbles.map((bubble, index) => {
              const rankStyle = getRankStyle(index);
              const progressWidth = Math.min(100, (bubble.score / 12) * 100);

              return (
                <div
                  key={bubble._id}
                  onClick={() => navigate(`/bubble/${bubble._id}`)}
                  className={`group relative rounded-2xl p-5 border transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-xl ${rankStyle.bg} ${rankStyle.border}`}
                >
                  {/* Indicador de posição (medalha flutuante) */}
                  <div
                    className={`absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full ${rankStyle.rankBg} flex items-center justify-center text-sm font-bold text-black shadow-md`}
                  >
                    {rankStyle.icon}
                  </div>

                  <div className="ml-6">
                    {/* Cabeçalho: autor + badges */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {rankStyle.icon === '👑' ? '🔥' : '⚡'}
                        </span>
                        <span className={`font-bold ${rankStyle.rankText}`}>
                          @{bubble.author?.username}
                        </span>

                        {/* Badge: Vazou */}
                        {bubble.isLeaked && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-300 border border-lime-500/40">
                            💨 VAZOU
                          </span>
                        )}

                        {/* Badge: Prestes a vazar */}
                        {!bubble.isLeaked && bubble.score >= 10 && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 animate-pulse">
                            ⚠️ PRESTES A VAZAR
                          </span>
                        )}
                      </div>

                      {/* Score e data */}
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-bold ${rankStyle.rankText}`}>
                          Score: {bubble.score}
                        </div>
                        <div className="text-xs text-slate-500">
                          🕐 {new Date(bubble.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Título e conteúdo */}
                    {bubble.title && (
                      <h3 className="text-white font-bold text-md mb-1 line-clamp-1">
                        {bubble.title}
                      </h3>
                    )}
                    <p className="text-slate-300 text-sm line-clamp-2">
                      {bubble.content}
                    </p>

                    {/* Barra de progresso para vazamento */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>⚡ Pontos para vazar</span>
                        <span>{bubble.score}/12</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(bubble.score)}`}
                          style={{ width: `${progressWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Estatísticas rápidas */}
                    <div className="grid grid-cols-4 gap-3 mt-4 text-center">
                      {[
                        { icon: '❤️', value: bubble.likes?.length || 0, color: 'text-cyan-400' },
                        { icon: '💥', value: bubble.dislikes?.length || 0, color: 'text-rose-400' },
                        { icon: '💬', value: bubble.comments?.length || 0, color: 'text-lime-400' },
                        { icon: '🫧', value: bubble.sopros?.length || 0, color: 'text-lime-400' },
                      ].map((stat) => (
                        <div key={stat.icon} className="text-center">
                          <div className="text-xs text-slate-500">{stat.icon}</div>
                          <div className={`text-sm font-bold ${stat.color}`}>
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BubbleHUD>
  );
}
// ============================================================
// PÁGINA: NOTIFICAÇÕES
// Rota: /notifications
//
// Exibe todas as notificações do usuário logado.
//
// Funcionalidades:
//   - Agrupamento por data (Hoje, Ontem, Esta semana, Mais antigas)
//   - Cores diferentes por tipo de notificação
//   - Marcar como lida individualmente (clique)
//   - Marcar todas como lidas (botão)
//   - Links para perfil do sender e bolha relacionada
//   - Paginação (30 por página)
//   - Indicador visual de não lida (bolinha pulsante)
// ============================================================

import { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import BubbleHUD from '../components/BubbleHUD';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// ============================================================
// MAPEAMENTOS DE ESTILO (FORA DO COMPONENTE)
// ============================================================

// Ícone por tipo de notificação
const ICON_MAP = {
  leak: '💨',
  follow: '👥',
  comment: '💬',
  sopro: '🫧',
  trending: '🔥',
  badge: '🏅',
  ten_minutes_warning: '⚠️',
  expired: '💥',
  saved_from_expiry: '🎉',
  daily_reminder: '⏰',
};

// Estilo do card por tipo (apenas para não lidas)
const CARD_STYLE_MAP = {
  leak: 'bg-lime-500/10 border-lime-500/40 shadow-lime-500/20',
  sopro: 'bg-cyan-500/10 border-cyan-500/40 shadow-cyan-500/20',
  saved_from_expiry: 'bg-green-500/10 border-green-500/40 shadow-green-500/20',
  ten_minutes_warning: 'bg-yellow-500/10 border-yellow-500/40 shadow-yellow-500/20',
  expired: 'bg-rose-500/10 border-rose-500/40 shadow-rose-500/20',
};

const DEFAULT_CARD_STYLE = 'bg-cyan-500/10 border-cyan-500/30 shadow-cyan-500/10';
const READ_CARD_STYLE = 'bg-slate-900/30 border-slate-800/50 opacity-70';

// Títulos das seções de agrupamento
const SECTION_TITLES = {
  hoje: { icon: '☀️', label: 'Hoje' },
  ontem: { icon: '🌙', label: 'Ontem' },
  estaSemana: { icon: '📅', label: 'Esta semana' },
  maisAntigas: { icon: '📆', label: 'Mais antigas' },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Notifications() {
  const { refreshUnreadCount } = useContext(AuthContext);

  // ============================================================
  // ESTADO
  // ============================================================
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [markingId, setMarkingId] = useState(null);

  // ============================================================
  // BUSCAR NOTIFICAÇÕES
  // Recarrega quando a página muda.
  // ============================================================
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?page=${page}&limit=30`);
      setNotifications(res.data.notifications);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ============================================================
  // MARCAR UMA NOTIFICAÇÃO COMO LIDA
  // Atualiza o estado local + contador global.
  // ============================================================
  const markAsRead = async (id) => {
    setMarkingId(id);
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      if (refreshUnreadCount) await refreshUnreadCount();
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    } finally {
      setTimeout(() => setMarkingId(null), 200);
    }
  };

  // ============================================================
  // MARCAR TODAS COMO LIDAS
  // ============================================================
  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (refreshUnreadCount) await refreshUnreadCount();
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  // ============================================================
  // AGRUPAR POR DATA (MEMOIZADO)
  // Categoriza cada notificação em: Hoje, Ontem, Esta semana, +
  // ============================================================
  const groupedNotifications = useMemo(() => {
    const groups = {
      hoje: [],
      ontem: [],
      estaSemana: [],
      maisAntigas: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach((notif) => {
      const notifDate = new Date(notif.createdAt);
      const notifDay = new Date(
        notifDate.getFullYear(),
        notifDate.getMonth(),
        notifDate.getDate()
      );

      if (notifDay.getTime() === today.getTime()) {
        groups.hoje.push(notif);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.ontem.push(notif);
      } else if (notifDate > weekAgo) {
        groups.estaSemana.push(notif);
      } else {
        groups.maisAntigas.push(notif);
      }
    });

    return groups;
  }, [notifications]);

  // ============================================================
  // FUNÇÕES AUXILIARES DE ESTILO
  // ============================================================

  const getIconByType = (type) => ICON_MAP[type] || '🔔';

  const getCardStyle = (type, isRead) => {
    if (isRead) return READ_CARD_STYLE;
    return CARD_STYLE_MAP[type] || DEFAULT_CARD_STYLE;
  };

  const getSectionTitle = (section) =>
    SECTION_TITLES[section] || { icon: '📋', label: section };

  // ============================================================
  // RENDERIZAR LISTA DE NOTIFICAÇÕES POR SEÇÃO
  // ============================================================
  const renderNotificationList = (notifList, sectionName) => {
    if (notifList.length === 0) return null;

    const title = getSectionTitle(sectionName);

    return (
      <div key={sectionName} className="space-y-3">
        {/* Título da seção */}
        <div className="flex items-center gap-2 pt-4 first:pt-0">
          <span className="text-lg">{title.icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {title.label}
          </h3>
          <div className="flex-1 h-px bg-slate-800/50" />
          <span className="text-xs text-slate-500">{notifList.length}</span>
        </div>

        {/* Cards de notificação */}
        {notifList.map((notif) => (
          <div
            key={notif._id}
            className={`group relative rounded-2xl p-4 border transition-all duration-200 cursor-pointer hover:scale-[1.01] ${getCardStyle(notif.type, notif.read)}`}
            onClick={() => !notif.read && markAsRead(notif._id)}
          >
            <div className="flex items-start gap-3">
              {/* Ícone */}
              <div className="text-3xl">{getIconByType(notif.type)}</div>

              {/* Conteúdo */}
              <div className="flex-1">
                <p className="text-slate-200 text-sm leading-relaxed">
                  {notif.content}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>
                    🕐 {new Date(notif.createdAt).toLocaleString()}
                  </span>

                  {/* Link para o perfil do sender */}
                  {notif.sender && (
                    <Link
                      to={`/profile/${notif.sender.username}`}
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{notif.sender.username}
                    </Link>
                  )}

                  {/* Link para a bolha relacionada */}
                  {notif.bubbleId && (
                    <Link
                      to={`/bubble/${notif.bubbleId._id}`}
                      className="text-lime-400 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver bolha →
                    </Link>
                  )}
                </div>
              </div>

              {/* Indicador de não lida */}
              {!notif.read && (
                <div className="flex flex-col items-end gap-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  {markingId === notif._id && (
                    <div className="text-[10px] text-cyan-400 animate-pulse">
                      ✓
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <BubbleHUD>
      <div className="space-y-6">
        {/* ============================================================
            CABEÇALHO
            ============================================================ */}
        <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-md">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🔔</div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-white">
                  Notificações
                </h1>
                <p className="mt-1 text-slate-400 text-sm">
                  Interações, conquistas e alertas
                </p>
              </div>
            </div>

            {/* Botão "Marcar todas como lidas" (só aparece se há não lidas) */}
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full transition flex items-center gap-1"
              >
                <span>✓</span> Marcar todas como lidas
              </button>
            )}
          </div>
        </div>

        {/* ============================================================
            CONTEÚDO
            ============================================================ */}

        {/* Loading */}
        {loading && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-12 text-center">
            <div className="animate-pulse text-cyan-400">
              ⏳ Carregando notificações...
            </div>
          </div>
        )}

        {/* Vazio */}
        {!loading && notifications.length === 0 && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-12 text-center text-slate-400">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg">Nenhuma notificação ainda</p>
            <p className="text-sm mt-2">
              Interaja com as bolhas para receber novidades!
            </p>
          </div>
        )}

        {/* Lista agrupada */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {renderNotificationList(groupedNotifications.hoje, 'hoje')}
            {renderNotificationList(groupedNotifications.ontem, 'ontem')}
            {renderNotificationList(
              groupedNotifications.estaSemana,
              'estaSemana'
            )}
            {renderNotificationList(
              groupedNotifications.maisAntigas,
              'maisAntigas'
            )}

            {/* ============================================================
                PAGINAÇÃO
                ============================================================ */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 disabled:opacity-50 hover:bg-slate-700 transition text-sm"
                >
                  ← Anterior
                </button>
                <span className="px-4 py-2 text-sm text-slate-400">
                  Página {page} de {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 disabled:opacity-50 hover:bg-slate-700 transition text-sm"
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </BubbleHUD>
  );
}
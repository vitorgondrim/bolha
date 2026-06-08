// ============================================================
// BUBBLE HUD 🫧 - Componente compartilhado de navegacao
//
// Estilo bolha para TODAS as paginas.
// Substitui TopBar + BottomNav.
//
// Uso:
//   <BubbleHUD>
//     {conteudo da pagina}
//   </BubbleHUD>
//
// O HUD se adapta automaticamente:
//   - /feed → esconde TopBar/BottomNav (mapa tela cheia)
//   - Demais paginas → mostra navegacao completa
// ============================================================

import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const NAV_ITEMS = [
  { path: "/feed", icon: "🏠", label: "Mapa" },
  { path: "/explore", icon: "🔍", label: "Explorar" },
  { path: "/leaked", icon: "⚡", label: "Vazadas" },
  { path: "/trending", icon: "🔥", label: "Trending" },
];

export default function BubbleHUD({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, unreadCount } = useContext(AuthContext);
  const isFeed = location.pathname === "/feed";

  const soprosRestantes = 3 - (user?.dailySoprosUsed || 0);

  return (
    <div className="min-h-screen bg-bubble-bg">
      {/* CONTEUDO */}
      <div className={isFeed ? "" : "pt-16 pb-24 px-4 max-w-4xl mx-auto"}>
        {children}
      </div>

      {/* ============================================================
          🫧 HUD SUPERIOR ESQUERDO - Logo + Sopros
          (aparece em todas as paginas)
          ============================================================ */}
      <div className="fixed top-4 left-4 z-30 pointer-events-auto pt-safe">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bolha logo */}
          <button
            onClick={() => navigate("/feed")}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/25 shadow-lg shadow-cyan-500/15 backdrop-blur-md flex items-center justify-center hover:border-cyan-400/40 transition-all"
            title="Ir para o mapa"
          >
            <span className="text-base sm:text-lg">🫧</span>
          </button>

          {/* Bolha sopros */}
          <div className="h-9 sm:h-11 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/20 shadow-lg shadow-cyan-500/10 backdrop-blur-md flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5">
            <div className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full shadow-sm ${
              soprosRestantes > 0 ? "bg-lime-400 shadow-lime-400/50" : "bg-slate-600"
            }`} />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 tracking-wide">
              {soprosRestantes}/3
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          🫧 HUD SUPERIOR DIREITO - Notificacoes + Avatar + Sair
          (aparece em todas as paginas)
          ============================================================ */}
      <div className="fixed top-4 right-4 z-30 pointer-events-auto flex items-center gap-1 sm:gap-2 pt-safe">
        {/* Sino */}
        <div className="relative">
          <button
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/25 shadow-lg shadow-cyan-500/15 backdrop-blur-md flex items-center justify-center text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300 transition-all"
            title="Notificacoes"
          >
            <span className="text-sm sm:text-base">🔔</span>
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white text-[7px] sm:text-[8px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/40 border border-rose-300/30">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        {/* Avatar + @username */}
        <button
          onClick={() => navigate("/profile")}
          className="h-9 sm:h-11 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/25 shadow-lg shadow-cyan-500/15 backdrop-blur-md flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 pr-2.5 sm:pr-3.5 hover:border-cyan-400/40 transition-all"
          title="Meu perfil"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-2 ring-cyan-400/30 flex-shrink-0">
            {user?.avatarUrl && user.avatarUrl !== "null" ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-lime-500 flex items-center justify-center text-[9px] sm:text-xs font-black text-black">
                {(user?.username?.charAt(0) || "B").toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-white/80 hidden sm:block">
            @{user?.username || "bolha"}
          </span>
        </button>

        {/* Sair */}
        <button
          onClick={logout}
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/25 shadow-lg shadow-cyan-500/15 backdrop-blur-md flex items-center justify-center text-slate-400 hover:border-rose-400/40 hover:text-rose-300 hover:shadow-rose-500/20 transition-all"
          title="Sair"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>

      {/* ============================================================
          🫧 HUD INFERIOR - Navegacao (aparece em TODAS as paginas)
          ============================================================ */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto pb-safe">
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-full bg-gradient-to-br from-slate-900/70 to-slate-950/70 border border-cyan-400/20 shadow-xl shadow-cyan-500/10 backdrop-blur-md">
            {NAV_ITEMS.map((item) => (
              <NavItemBolha
                key={item.path}
                path={item.path}
                icon={item.icon}
                label={item.label}
                isActive={location.pathname === item.path}
                navigate={navigate}
              />
            ))}

            <div className="w-px h-5 sm:h-7 bg-cyan-400/15 mx-0.5 sm:mx-1" />

            <button
              onClick={() => navigate("/create")}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 h-8 sm:h-9 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 text-black font-bold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all active:scale-95"
            >
              <span className="text-[10px] sm:text-xs">🫧</span>
              <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest">Novo</span>
            </button>
          </div>
        </div>
    </div>
  );
}

// 🫧 Componente de navegacao em formato de bolha
function NavItemBolha({ path, icon, label, isActive, navigate }) {
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all ${
        isActive
          ? "bg-gradient-to-br from-cyan-500/20 to-lime-500/20 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      }`}
      title={label}
    >
      <span className="text-[11px] sm:text-sm leading-none">{icon}</span>
      <span className="text-[5px] sm:text-[6px] font-bold uppercase tracking-widest mt-0.5 leading-none">{label}</span>
    </button>
  );
}

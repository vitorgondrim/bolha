import { useContext, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

// Definição estática fora do escopo do componente para evitar re-alocação
const NAV_ITEMS = [
  { path: "/feed", icon: "🏠", label: "Mapa" },
  { path: "/explore", icon: "🔍", label: "Explorar" },
  { path: "/leaked", icon: "⚡", label: "Vazadas" },
  { path: "/trending", icon: "🔥", label: "Trending" },
];

export default function BubbleHUD({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout, unreadCount } = useContext(AuthContext);

  const isFeed = useMemo(() => pathname === "/feed", [pathname]);
  
  // Cálculo de estado derivado com segurança opcional (optional chaining)
  const soprosRestantes = useMemo(() => 
    3 - (user?.dailySoprosUsed ?? 0), 
  [user?.dailySoprosUsed]);

  return (
    <div className="min-h-screen bg-bubble-bg">
      {/* Container Principal com Padding Dinâmico */}
      <main className={!isFeed ? "pt-16 pb-24 px-4 max-w-4xl mx-auto" : "h-screen w-full"}>
        {children}
      </main>

      {/* HUD SUPERIOR ESQUERDO: Logo + Sopro */}
      <header className="sopro-hud fixed top-4 left-4 z-30 flex items-center gap-2 pt-safe">
        <button
          onClick={() => navigate("/feed")}
          className="w-10 h-10 rounded-full bg-slate-900/70 border border-cyan-400/25 backdrop-blur-md flex items-center justify-center hover:border-cyan-400/40 transition-all"
        >
          🫧
        </button>

        <div className="h-10 rounded-full bg-slate-900/70 border border-cyan-400/20 backdrop-blur-md flex items-center gap-2 px-3">
          <div className={`w-2.5 h-2.5 rounded-full ${soprosRestantes > 0 ? "bg-lime-400" : "bg-slate-600"}`} />
          <span className="text-xs font-bold text-slate-300">{soprosRestantes}/3</span>
        </div>
      </header>

      {/* HUD SUPERIOR DIREITO: Notificacoes + Avatar */}
      <aside className="fixed top-4 right-4 z-30 flex items-center gap-2 pt-safe">
        <NotificationBadge onClick={() => navigate("/notifications")} count={unreadCount} />
        
        <button
          onClick={() => navigate("/profile")}
          className="h-10 rounded-full bg-slate-900/70 border border-cyan-400/25 backdrop-blur-md flex items-center gap-2 px-3 hover:border-cyan-400/40"
        >
          <Avatar user={user} />
          <span className="text-xs font-bold text-white/80 hidden sm:block">@{user?.username ?? "bolha"}</span>
        </button>

        <button onClick={logout} className="p-2.5 rounded-full bg-slate-900/70 border border-cyan-400/25 hover:border-rose-400/40 transition-all">
           🚪
        </button>
      </aside>

      {/* HUD INFERIOR: Navegacao */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pb-safe">
          <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900/80 border border-cyan-400/20 backdrop-blur-md shadow-xl">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.path} {...item} isActive={pathname === item.path} onClick={() => navigate(item.path)} />
            ))}
            <div className="w-px h-6 bg-cyan-400/15" />
            <button onClick={() => navigate("/create")} className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
              Novo
            </button>
          </div>
      </nav>
    </div>
  );
}

// Subcomponentes extraídos para melhor legibilidade
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${isActive ? "bg-cyan-500/20 text-white" : "text-slate-500 hover:text-slate-300"}`}>
    <span className="text-sm">{icon}</span>
    <span className="text-[6px] font-bold uppercase tracking-widest mt-0.5">{label}</span>
  </button>
);

const NotificationBadge = ({ count, onClick }) => (
  <button onClick={onClick} className="relative w-10 h-10 rounded-full bg-slate-900/70 border border-cyan-400/25 flex items-center justify-center">
    🔔
    {count > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white">{count > 9 ? "9+" : count}</span>}
  </button>
);

const Avatar = ({ user }) => (
  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-cyan-400/30">
    {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-lime-500 flex items-center justify-center font-black text-black">{(user?.username?.[0] ?? "B").toUpperCase()}</div>}
  </div>
);
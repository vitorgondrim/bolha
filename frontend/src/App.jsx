// ============================================================
// COMPONENTE: APP (ROTEADOR PRINCIPAL)
// Arquivo: src/App.jsx
//
// Define todas as rotas da aplicação e a lógica de proteção.
//
// Estrutura de rotas:
//   - Públicas: Home (/), Login (/login), Google Callback
//   - Privadas: Feed, Profile, BubbleDetail, Create, etc.
//   - PrivateRoute: wrapper que verifica autenticação
//
// Fluxo de autenticação:
//   1. Usuário acessa rota privada
//   2. PrivateRoute verifica se está logado (signed)
//   3. Se estiver carregando (loading): mostra spinner
//   4. Se não estiver logado: redireciona para /login
//   5. Se estiver logado: renderiza a página
// ============================================================

import { useContext } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Páginas públicas
import Home from './Home';
import Login from './pages/Login';
import GoogleAuthCallback from './pages/GoogleAuthCallback';

// Páginas privadas
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import BubbleDetail from './pages/BubbleDetail';
import CreateBubblePage from './pages/CreateBubblePage';
import Explore from './pages/Explore';
import Leaked from './pages/Leaked';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Trending from './pages/Trending';

// ============================================================
// COMPONENTE: PRIVATE ROUTE
// Wrapper que protege rotas que exigem autenticação.
//
// Estados:
//   - loading: mostra spinner enquanto verifica autenticação
//   - signed === false: redireciona para /login
//   - signed === true: renderiza a rota protegida
// ============================================================
function PrivateRoute() {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-3 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-cyan-400 animate-spin" />
          </div>
          <p className="text-cyan-400 text-sm font-medium animate-pulse">
            🫧 Carregando...
          </p>
        </div>
      </div>
    );
  }

  return signed ? <Outlet /> : <Navigate to="/login" replace />;
}

function FallbackRoute() {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-3 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-cyan-400 animate-spin" />
          </div>
          <p className="text-cyan-400 text-sm font-medium animate-pulse">
            🫧 Carregando...
          </p>
        </div>
      </div>
    );
  }

  return signed ? <Navigate to="/feed" replace /> : <Navigate to="/login" replace />;
}

// ============================================================
// COMPONENTE PRINCIPAL: ROTAS
// ============================================================
export default function App() {
  return (
    <Routes>
      {/* ============================================================
          ROTAS PÚBLICAS
          Acessíveis sem autenticação.
          ============================================================ */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/google/success" element={<GoogleAuthCallback />} />

      {/* ============================================================
          ROTAS PRIVADAS
          Exigem autenticação (wrapper PrivateRoute).
          ============================================================ */}
      <Route element={<PrivateRoute />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/bubble/:id" element={<BubbleDetail />} />
        <Route path="/create" element={<CreateBubblePage />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/leaked" element={<Leaked />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/trending" element={<Trending />} />
      </Route>
      <Route path="*" element={<FallbackRoute />} />
    </Routes>
  );
}
// ============================================================
// COMPONENTE: APP (ROTEADOR PRINCIPAL)
// Arquivo: src/App.jsx
//
// Define todas as rotas da aplicação com React.lazy para code splitting.
// Cada página é carregada sob demanda, reduzindo o bundle inicial.
// ============================================================

import { lazy, Suspense, useContext } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';

// Páginas públicas — lazy loaded
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const GoogleAuthCallback = lazy(() => import('./pages/GoogleAuthCallback'));

// Páginas privadas — lazy loaded
const Feed = lazy(() => import('./pages/Feed'));
const Profile = lazy(() => import('./pages/Profile'));
const BubbleDetail = lazy(() => import('./pages/BubbleDetail'));
const CreateBubblePage = lazy(() => import('./pages/CreateBubblePage'));
const Explore = lazy(() => import('./pages/Explore'));
const Leaked = lazy(() => import('./pages/Leaked'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Trending = lazy(() => import('./pages/Trending'));

// ============================================================
// COMPONENTE: LOADING FALLBACK
// Mostrado enquanto o chunk da página está sendo carregado
// ============================================================
function PageLoader() {
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

// ============================================================
// COMPONENTE: PRIVATE ROUTE
// Wrapper que protege rotas que exigem autenticação.
// ============================================================
function PrivateRoute() {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return <PageLoader />;
  }

  return signed ? <Outlet /> : <Navigate to="/login" replace />;
}

function FallbackRoute() {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return <PageLoader />;
  }

  return signed ? <Navigate to="/feed" replace /> : <Navigate to="/login" replace />;
}

// ============================================================
// COMPONENTE PRINCIPAL: ROTAS
// ============================================================
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ROTAS PÚBLICAS */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/success" element={<GoogleAuthCallback />} />

        {/* ROTAS PRIVADAS */}
        <Route element={<PrivateRoute />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
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
    </Suspense>
  );
}
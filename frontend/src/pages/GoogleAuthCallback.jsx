// ============================================================
// PÁGINA: GOOGLE AUTH CALLBACK
// Rota: /auth/google/success
//
// Página de transição exibida após o login com Google.
// 
// Fluxo:
//   1. Usuário clica "Entrar com Google"
//   2. É redirecionado para o Google (tela de login)
//   3. Google redireciona para o backend (/api/auth/google/callback)
//   4. Backend processa, cria/víncula usuário, seta cookies
//   5. Backend redireciona para esta página (frontend)
//   6. Esta página revalida a autenticação (busca perfil)
//   7. Detecta usuário logado → redireciona para /feed
//
// Esta página é renderizada por menos de 1 segundo.
// Serve como tela de "loading" durante a transição.
// ============================================================

import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { user, loading, revalidateAuth } = useContext(AuthContext);

  // ============================================================
  // EFEITO 1: REVALIDAR AUTENTICAÇÃO
  // Força uma chamada à API para confirmar que os cookies
  // foram setados corretamente pelo backend.
  // Executa apenas uma vez ao montar a página.
  // ============================================================
  useEffect(() => {
    if (revalidateAuth) {
      revalidateAuth();
    }
  }, [revalidateAuth]);

  // ============================================================
  // EFEITO 2: REDIRECIONAR APÓS LOGIN
  // Quando o usuário for detectado (user não é null)
  // e o loading terminar, redireciona para o feed.
  // 
  // replace: true → substitui esta página no histórico.
  // O usuário não consegue voltar para esta tela de transição.
  // ============================================================
  useEffect(() => {
    if (!loading && user) {
      navigate('/feed', { replace: true });
    }
  }, [user, loading, navigate]);

  // ============================================================
  // RENDER: TELA DE TRANSIÇÃO
  // Spinner + mensagem "Redirecionando..."
  // Aparece por frações de segundo enquanto a auth é validada.
  // ============================================================
  return (
    <div className="min-h-screen bg-[#06060f] flex items-center justify-center text-white px-4">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-10 shadow-2xl shadow-cyan-500/10 max-w-md text-center">
        {/* Ícone de sucesso */}
        <div className="text-5xl mb-4">🎉</div>
        
        <p className="text-lg font-semibold">✅ Login realizado!</p>
        <p className="mt-2 text-sm text-slate-400">Redirecionando para o feed...</p>
        
        {/* Spinner */}
        <div className="mt-4 w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
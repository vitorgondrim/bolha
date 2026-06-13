// ============================================================
// PÁGINA: HOME (LANDING PAGE)
// Rota: /
//
// Página inicial para visitantes não autenticados.
// Layout split: texto à esquerda, call-to-action à direita.
//
// Funcionalidades:
//   - Botão "Continuar com Google" (link direto para OAuth)
//   - Botão "Criar conta" (redireciona para /login?register=1)
//   - Link "Entra" para quem já tem conta
//
// Design:
//   - Fundo escuro com gradientes radiais
//   - Card de ação com efeito vidro (backdrop-blur)
//   - Layout responsivo (split em desktop, empilhado em mobile)
// ============================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api.js';

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Home() {
  const navigate = useNavigate();

  // ============================================================
  // HANDLERS DE NAVEGAÇÃO
  // useCallback evita recriação em re-renders.
  // ============================================================
  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleRegister = useCallback(() => {
    navigate('/login?register=1'); // Abre a tela de login no modo registro
  }, [navigate]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-[#0d0f16] text-white relative overflow-hidden">
      {/* ============================================================
          FUNDO DECORATIVO
          Gradientes radiais sutis para atmosfera "neon".
          pointer-events-none: não interfere nos cliques.
          ============================================================ */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_25%)] pointer-events-none" />

      {/* ============================================================
          LAYOUT PRINCIPAL (SPLIT)
          Esquerda: branding e descrição
          Direita: card com botões de ação
          ============================================================ */}
      <div className="relative z-10 mx-auto flex h-screen max-w-7xl items-stretch justify-between px-6 py-8">
        {/* ============================================================
            LADO ESQUERDO: BRANDING
            Só visível em telas md+.
            ============================================================ */}
        <div className="hidden md:flex flex-col justify-between pb-16 pt-6 pr-16">
          {/* Logo placeholder */}
          <div className="text-sm uppercase tracking-[0.35em] text-slate-500">
            Bolha
          </div>

          {/* Título e descrição */}
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black tracking-tight leading-tight sm:text-6xl">
              Bolha
              <span className="block text-3xl font-semibold text-slate-400 mt-4">
                A sua rede efêmera, com entrada simples.
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-base leading-8 text-slate-300">
              Um ponto de entrada limpo e direto. Sem excesso de informações,
              só convite para criar conta e entrar na rede.
            </p>
          </div>
        </div>

        {/* ============================================================
            LADO DIREITO: CARD DE AÇÃO
            Efeito vidro (backdrop-blur) + borda sutil.
            ============================================================ */}
        <div className="w-full max-w-md mx-auto md:mx-0 glass-card p-8">
          <div className="flex h-full flex-col justify-end gap-4 pt-6">
            {/* ============================================================
                BOTÃO: GOOGLE
                Link direto para o backend (não usa navigate).
                O backend redireciona para o Google OAuth.
                ============================================================ */}
            <a
              href={`${API_BASE_URL}/auth/google`}
              className="w-full inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/90 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-900"
            >
              Continuar com Google
            </a>

            {/* ============================================================
                BOTÃO: CRIAR CONTA
                Redireciona para /login com o modo registro ativado.
                ============================================================ */}
            <button
              type="button"
              onClick={handleRegister}
              className="w-full rounded-full bg-white text-slate-950 py-4 text-sm font-black uppercase tracking-[0.25em] shadow-lg shadow-cyan-500/15 transition hover:opacity-95"
            >
              Criar conta
            </button>

            {/* ============================================================
                LINK: JÁ TEM CONTA?
                Redireciona para /login no modo login.
                ============================================================ */}
            <div className="text-center text-sm text-slate-400">
              Já tem uma conta?{' '}
              <button
                onClick={handleLogin}
                className="font-semibold text-white hover:text-cyan-300 transition"
              >
                Entra
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
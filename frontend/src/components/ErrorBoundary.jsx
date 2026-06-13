// ============================================================
// BOLHA - REDE SOCIAL EFÊMERA
// Arquivo: components/ErrorBoundary.jsx
// Propósito: Captura erros de renderização React e exibe fallback
// ============================================================

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Em produção, aqui seria enviado para um serviço de erro (Sentry, etc.)
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/feed';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Ícone animado */}
            <div className="text-6xl animate-bounce">💥</div>

            {/* Título */}
            <div>
              <h1 className="text-xl font-black text-white mb-2">
                Algo explodiu!
              </h1>
              <p className="text-sm text-slate-400">
                Um erro inesperado aconteceu. Não se preocupe, seus dados estão seguros.
              </p>
            </div>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="rounded-2xl bg-rose-950/50 border border-rose-500/20 p-4 text-left">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2">
                  Detalhes do erro (dev)
                </p>
                <pre className="text-[10px] text-rose-300/70 overflow-x-auto whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all"
              >
                🔄 Tentar novamente
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-lime-500 text-black text-sm font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
              >
                🫧 Ir para o feed
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
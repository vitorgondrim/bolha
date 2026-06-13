// ============================================================
// PÁGINA: GOOGLE AUTH CALLBACK
// Rota: /auth/google/success
// ============================================================

import { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { user, revalidateAuth } = useContext(AuthContext);
  const [validating, setValidating] = useState(true);

  // Revalidar autenticação ao montar
  useEffect(() => {
    const validate = async () => {
      try {
        await revalidateAuth();
      } catch (err) {
        // Erro silenciado — usuário será redirecionado para login
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [revalidateAuth, navigate]);

  // Redirecionar SOMENTE depois que a validação terminar
  useEffect(() => {
    if (validating) return;

    if (user) {
      navigate('/feed', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, validating, navigate]);

  return (
    <div className="min-h-screen bg-[#06060f] flex items-center justify-center text-white px-4">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-10 shadow-2xl shadow-cyan-500/10 max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-lg font-semibold">✅ Login realizado!</p>
        <p className="mt-2 text-sm text-slate-400">Redirecionando para o feed...</p>
        <div className="mt-4 w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
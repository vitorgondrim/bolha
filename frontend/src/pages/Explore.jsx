// ============================================================
// PÁGINA: EXPLORAR
// Rota: /explore
//
// Página de busca e descoberta de bolhas.
// 
// Funcionalidades:
//   - Busca por texto (título, conteúdo, @autor)
//   - Debounce de 500ms na busca
//   - Botão limpar busca (✕)
//   - AnimatePresence para transições suaves
//   - Lista de bolhas com BubbleCard
// ============================================================

import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import BubbleHUD from '../components/BubbleHUD';
import BubbleCard from '../components/BubbleCard';
import api from '../services/api';

const DEBOUNCE_DELAY = 500;

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [bubbles, setBubbles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchBubbles = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/bubbles');
        setBubbles(res.data.bubbles || []);
      } catch (err) {
        setError('Não foi possível carregar as bolhas.');
      } finally {
        setLoading(false);
      }
    };

    fetchBubbles();
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  const filteredBubbles = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return bubbles;

    return bubbles.filter((bubble) => {
      const content = bubble.content?.toLowerCase() || '';
      const title = bubble.title?.toLowerCase() || '';
      const author = bubble.author?.username?.toLowerCase() || '';
      const subject = bubble.subject?.toLowerCase() || '';

      return (
        content.includes(normalized) ||
        title.includes(normalized) ||
        author.includes(normalized) ||
        subject.includes(normalized)
      );
    });
  }, [bubbles, debouncedQuery]);

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  };

  // Determina qual "estado" visual mostrar
  const currentViewState = loading ? 'loading' : error ? 'error' : filteredBubbles.length === 0 ? 'empty' : 'results';

  return (
    <BubbleHUD>
      {/* ============================================================
          CABEÇALHO COM BUSCA
          ============================================================ */}
      <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-gradient-cyan">
              🔍 Explorar
            </h1>
            <p className="mt-2 text-slate-400 text-sm">
              Busque bolhas por palavras-chave ou @autor
            </p>
          </div>
          <div className="rounded-3xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            {bubbles.length} bolha(s) disponíveis
          </div>
        </div>

        {/* Campo de busca com botão limpar */}
        <div className="mt-6 relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por assunto, texto ou @autor"
            className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 pr-10 text-sm text-slate-100 outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/30 transition-all"
          />
          {query.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-all"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* ============================================================
          ESTADOS: LOADING, ERRO, VAZIO OU LISTA (com AnimatePresence)
          ============================================================ */}
      <AnimatePresence mode="wait">
        {currentViewState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-slate-900/80 p-8 text-center"
          >
            <div className="animate-pulse text-[#a78bfa]">Carregando bolhas...</div>
          </motion.div>
        )}

        {currentViewState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-slate-900/80 p-8 text-center text-slate-400"
          >
            <p className="text-4xl mb-3">😵</p>
            <p>{error}</p>
          </motion.div>
        )}

        {currentViewState === 'empty' && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl bg-slate-900/80 p-8 text-center text-slate-400"
          >
            <p className="text-5xl mb-4">🫧</p>
            <p className="text-lg">Nenhuma bolha encontrada para "{query}"</p>
            <p className="text-sm mt-2 text-slate-500">Tente outro termo de busca.</p>
          </motion.div>
        )}

        {currentViewState === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {filteredBubbles.map((bubble, index) => (
              <motion.div
                key={bubble._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <BubbleCard
                  bubble={bubble}
                  userId={user?.id || user?._id}
                  onOpen={(bubbleId) => navigate(`/bubble/${bubbleId}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </BubbleHUD>
  );
}
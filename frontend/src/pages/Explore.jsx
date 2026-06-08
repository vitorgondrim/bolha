// ============================================================
// PÁGINA: EXPLORAR
// Rota: /explore
//
// Página de busca e descoberta de bolhas.
// 
// Funcionalidades:
//   - Busca por texto (título, conteúdo, @autor)
//   - Debounce de 500ms na busca (evita requisições excessivas)
//   - Lista de bolhas com BubbleCard
//   - Navegação para detalhe da bolha ao clicar
//
// Diferente do Feed (que é imersivo e visual),
// o Explore é focado em busca textual e listagem.
// ============================================================

import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BubbleHUD from '../components/BubbleHUD';
import BubbleCard from '../components/BubbleCard';
import api from '../services/api';

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_DELAY = 500; // ms de espera antes de filtrar

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Explore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);

  // ============================================================
  // ESTADO
  // ============================================================
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [bubbles, setBubbles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);

  // ============================================================
  // BUSCAR BOLHAS DA API
  // Carrega todas as bolhas ativas uma vez.
  // A filtragem é feita no frontend para resposta instantânea.
  // ============================================================
  useEffect(() => {
    const fetchBubbles = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/bubbles');
        setBubbles(res.data.bubbles || []);
      } catch (err) {
        console.error('Erro ao carregar bolhas:', err);
        setError('Não foi possível carregar as bolhas.');
      } finally {
        setLoading(false);
      }
    };

    fetchBubbles();
  }, []);

  // ============================================================
  // DEBOUNCE NA BUSCA
  // Aguarda 500ms após o usuário parar de digitar
  // antes de atualizar o termo de busca.
  // Isso evita filtragens a cada tecla pressionada.
  // ============================================================
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // ============================================================
  // FILTRAGEM (MEMOIZADA)
  // Só recalcula quando as bolhas ou o termo debounced mudam.
  // Busca no conteúdo e no nome do autor.
  // ============================================================
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

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <BubbleHUD>
      {/* ============================================================
          CABEÇALHO COM BUSCA
          ============================================================ */}
      <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">
              🔍 Explorar
            </h1>
            <p className="mt-2 text-slate-400 text-sm">
              Busque bolhas por palavras-chave ou @autor
            </p>
          </div>
          {/* Contador de bolhas disponíveis */}
          <div className="rounded-3xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            {bubbles.length} bolha(s) disponíveis
          </div>
        </div>

        {/* Campo de busca */}
        <div className="mt-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por assunto, texto ou @autor"
            className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>
      </section>

      {/* ============================================================
          ESTADOS: LOADING, ERRO, VAZIO OU LISTA
          ============================================================ */}

      {/* Loading */}
      {loading && (
        <div className="rounded-3xl bg-slate-900/80 p-8 text-center">
          <div className="animate-pulse text-cyan-400">Carregando bolhas...</div>
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div className="rounded-3xl bg-slate-900/80 p-8 text-center text-slate-400">
          <p className="text-4xl mb-3">😵</p>
          <p>{error}</p>
        </div>
      )}

      {/* Vazio (sem resultados) */}
      {!loading && !error && filteredBubbles.length === 0 && (
        <div className="rounded-3xl bg-slate-900/80 p-8 text-center text-slate-400">
          <p className="text-5xl mb-4">🫧</p>
          <p className="text-lg">Nenhuma bolha encontrada para "{query}"</p>
          <p className="text-sm mt-2 text-slate-500">Tente outro termo de busca.</p>
        </div>
      )}

      {/* Lista de bolhas */}
      {!loading && !error && filteredBubbles.length > 0 && (
        <div className="space-y-6">
          {filteredBubbles.map((bubble) => (
            <BubbleCard
              key={bubble._id}
              bubble={bubble}
              userId={user?.id || user?._id}
              onOpen={(bubbleId) => navigate(`/bubble/${bubbleId}`)}
            />
          ))}
        </div>
      )}
    </BubbleHUD>
  );
}
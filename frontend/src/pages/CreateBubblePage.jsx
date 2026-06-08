// ============================================================
// PÁGINA: CRIAR BOLHA
// Rota: /create
//
// Formulário completo para criação de uma nova bolha.
// 
// Funcionalidades:
//   - Título (obrigatório, máx 60 caracteres)
//   - Mensagem (obrigatório, máx 500 caracteres)
//   - Upload de imagem/GIF com preview
//   - Seleção de assunto (principais + extras expansíveis)
//   - Dicas interativas (tooltip)
//   - Feedback visual: loading, erro, sucesso
//   - Redirecionamento automático após sucesso
//
// Diferente do NewBubbleForm (componente embedável),
// esta é uma página completa com layout dedicado.
// ============================================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BubbleHUD from '../components/BubbleHUD';
import api from '../services/api';

// ============================================================
// CONSTANTES
// ============================================================
const MAX_TITLE_LENGTH = 60;
const MAX_CONTENT_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Assuntos principais (sempre visíveis)
const MAIN_SUBJECTS = ['Geral', 'Desabafo', 'Ideia', 'Pergunta', 'Humor'];

// Assuntos extras (escondidos atrás de "Mostrar mais")
const EXTRA_SUBJECTS = [
  'Filosofia', 'Arte', 'Música', 'Tecnologia', 'Ciência',
  'Inspiração', 'Crítica', 'Poesia', 'Conto', 'Review', 'Notícia', 'Tutorial',
];

// Dicas rápidas (tooltip)
const TIPS = [
  { icon: '📌', text: 'Título chamativo atrai mais atenção' },
  { icon: '❤️', text: 'Curtidas dão +10min de vida' },
  { icon: '💬', text: 'Comentários dão +30min de vida' },
  { icon: '🫧', text: 'Sopros dão +120min de vida' },
  { icon: '💥', text: 'Dislikes reduzem -15min de vida' },
  { icon: '⚡', text: 'Com 12 pontos de energia, a bolha vaza!' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CreateBubblePage() {
  const navigate = useNavigate();

  // ============================================================
  // ESTADO DO FORMULÁRIO
  // ============================================================
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Geral');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // ============================================================
  // REFS
  // Para focar automaticamente em campos com erro.
  // ============================================================
  const titleInputRef = useRef(null);
  const contentInputRef = useRef(null);

  // ============================================================
  // HANDLER: SELEÇÃO DE ARQUIVO
  // Valida tamanho (5MB) e gera preview local.
  // ============================================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  // ============================================================
  // HANDLER: SUBMISSÃO DO FORMULÁRIO
  // Usa FormData para enviar texto + arquivo binário.
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações manuais com foco no campo com erro
    if (!title.trim()) {
      setError('Dá um título legal pra sua bolha!');
      titleInputRef.current?.focus();
      return;
    }
    if (!content.trim()) {
      setError('Escreve uma mensagem antes de soprar!');
      contentInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Constrói FormData para envio multipart
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('subject', subject);
      formData.append('content', content.trim());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api.post('/bubbles', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);

      // Redireciona para o feed após 1.5 segundos
      setTimeout(() => {
        navigate('/feed');
      }, 1500);
    } catch (err) {
      // Extrai mensagem de erro do backend
      const errorData = err.response?.data;

      if (errorData?.message) {
        setError(errorData.message);
      } else if (errorData?.errors && errorData.errors.length > 0) {
        const firstError = errorData.errors[0];
        setError(typeof firstError === 'string' ? firstError : firstError.msg);
      } else {
        setError('Ops... não foi possível soprar sua bolha');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <BubbleHUD>
      <div className="max-w-2xl mx-auto pb-32">
        {/* ============================================================
            CABEÇALHO
            ============================================================ */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-lime-400 bg-clip-text text-transparent">
            Criar Bolha
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Dê vida a uma ideia. Ela vai flutuar por 24h.
          </p>
        </div>

        {/* ============================================================
            FORMULÁRIO
            ============================================================ */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ----------------------------------------------------------
              MENSAGEM DE ERRO
              ---------------------------------------------------------- */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm text-center">
              💨 {error}
            </div>
          )}

          {/* ----------------------------------------------------------
              MENSAGEM DE SUCESSO
              ---------------------------------------------------------- */}
          {success && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-green-400 text-sm text-center animate-pulse">
              🎉 Bolha soprada com sucesso!
            </div>
          )}

          {/* ============================================================
              CAMPO: TÍTULO
              ============================================================ */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>📌</span> TÍTULO
              <span className="text-cyan-500">*</span>
              <span className="text-slate-600 text-[10px] ml-auto">
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              placeholder="O que você quer dizer?"
              className="w-full bg-slate-900/50 rounded-xl border border-slate-700 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
              disabled={loading}
            />
          </div>

          {/* ============================================================
              CAMPO: MENSAGEM (COM ANEXO INTEGRADO)
              ============================================================ */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>💬</span> MENSAGEM
              <span className="text-cyan-500">*</span>
              <span className="text-slate-600 text-[10px] ml-auto">
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
            </label>
            <div className="relative">
              <textarea
                ref={contentInputRef}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                rows={4}
                placeholder="Escreva sua ideia aqui..."
                className="w-full bg-slate-900/50 rounded-xl border border-slate-700 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 resize-none"
                disabled={loading}
              />

              {/* Botão de anexar imagem (dentro do textarea) */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMediaInput(!showMediaInput)}
                  className={`p-1.5 rounded-lg transition ${
                    showMediaInput || imageFile
                      ? 'text-cyan-400 bg-slate-700'
                      : 'text-slate-400 bg-slate-800 hover:bg-slate-700'
                  }`}
                  title="Adicionar imagem ou GIF"
                >
                  🖼️
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================
              CAMPO: UPLOAD DE IMAGEM (CONDICIONAL)
              Aparece quando o usuário clica no botão 🖼️.
              ============================================================ */}
          {showMediaInput && (
            <div className="rounded-xl bg-slate-900/30 border border-slate-700 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span>🖼️</span> ADICIONAR IMAGEM OU GIF
              </div>

              <label className="flex flex-col items-center justify-center border border-dashed border-slate-700 hover:border-cyan-500/40 bg-slate-900/20 rounded-xl p-5 cursor-pointer transition-all group min-h-28">
                {imagePreview ? (
                  /* Preview da imagem selecionada */
                  <div className="w-full flex flex-col justify-center items-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-36 rounded-lg object-contain border border-slate-700 bg-slate-950/40 p-1"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium mt-3 flex items-center gap-1 transition-colors"
                    >
                      ✕ Remover imagem
                    </button>
                  </div>
                ) : (
                  /* Área de upload vazia */
                  <>
                    <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
                      📂
                    </span>
                    <span className="text-xs text-slate-400 group-hover:text-cyan-400 transition-colors font-medium">
                      Clique para selecionar do seu computador
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono mt-1">
                      PNG, JPG ou GIF de até 5MB
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          )}

          {/* ============================================================
              CAMPO: ASSUNTO
              Badges clicáveis. Principais sempre visíveis.
              Extras aparecem ao clicar "+ mais".
              ============================================================ */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>🏷️</span> ASSUNTO
            </label>
            <div className="flex flex-wrap gap-2">
              {MAIN_SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    subject === s
                      ? 'bg-gradient-to-r from-cyan-500 to-lime-500 text-black font-medium shadow-sm'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowAllSubjects(!showAllSubjects)}
                className="px-3 py-1.5 rounded-full text-xs bg-slate-800/30 text-slate-500 hover:text-cyan-400 transition"
              >
                {showAllSubjects ? '− menos' : '+ mais'}
              </button>
            </div>

            {/* Assuntos extras (expansíveis) */}
            {showAllSubjects && (
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-800 animate-in slide-in-from-top-1 duration-200">
                {EXTRA_SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      subject === s
                        ? 'bg-gradient-to-r from-cyan-500 to-lime-500 text-black font-medium shadow-sm'
                        : 'bg-slate-800/30 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================
              BOTÃO DE SUBMISSÃO
              Gradiente animado com efeito hover de brilho.
              ============================================================ */}
          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim()}
            className="relative w-full group overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-lime-500 disabled:from-slate-700 disabled:to-slate-700 text-black font-bold py-4 transition-all text-lg mt-6 cursor-pointer"
          >
            {/* Efeito de brilho que desliza no hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Soprando...</span>
                </>
              ) : (
                <>
                  <span>💨</span>
                  <span className="uppercase tracking-wider text-sm font-bold">
                    SOPRAR BOLHA
                  </span>
                  <span>🫧</span>
                </>
              )}
            </div>
          </button>

          {/* ============================================================
              TOOLTIP DE DICAS
              Aparece ao passar o mouse sobre "💡 Dicas".
              ============================================================ */}
          <div className="flex justify-center mt-4">
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTips(true)}
                onMouseLeave={() => setShowTips(false)}
                className="text-slate-500 hover:text-cyan-400 transition text-sm flex items-center gap-1"
              >
                <span>💡</span> Dicas
              </button>

              {showTips && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-10 animate-in fade-in zoom-in-95 duration-150">
                  <div className="space-y-2">
                    {TIPS.map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <span>{tip.icon}</span>
                        <span>{tip.text}</span>
                      </div>
                    ))}
                  </div>
                  {/* Setinha do tooltip */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-700" />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </BubbleHUD>
  );
}
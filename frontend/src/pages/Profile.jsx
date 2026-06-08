// ============================================================
// PÁGINA: PERFIL
// Rota: /profile (perfil próprio) ou /profile/:username (público)
//
// Exibe o perfil completo de um usuário:
//   - Capa e avatar (editáveis se for o próprio perfil)
//   - Bio, estatísticas (seguidores, seguindo, bolhas)
//   - Emblemas (conquistas)
//   - Abas: Ativas, Estouradas, Populares, Recentes
//   - Modal de edição de perfil e capa
//   - Upload de avatar e capa (arquivo ou URL)
//
// Comportamento:
//   - Se acessado sem username → perfil do usuário logado
//   - Se acessado com username → perfil público de outro usuário
// ============================================================

import { useCallback, useEffect, useMemo, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BubbleHUD from '../components/BubbleHUD';
import api from '../services/api';

// ============================================================
// CONSTANTES
// ============================================================
const TABS = [
  { id: 'soprando', label: '🌪️', name: 'Ativas' },
  { id: 'estouradas', label: '💥', name: 'Estouradas' },
  { id: 'populares', label: '⭐', name: 'Populares' },
  { id: 'recentes', label: '🕐', name: 'Recentes' },
];

const BADGE_ICONS = {
  fura_bolha: '💨',
  soprador_lendario: '🫧',
  o_estouro: '💥',
  sobrevivente: '⏱️',
};

const BADGE_GRADIENTS = {
  Ouro: 'from-yellow-500 to-amber-500',
  Prata: 'from-gray-400 to-gray-500',
  Bronze: 'from-amber-600 to-amber-700',
  Neon: 'from-lime-400 to-cyan-400',
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, authenticate, refreshUser } = useContext(AuthContext);

  // ============================================================
  // ESTADO DO PERFIL
  // ============================================================
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('soprando');
  const [isFollowing, setIsFollowing] = useState(false);

  // ============================================================
  // ESTADO DOS MODAIS
  // ============================================================
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editCoverModal, setEditCoverModal] = useState(false);
  const [bioText, setBioText] = useState('');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  // ============================================================
  // REFS PARA INPUT DE ARQUIVO
  // ============================================================
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // ============================================================
  // ESTADO DAS ABAS
  // ============================================================
  const [profileBubbles, setProfileBubbles] = useState([]);
  const [loadingBubbles, setLoadingBubbles] = useState(false);
  const [bubblesError, setBubblesError] = useState(null);

  // ============================================================
  // VERIFICA SE É O PERFIL PRÓPRIO
  // ============================================================
  const isMyProfile = !username || username === currentUser?.username;

  // ============================================================
  // BUSCAR DADOS DO PERFIL
  // ============================================================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const url = isMyProfile ? '/users/me' : `/users/${username}`;
        const res = await api.get(url);
        setProfileData(res.data);
        setBioText(res.data.user?.bio || '');
        setIsFollowing(res.data.user?.isFollowing || false);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      }
    };
    fetchProfile();
  }, [username, isMyProfile]);

  // ============================================================
  // BUSCAR TODAS AS BOLHAS DO PERFIL
  // ============================================================
  const fetchProfileBubbles = useCallback(async () => {
    if (!profileData?.user?._id) return;
    setLoadingBubbles(true);
    setBubblesError(null);

    try {
      const res = await api.get(`/bubbles/user/${profileData.user._id}?limit=100`);
      setProfileBubbles(res.data.bubbles || []);
    } catch (err) {
      console.error('Erro ao carregar bolhas do perfil:', err);
      setBubblesError('Não foi possível carregar as bolhas do perfil.');
    } finally {
      setLoadingBubbles(false);
    }
  }, [profileData]);

  useEffect(() => {
    fetchProfileBubbles();
  }, [fetchProfileBubbles]);

  const expiredBubbles = useMemo(() => {
    const now = new Date();
    return profileBubbles.filter((bubble) => new Date(bubble.expiresAt) < now);
  }, [profileBubbles]);

  const popularBubbles = useMemo(() => {
    return [...profileBubbles]
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 10);
  }, [profileBubbles]);

  const recentBubbles = useMemo(() => {
    return [...profileBubbles].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [profileBubbles]);

  // ============================================================
  // HANDLER: SEGUIR / DEIXAR DE SEGUIR
  // ============================================================
  const handleFollowToggle = async () => {
    try {
      await api.post(`/users/follow/${profileData.user._id}`);
      setIsFollowing(!isFollowing);
      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          followerCount: isFollowing
            ? prev.user.followerCount - 1
            : prev.user.followerCount + 1,
        },
      }));
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir:', err);
    }
  };

  // ============================================================
  // HANDLER: SALVAR BIO
  // ============================================================
  const handleSaveProfile = async () => {
    try {
      await api.patch('/users/update', { bio: bioText });
      setProfileData((prev) => ({
        ...prev,
        user: { ...prev.user, bio: bioText },
      }));
      setEditProfileModal(false);
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    }
  };

  // ============================================================
  // HANDLER: UPLOAD DE AVATAR
  // ============================================================
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);

    try {
      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

            const updatedUser = { ...currentUser, avatarUrl: res.data.avatarUrl };
      localStorage.setItem('@Bolha:user', JSON.stringify(updatedUser));
      // @Bolha:token não existe (JWT fica em cookie httpOnly), apenas atualiza o estado do usuário
      authenticate(updatedUser);

      setProfileData((prev) => ({
        ...prev,
        user: { ...prev.user, avatarUrl: res.data.avatarUrl },
      }));

      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error('Erro upload avatar:', err);
      alert(err.response?.data?.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // HANDLER: UPLOAD DE CAPA (ARQUIVO)
  // ============================================================
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('cover', file);
    setUploading(true);

    try {
      const res = await api.post('/upload/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfileData((prev) => ({
        ...prev,
        user: { ...prev.user, coverUrl: res.data.coverUrl },
      }));
      setEditCoverModal(false);
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error('Erro upload capa:', err);
      alert(err.response?.data?.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // HANDLER: SALVAR CAPA POR URL
  // ============================================================
  const handleCoverUrlSave = async () => {
    if (!coverUrlInput.trim()) return;
    setUploading(true);
    try {
      const res = await api.post('/upload/cover-url', {
        coverUrl: coverUrlInput.trim(),
      });
      setProfileData((prev) => ({
        ...prev,
        user: { ...prev.user, coverUrl: res.data.coverUrl },
      }));
      setEditCoverModal(false);
      setCoverUrlInput('');
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error('Erro salvar capa URL:', err);
      alert('Erro ao salvar capa');
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // CÁLCULO DE SCORE (AUXILIAR)
  // ============================================================
  const getScore = (bubble) => {
    return (
      (bubble.likes?.length || 0) +
      (bubble.comments?.length || 0) * 3 +
      (bubble.sopros?.length || 0) * 4 -
      (bubble.dislikes?.length || 0) * 2
    );
  };

  // ============================================================
  // ESTADO: LOADING INICIAL
  // ============================================================
  if (!profileData) {
    return (
      <BubbleHUD>
        <div className="flex items-center justify-center h-screen text-cyan-400 animate-pulse">
          🫧 Carregando...
        </div>
      </BubbleHUD>
    );
  }

  // ============================================================
  // DESTRUCTURING DOS DADOS DO PERFIL
  // ============================================================
  const { user, activeBubbles, badges } = profileData;
  const hasActiveBubbles = activeBubbles && activeBubbles.length > 0;
  const coverImage = user.coverUrl || null;
  const avatarImage = user.avatarUrl || null;

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <BubbleHUD>
      <div className="max-w-2xl mx-auto pb-32 space-y-6">
        {/* ============================================================
            CARD DO PERFIL
            ============================================================ */}
        <div className="relative rounded-3xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
          {/* Capa */}
          <div
            className="h-32 bg-gradient-to-r from-cyan-500/20 to-lime-500/20 bg-cover bg-center cursor-pointer transition-opacity hover:opacity-90"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : {}}
            onClick={() => isMyProfile && setEditCoverModal(true)}
          >
            {isMyProfile && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                <span className="text-white text-xs font-medium bg-slate-800/80 px-3 py-1 rounded-full">
                  ✏️ Editar capa
                </span>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="relative flex justify-center -mt-12 mb-4">
            <div className="relative group">
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-lime-500 p-1 shadow-xl ${
                  hasActiveBubbles ? 'shadow-lime-500/50' : ''
                }`}
              >
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-3xl font-black text-white">
                    {(user?.username?.charAt(0) || '?').toUpperCase()}
                  </div>
                )}
              </div>
              {isMyProfile && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-sm hover:bg-slate-700 transition"
                    title="Alterar foto"
                  >
                    📷
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </>
              )}
            </div>
          </div>

          {/* Informações do perfil */}
          <div className="text-center px-4">
            <h1 className="text-2xl font-black text-white mb-1">
              @{user.username}
            </h1>
            <p className="text-slate-400 text-sm mb-4 max-w-xs mx-auto">
              {user.bio || '✨ Sem bio ainda...'}
            </p>

            {/* Estatísticas: seguidores, seguindo, bolhas */}
            <div className="flex justify-center gap-6 mb-5">
              <div className="text-center">
                <div className="text-xl font-bold text-white">
                  {user.followerCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Seguidores
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700/50" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">
                  {user.followingCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Seguindo
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700/50" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">
                  {user.bubblesCreated || 0}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Bolhas
                </div>
              </div>
            </div>

            {/* Botão: Editar perfil (próprio) ou Seguir (outros) */}
            {isMyProfile ? (
              <button
                onClick={() => setEditProfileModal(true)}
                className="mb-5 px-5 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition"
              >
                ✏️ Editar perfil
              </button>
            ) : (
              <button
                onClick={handleFollowToggle}
                className={`mb-5 px-6 py-2 rounded-full text-sm font-bold transition ${
                  isFollowing
                    ? 'bg-slate-800/80 border border-slate-700 text-slate-300'
                    : 'bg-gradient-to-r from-cyan-500 to-lime-500 text-black shadow-md'
                }`}
              >
                {isFollowing ? '✓ Seguindo' : '+ Seguir'}
              </button>
            )}
          </div>

          {/* Membro desde */}
          <div className="text-center pb-5 text-[10px] text-slate-600 border-t border-slate-800/50 pt-4 mt-2">
            🫧 Membro desde{' '}
            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
          </div>
        </div>

        {/* ============================================================
            EMBLEMAS (CONQUISTAS)
            ============================================================ */}
        {badges && badges.length > 0 && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏅</span>
              <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Conquistas
              </h3>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {badges
                .filter((b) => b.tier !== 'Bloqueado')
                .map((badge) => {
                  const badgeIcon = BADGE_ICONS[badge.id] || '🏅';
                  const badgeGradient =
                    BADGE_GRADIENTS[badge.tier] || 'from-slate-600 to-slate-700';

                  return (
                    <div key={badge.id} className="relative group">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${badgeGradient} flex items-center justify-center text-base shadow-md cursor-help transition-transform hover:scale-110`}
                      >
                        {badgeIcon}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-slate-800 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                        {badge.name} ({badge.tier})
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-800" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============================================================
            ESTATÍSTICAS RÁPIDAS
            ============================================================ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '⚡', value: user.leaksCount || 0, label: 'Vazamentos', color: 'text-lime-400', hover: 'hover:border-lime-500/30', tooltip: 'Bolhas que viralizaram 🎉' },
            { icon: '🫧', value: user.soprosGiven || 0, label: 'Sopros dados', color: 'text-cyan-400', hover: 'hover:border-cyan-500/30', tooltip: 'Sopros que você deu 💨' },
            { icon: '💨', value: user.timesLeaked || 0, label: 'Vezes vazou', color: 'text-rose-400', hover: 'hover:border-rose-500/30', tooltip: 'Suas bolhas que viralizaram 🔥' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`relative group text-center p-3 rounded-2xl bg-slate-900/30 border border-slate-800/50 cursor-help transition-all ${stat.hover}`}
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[9px] text-slate-500">{stat.label}</div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-slate-800 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                {stat.tooltip}
              </div>
            </div>
          ))}
        </div>

        {bubblesError && (
          <div className="mt-4 rounded-2xl bg-rose-950/80 border border-rose-600/20 px-4 py-3 text-sm text-rose-200">
            {bubblesError}
          </div>
        )}

        {/* ============================================================
            ABAS
            ============================================================ */}
        <div className="mb-2">
          <div className="flex gap-1 bg-slate-900/50 rounded-2xl p-1 border border-slate-800/50">
            {TABS.map((tab) => {
              const count =
                tab.id === 'soprando'
                  ? activeBubbles?.length || 0
                  : tab.id === 'estouradas'
                    ? expiredBubbles.length
                    : tab.id === 'populares'
                      ? popularBubbles.length
                      : recentBubbles.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-lime-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">{tab.label}</span>
                  <span className="text-xs">{tab.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-black/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            CONTEÚDO DAS ABAS
            ============================================================ */}
        <div className="space-y-3">
          {/* Aba: Ativas (Soprando) */}
          {activeTab === 'soprando' &&
            (activeBubbles?.length > 0 ? (
              activeBubbles.map((bubble) => (
                <div
                  key={bubble._id}
                  onClick={() => navigate(`/bubble/${bubble._id}`)}
                  className="p-4 rounded-2xl bg-slate-900/40 border border-lime-500/30 hover:border-lime-500/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    {bubble.title && (
                      <h4 className="text-white font-bold text-sm group-hover:text-lime-400 transition line-clamp-1">
                        {bubble.title}
                      </h4>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-lime-400 animate-pulse">⚡ ATIVA</span>
                      {getScore(bubble) >= 8 && !bubble.hasLeaked && (
                        <span className="text-[9px] text-rose-400 animate-pulse">🔥 QUENTE</span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-2">{bubble.content}</p>
                  <div className="mt-2 flex justify-between items-center text-[10px] text-slate-500">
                    <span>
                      ❤️ {bubble.likes?.length || 0} · 💬 {bubble.comments?.length || 0} · 🫧 {bubble.sopros?.length || 0}
                    </span>
                    <span>Expira {new Date(bubble.expiresAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 rounded-2xl bg-slate-900/30">
                <div className="text-4xl mb-2">🌪️</div>
                <p className="text-sm">Nenhuma bolha ativa</p>
                <p className="text-xs mt-1">Sopre uma nova bolha para aparecer aqui!</p>
              </div>
            ))}

          {/* Aba: Estouradas */}
          {activeTab === 'estouradas' &&
            (loadingBubbles ? (
              <div className="text-center py-12 text-slate-500 animate-pulse">⏳ Carregando...</div>
            ) : expiredBubbles.length === 0 ? (
              <div className="text-center py-12 text-slate-500 rounded-2xl bg-slate-900/30">
                <div className="text-4xl mb-2">💤</div>
                <p className="text-sm">Nenhuma bolha estourou ainda</p>
                <p className="text-xs mt-1">Suas bolhas estão todas vivas!</p>
              </div>
            ) : (
              expiredBubbles.map((bubble) => (
                <div key={bubble._id} className="p-4 rounded-2xl bg-slate-900/20 border border-slate-800/50 opacity-70">
                  {bubble.title && <h4 className="text-slate-400 font-medium text-sm mb-1 line-clamp-1">{bubble.title}</h4>}
                  <p className="text-slate-500 text-sm line-clamp-2">{bubble.content}</p>
                  <div className="mt-2 text-[10px] text-slate-600">
                    💥 Estourou em {new Date(bubble.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ))}

          {/* Aba: Populares */}
          {activeTab === 'populares' &&
            (loadingBubbles ? (
              <div className="text-center py-12 text-slate-500 animate-pulse">⏳ Carregando...</div>
            ) : popularBubbles.length === 0 ? (
              <div className="text-center py-12 text-slate-500 rounded-2xl bg-slate-900/30">
                <div className="text-4xl mb-2">⭐</div>
                <p className="text-sm">Nenhuma bolha popular ainda</p>
                <p className="text-xs mt-1">Receba curtidas para aparecer aqui!</p>
              </div>
            ) : (
              popularBubbles.map((bubble, idx) => (
                <div
                  key={bubble._id}
                  onClick={() => navigate(`/bubble/${bubble._id}`)}
                  className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/30 hover:border-yellow-500/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}</span>
                      {bubble.title && <h4 className="text-white font-medium text-sm">{bubble.title}</h4>}
                    </div>
                    <span className="text-[10px] text-yellow-400">❤️ {bubble.likes?.length || 0}</span>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-2">{bubble.content}</p>
                </div>
              ))
            ))}

          {/* Aba: Recentes */}
          {activeTab === 'recentes' &&
            (loadingBubbles ? (
              <div className="text-center py-12 text-slate-500 animate-pulse">⏳ Carregando...</div>
            ) : recentBubbles.length === 0 ? (
              <div className="text-center py-12 text-slate-500 rounded-2xl bg-slate-900/30">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm">Nenhuma bolha criada ainda</p>
                <p className="text-xs mt-1">Crie sua primeira bolha!</p>
              </div>
            ) : (
              recentBubbles.slice(0, 10).map((bubble, idx) => (
                <div
                  key={bubble._id}
                  onClick={() => navigate(`/bubble/${bubble._id}`)}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/50 hover:border-cyan-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    {bubble.title && <h4 className="text-white font-medium text-sm line-clamp-1">{bubble.title}</h4>}
                    <span className="text-[10px] text-cyan-400">#{idx + 1}</span>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-2">{bubble.content}</p>
                  <div className="mt-2 text-[10px] text-slate-500">
                    {new Date(bubble.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ))}
        </div>
      </div>

      {/* ============================================================
          MODAL: EDITAR PERFIL
          ============================================================ */}
      {editProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">✏️ Editar perfil</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">🖼️ Capa</label>
                <button
                  onClick={() => { setEditProfileModal(false); setEditCoverModal(true); }}
                  className="w-full py-2 rounded-xl bg-slate-800/80 text-cyan-400 text-sm hover:bg-slate-700 transition"
                >
                  Alterar capa
                </button>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">📷 Foto de perfil</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl bg-slate-800/80 text-cyan-400 text-sm hover:bg-slate-700 transition"
                >
                  Alterar foto
                </button>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">👤 Nome de usuário</label>
                <input type="text" value={user.username} disabled className="w-full rounded-xl bg-slate-800/50 border border-slate-700 px-4 py-2 text-slate-500 text-sm cursor-not-allowed" />
                <p className="text-[10px] text-slate-500 mt-1">Nome de usuário não pode ser alterado</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">📝 Bio</label>
                <textarea value={bioText} onChange={(e) => setBioText(e.target.value.slice(0, 150))} maxLength={150} rows={3} placeholder="Conte algo sobre você..." className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500 resize-none" />
                <div className="text-right text-[10px] text-slate-500 mt-1">{bioText.length}/150</div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditProfileModal(false)} className="flex-1 rounded-2xl border border-slate-700 py-2 text-slate-300 hover:bg-slate-800 transition">Cancelar</button>
              <button onClick={handleSaveProfile} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-lime-500 text-black font-bold py-2 hover:shadow-lg transition">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: EDITAR CAPA
          ============================================================ */}
      {editCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">🖼️ Editar capa</h2>
            <div className="space-y-4">
              <button onClick={() => coverInputRef.current?.click()} className="w-full py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-cyan-400 font-medium hover:bg-slate-700 transition">
                📁 Upload de arquivo
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-slate-900 px-2 text-slate-500">ou</span></div>
              </div>
              <input type="text" value={coverUrlInput} onChange={(e) => setCoverUrlInput(e.target.value)} placeholder="Cole a URL da imagem" className="w-full rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500" />
              <button onClick={handleCoverUrlSave} disabled={uploading} className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-lime-500 text-black font-bold hover:shadow-lg transition disabled:opacity-50">
                {uploading ? 'Salvando...' : 'Salvar capa'}
              </button>
            </div>
            <button onClick={() => setEditCoverModal(false)} className="mt-4 w-full text-sm text-slate-500 hover:text-slate-400 transition">Cancelar</button>
          </div>
        </div>
      )}
    </BubbleHUD>
  );
}
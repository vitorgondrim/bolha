// ============================================================
// CONTEXTO: AUTENTICAÇÃO
// Provedor global de autenticação e estado do usuário.
// 
// Responsabilidades:
//   - Gerenciar estado do usuário (login, logout, registro)
//   - Conectar/desconectar Socket.IO
//   - Contador de notificações não lidas
//   - Toast de notificações em tempo real
//   - Persistir sessão no localStorage
//   - Verificar autenticação ao carregar a página (cookie httpOnly)
//
// Fluxo de autenticação:
//   1. Ao carregar: tenta GET /users/me (cookie é enviado automaticamente)
//   2. Se sucesso: usuário está logado → popula o estado
//   3. Se falha: usuário não está logado → limpa o estado
//   4. Login/Registro: POST /auth/login ou /auth/register → seta cookie + estado
//   5. Logout: POST /auth/logout → limpa cookie + estado + socket
// ============================================================

/* eslint-disable react-refresh/only-export-components */
import { 
  createContext, 
  useState, 
  useCallback, 
  useMemo, 
  useEffect, 
  useRef 
} from 'react';
import api, { API_BASE_URL } from '../services/api';
import io from 'socket.io-client';

// ============================================================
// CRIAÇÃO DO CONTEXTO
// ============================================================
export const AuthContext = createContext({});

// ============================================================
// PROVIDER
// ============================================================
export function AuthProvider({ children }) {
  // ============================================================
  // ESTADO
  // ============================================================
  
  // Usuário logado (inicializa do localStorage para evitar flicker)
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('@Bolha:user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotification, setNewNotification] = useState(null);
  const [loading, setLoading] = useState(true);

    // ============================================================
  // REFS
  // Evita chamadas duplicadas à API durante o Strict Mode.
  // ============================================================
  const hasFetchedProfile = useRef(false);
  const socketRef = useRef(null);
  const lastUserIdRef = useRef(null);

  // ============================================================
  // VERIFICAR AUTENTICAÇÃO AO CARREGAR
  // 
  // Tenta buscar o perfil do usuário via GET /users/me.
  // O cookie httpOnly com o JWT é enviado automaticamente.
  // Se falhar (401), o usuário não está logado.
  // 
  // forceRecheck: usado para revalidar após login/logout.
  // ============================================================
  const checkAuthAndFetchUser = useCallback(async (forceRecheck = false) => {
    if (hasFetchedProfile.current && !forceRecheck) return;
    hasFetchedProfile.current = true;

    try {
      setLoading(true);

      const res = await api.get('/users/me');
      const fullUser = res.data.user;

      // Mapeia campos do backend para o formato do frontend
      const updatedUser = {
        id: fullUser._id,
        _id: fullUser._id,
        username: fullUser.username,
        email: fullUser.email,
        avatarUrl: fullUser.avatarUrl,
        coverUrl: fullUser.coverUrl,
        bio: fullUser.bio,
        dailySoprosUsed: fullUser.dailySoprosUsed,
        bubblesCreated: fullUser.bubblesCreated,
        leaksCount: fullUser.leaksCount,
        soprosGiven: fullUser.soprosGiven,
        followerCount: fullUser.followerCount,
        followingCount: fullUser.followingCount,
      };

      localStorage.setItem('@Bolha:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch {
      // Usuário não autenticado (401) ou erro de rede
      setUser(null);
      localStorage.removeItem('@Bolha:user');
    } finally {
      setLoading(false);
    }
  }, []);

  // Executa a verificação uma vez ao montar o provider
  useEffect(() => {
    checkAuthAndFetchUser();
  }, [checkAuthAndFetchUser]);

  // ============================================================
  // BUSCAR PERFIL COMPLETO (FORÇADO)
  // Usado após atualizações de perfil (bio, avatar, etc).
  // ============================================================
  const fetchFullUserProfile = useCallback(async () => {
    if (!user?.id && !user?._id) return;
    try {
      const res = await api.get('/users/me');
      const fullUser = res.data.user;

      const updatedUser = {
        id: fullUser._id,
        _id: fullUser._id,
        username: fullUser.username,
        email: fullUser.email,
        avatarUrl: fullUser.avatarUrl,
        coverUrl: fullUser.coverUrl,
        bio: fullUser.bio,
        dailySoprosUsed: fullUser.dailySoprosUsed,
        bubblesCreated: fullUser.bubblesCreated,
        leaksCount: fullUser.leaksCount,
        soprosGiven: fullUser.soprosGiven,
        followerCount: fullUser.followerCount,
        followingCount: fullUser.followingCount,
      };

      localStorage.setItem('@Bolha:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error('Erro ao buscar perfil completo:', err);
    }
  }, [user?.id, user?._id]);

  // ============================================================
  // CONTADOR DE NOTIFICAÇÕES NÃO LIDAS
  // ============================================================
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Erro ao buscar contagem:', err);
    }
  }, [user]);

  // ============================================================
  // SINCRONIZAR PERFIL APÓS LOGIN
  // Quando o usuário muda (login/logout), busca o perfil completo.
  // ============================================================
  useEffect(() => {
    if (user && !hasFetchedProfile.current) {
      hasFetchedProfile.current = true;
      fetchFullUserProfile();
    }
    if (!user) {
      hasFetchedProfile.current = false;
    }
  }, [user, fetchFullUserProfile]);

    // ============================================================
  // CONEXÃO SOCKET.IO
  // 
  // Conecta/desconecta com base no usuário logado.
  // Reconecta se o usuário mudar (troca de conta).
  // Usa socketRef para acesso seguro ao socket atual.
  // 
  // Eventos:
  //   - join_user_canvas: entra na sala pessoal (notificações)
  //   - new_notification: recebe notificação em tempo real
  //   - connect_error: loga erro de conexão
  //   - disconnect: loga desconexão
  // ============================================================
  useEffect(() => {
    const userId = user?.id || user?._id;

    // Se não tem usuário, desconecta se estiver conectado
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setUnreadCount(0);
      }
      lastUserIdRef.current = null;
      return;
    }

    // Se o usuário é o mesmo e já tem socket conectado, não faz nada
    if (userId === lastUserIdRef.current && socketRef.current?.connected) {
      return;
    }

    // Se mudou de usuário (troca de conta), desconecta o anterior
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    lastUserIdRef.current = userId;

    // Conecta novo socket
    const socketUrl = API_BASE_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
    });

    // Entra na sala pessoal para receber notificações
    newSocket.on('connect', () => {
      newSocket.emit('join_user_canvas', userId);
      console.log(`🔌 Socket conectado: ${newSocket.id} (usuário: ${userId})`);
    });

    // Listener: nova notificação
    newSocket.on('new_notification', (notification) => {
      setNewNotification(notification);
      setUnreadCount((prev) => prev + 1);
    });

    // Listener: erro de conexão
    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro ao conectar socket:', error.message);
    });

    // Listener: desconexão
    newSocket.on('disconnect', () => {
      console.warn('⚠️ Socket desconectado');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    fetchUnreadCount();

    // Cleanup: desconecta ao desmontar o componente
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user, fetchUnreadCount]);

  // ============================================================
  // AUTO-LIMPEZA DO TOAST
  // A notificação toast desaparece após 5 segundos.
  // ============================================================
  useEffect(() => {
    if (newNotification) {
      const timer = setTimeout(() => setNewNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [newNotification]);

  // ============================================================
  // AÇÕES DE AUTENTICAÇÃO
  // ============================================================

  /**
   * LOGIN
   * Envia credenciais para o backend.
   * O backend seta o cookie httpOnly com o JWT.
   * Armazena dados básicos no localStorage para UI imediata.
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: loggedUser } = response.data;

      localStorage.setItem('@Bolha:user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro no login',
      };
    }
  }, []);

  /**
   * REGISTRO
   * Cria uma nova conta.
   * O backend seta o cookie httpOnly automaticamente.
   */
  const register = useCallback(async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { user: newUser } = response.data;

      localStorage.setItem('@Bolha:user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.errors?.[0] ||
          'Erro no cadastro',
      };
    }
  }, []);

  /**
   * LOGOUT
   * Chama o backend para limpar os cookies.
   * Remove dados locais e desconecta o socket.
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Erro no logout:', err);
    }
        localStorage.removeItem('@Bolha:user');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setUser(null);
    setSocket(null);
    setUnreadCount(0);
    setNewNotification(null);
  }, []);

  /**
   * AUTHENTICATE (GOOGLE OAUTH)
   * Usado após o callback do Google para setar o usuário.
   */
  const authenticate = useCallback((token, authenticatedUser) => {
    localStorage.setItem('@Bolha:user', JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  }, []);

  /**
   * REFRESH USER
   * Força a atualização dos dados do perfil.
   */
  const refreshUser = useCallback(async () => {
    await fetchFullUserProfile();
  }, [fetchFullUserProfile]);

  // ============================================================
  // VALOR DO CONTEXTO (MEMOIZADO)
  // Só recalcula quando as dependências mudam.
  // ============================================================
  const value = useMemo(
    () => ({
      signed: !!user,
      user,
      loading,
      login,
      register,
      logout,
      authenticate,
      refreshUser,
      revalidateAuth: () => checkAuthAndFetchUser(true),
      socket,
      unreadCount,
      newNotification,
      refreshUnreadCount: fetchUnreadCount,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      authenticate,
      refreshUser,
      socket,
      unreadCount,
      newNotification,
      fetchUnreadCount,
      checkAuthAndFetchUser,
    ]
  );

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
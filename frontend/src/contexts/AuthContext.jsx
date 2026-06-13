import { 
  createContext, 
  useState, 
  useCallback, 
  useMemo, 
  useEffect, 
  useRef,
  useContext 
} from 'react';
import api from '../services/api';
import io from 'socket.io-client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('@Bolha:user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotification, setNewNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const isInitializing = useRef(true);

  // Helper para padronizar o objeto usuário
  const formatUser = (fullUser) => ({
    id: fullUser._id,
    _id: fullUser._id,
    username: fullUser.username,
    email: fullUser.email,
    avatarUrl: fullUser.avatarUrl,
    coverUrl: fullUser.coverUrl,
    bio: fullUser.bio,
    dailySoprosUsed: fullUser.dailySoprosUsed || 0,
    bubblesCreated: fullUser.totalBubblesCreated || 0,
    leaksCount: fullUser.timesLeaked || 0,
    soprosGiven: fullUser.totalSoprosGiven || 0,
    followerCount: fullUser.followerCount || 0,
    followingCount: fullUser.followingCount || 0,
    createdAt: fullUser.createdAt,
  });

  const fetchProfile = useCallback(async () => {
    try {
      // Sinaliza para o interceptor que esta requisição NÃO deve tentar refresh token
      const { data } = await api.get('/users/me', { skipAuthRedirect: true });
      const updatedUser = formatUser(data.user);
      localStorage.setItem('@Bolha:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setUser(null);
      localStorage.removeItem('@Bolha:user');
      // Sessão expirada — usuário será redirecionado para login
      throw err;
    } finally {
      setLoading(false);
      isInitializing.current = false;
    }
  }, []);

  // ============================================================
  // FUNÇÃO: revalidateAuth (para GoogleAuthCallback)
  // ============================================================
  const revalidateAuth = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me');
      const userData = formatUser(data.user);
      localStorage.setItem('@Bolha:user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      setUser(null);
      localStorage.removeItem('@Bolha:user');
      throw err;
    }
  }, []);

  // ============================================================
  // FUNÇÃO: authenticate (para Profile.jsx)
  // ============================================================
  const authenticate = useCallback((userData) => {
    if (!userData) {
      setUser(null);
      localStorage.removeItem('@Bolha:user');
      return;
    }
    const formatted = formatUser(userData);
    localStorage.setItem('@Bolha:user', JSON.stringify(formatted));
    setUser(formatted);
  }, []);

  // ============================================================
  // FUNÇÃO: refreshUnreadCount (para Notifications.jsx)
  // ============================================================
  const refreshUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/count');
      setUnreadCount(data.count);
      return data.count;
    } catch (err) {
      // Erro silenciado — contagem ficará como 0
      return 0;
    }
  }, []);

  // ============================================================
  // FUNÇÃO: register (para Login.jsx)
  // ============================================================
  const register = useCallback(async (username, email, password) => {
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      const userData = formatUser(data.user);
      localStorage.setItem('@Bolha:user', JSON.stringify(userData));
      setUser(userData);
      await refreshUnreadCount();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registro falhou' 
      };
    }
  }, [refreshUnreadCount]);

  // ============================================================
  // FUNÇÃO: login
  // ============================================================
  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const userData = formatUser(data.user);
      localStorage.setItem('@Bolha:user', JSON.stringify(userData));
      setUser(userData);
      await refreshUnreadCount();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login falhou' 
      };
    }
  }, [refreshUnreadCount]);

  // ============================================================
  // FUNÇÃO: logout
  // ============================================================
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('@Bolha:user');
      setUser(null);
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, []);

  // ============================================================
  // REFRESH USER (sinônimo de fetchProfile)
  // ============================================================
  const refreshUser = useCallback(async () => {
    return fetchProfile();
  }, [fetchProfile]);

  // Inicialização única
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Buscar contagem inicial de notificações quando usuário logar
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
    }
  }, [user, refreshUnreadCount]);

  // Gerenciamento de Socket
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      return;
    }

    if (!socketRef.current) {
      const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
      const newSocket = io(API_URL, {
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        newSocket.emit('join_user_canvas', user.id);
      });

      newSocket.on('new_notification', (notification) => {
        setNewNotification(notification);
        setUnreadCount((prev) => prev + 1);
      });

      newSocket.on('disconnect', () => {
        // Socket desconectado
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    signed: !!user,
    login,
    register,
    logout,
    refreshUser,
    revalidateAuth,
    authenticate,
    fetchProfile,
    refreshUnreadCount,
    socket,
    unreadCount,
    newNotification
  }), [user, loading, login, register, logout, refreshUser, revalidateAuth, authenticate, fetchProfile, refreshUnreadCount, socket, unreadCount, newNotification]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
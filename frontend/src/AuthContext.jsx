import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('deepreader_auth');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('deepreader_auth'); }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((data) => {
    setUser(data);
    if (data) localStorage.setItem('deepreader_auth', JSON.stringify(data));
    else localStorage.removeItem('deepreader_auth');
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    persist(res);
    return res;
  }, [persist]);

  const register = useCallback(async (email, password) => {
    const res = await authApi.register(email, password);
    persist(res);
    return res;
  }, [persist]);

  const logout = useCallback(async () => {
    if (user?.refreshToken) {
      try { await authApi.logout(user.refreshToken); } catch { /* ignore */ }
    }
    persist(null);
  }, [user, persist]);

  const value = { user, loading, login, register, logout, token: user?.token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

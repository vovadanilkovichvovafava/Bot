import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const DEMO_USER = {
    id: 0,
    email: 'demo@aibettingbot.com',
    username: 'Demo User',
    language: 'en',
    timezone: 'UTC',
    is_premium: false,
    daily_requests: 0,
    daily_limit: 10,
    bonus_predictions: 3,
    min_odds: 1.5,
    max_odds: 3.0,
    risk_level: 'medium',
    total_predictions: 0,
    correct_predictions: 0,
    accuracy: 0.0,
    created_at: new Date().toISOString(),
  };

  const checkAuth = useCallback(async () => {
    const token = api.getToken();
    const demoMode = localStorage.getItem('demo_mode');

    if (demoMode === 'true') {
      setIsDemo(true);
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) {
      api.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    await api.login(email, password);
    const userData = await api.getMe();
    setUser(userData);
    setIsDemo(false);
    localStorage.removeItem('demo_mode');
    return userData;
  };

  const register = async (email, password, username) => {
    await api.register(email, password, username);
    const userData = await api.getMe();
    setUser(userData);
    setIsDemo(false);
    localStorage.removeItem('demo_mode');
    return userData;
  };

  const enterDemo = () => {
    localStorage.setItem('demo_mode', 'true');
    setIsDemo(true);
    setUser(DEMO_USER);
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem('demo_mode');
    setUser(null);
    setIsDemo(false);
  };

  const refreshUser = async () => {
    if (isDemo) return;
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isDemo,
      login, register, logout, enterDemo, refreshUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

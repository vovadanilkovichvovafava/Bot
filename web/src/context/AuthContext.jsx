import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const BOOKMAKER_STORAGE_KEY = 'bookmaker_credentials';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmakerAccount, setBookmakerAccount] = useState(() => {
    const stored = localStorage.getItem(BOOKMAKER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [bookmakerBalance, setBookmakerBalance] = useState(null);

  const checkAuth = useCallback(async () => {
    const token = api.getToken();

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
    return userData;
  };

  const register = async (email, password, username) => {
    await api.register(email, password, username);
    const userData = await api.getMe();
    setUser(userData);
    return userData;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) { /* ignore */ }
  };

  // For testing: toggle premium status locally
  const togglePremium = () => {
    if (user) {
      setUser({ ...user, is_premium: !user.is_premium });
    }
  };

  // Bookmaker account management
  const connectBookmaker = async (login, password) => {
    const credentials = { login, password, connectedAt: new Date().toISOString() };
    localStorage.setItem(BOOKMAKER_STORAGE_KEY, JSON.stringify(credentials));
    setBookmakerAccount(credentials);
    // TODO: Call backend to sync balance
    // For now, simulate a balance
    setBookmakerBalance({ amount: 0, currency: 'USD', lastSync: new Date().toISOString() });
    return credentials;
  };

  const disconnectBookmaker = () => {
    localStorage.removeItem(BOOKMAKER_STORAGE_KEY);
    setBookmakerAccount(null);
    setBookmakerBalance(null);
  };

  const syncBookmakerBalance = async () => {
    if (!bookmakerAccount) return null;
    // TODO: Call backend API to fetch actual balance
    // For now, return simulated balance
    const balance = { amount: 0, currency: 'USD', lastSync: new Date().toISOString() };
    setBookmakerBalance(balance);
    return balance;
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout, refreshUser, togglePremium,
      isAuthenticated: !!user,
      // Bookmaker
      bookmakerAccount,
      bookmakerBalance,
      connectBookmaker,
      disconnectBookmaker,
      syncBookmakerBalance,
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

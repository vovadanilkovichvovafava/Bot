import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { loadFromBackend } from '../services/predictionStore';

const AuthContext = createContext(null);

const BOOKMAKER_STORAGE_KEY = 'bookmaker_credentials';

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmakerAccount, setBookmakerAccount] = useState(() => {
    try {
      const stored = safeGetItem(BOOKMAKER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [bookmakerBalance, setBookmakerBalance] = useState(null);

  const checkAuth = useCallback(async () => {
    const token = api.getToken();

    if (!token) {
      // No token — check by IP if account already exists
      try {
        const { exists } = await api.checkIp();
        if (exists) {
          safeSetItem('hasAccount', 'true');
        }
      } catch {
        // Network error — keep existing hasAccount flag as-is
      }
      setLoading(false);
      return;
    }

    // If user has a token, they had an account at some point
    safeSetItem('hasAccount', 'true');

    try {
      const userData = await api.getMe();
      setUser(userData);
      // Sync predictions from backend to localStorage
      loadFromBackend().catch(() => {});
    } catch (e) {
      api.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (phone, password) => {
    await api.login(phone, password);
    const userData = await api.getMe();
    setUser(userData);
    safeSetItem('hasAccount', 'true');
    safeSetItem('last_phone', phone);
    loadFromBackend().catch(() => {});
    return userData;
  };

  const register = async (phone, password, referralCode = null) => {
    await api.register(phone, password, referralCode);
    const userData = await api.getMe();
    setUser(userData);
    safeSetItem('hasAccount', 'true');
    safeSetItem('last_phone', phone);
    loadFromBackend().catch(() => {});
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
    safeSetItem(BOOKMAKER_STORAGE_KEY, JSON.stringify(credentials));
    setBookmakerAccount(credentials);
    // TODO: Call backend to sync balance
    // For now, simulate a balance
    setBookmakerBalance({ amount: 0, currency: 'USD', lastSync: new Date().toISOString() });
    return credentials;
  };

  const disconnectBookmaker = () => {
    safeRemoveItem(BOOKMAKER_STORAGE_KEY);
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

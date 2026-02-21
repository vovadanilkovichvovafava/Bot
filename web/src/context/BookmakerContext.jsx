import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import bookmakerApi from '../services/bookmakerApi';

const BookmakerContext = createContext(null);

export function BookmakerProvider({ children }) {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Check existing session
  const checkSession = async () => {
    if (!bookmakerApi.hasSession()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userData = await bookmakerApi.getUser();
      const balanceData = await bookmakerApi.getBalance();

      setUser(userData);
      setBalance(balanceData);
      setIsConnected(true);
    } catch (err) {
      // Session expired or invalid
      bookmakerApi.clearSession();
      setUser(null);
      setBalance(null);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Login to bookmaker
  const login = async (login, password, captchaResponse = null) => {
    setError(null);
    setLoading(true);

    try {
      const result = await bookmakerApi.login(login, password, captchaResponse);

      // Fetch user data after login
      const userData = await bookmakerApi.getUser();
      const balanceData = await bookmakerApi.getBalance();

      setUser(userData);
      setBalance(balanceData);
      setIsConnected(true);

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register at bookmaker
  const register = async (params) => {
    setError(null);
    setLoading(true);

    try {
      const result = await bookmakerApi.register(params);

      // Fetch user data after register
      const userData = await bookmakerApi.getUser();
      const balanceData = await bookmakerApi.getBalance();

      setUser(userData);
      setBalance(balanceData);
      setIsConnected(true);

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout from bookmaker
  const logout = async () => {
    try {
      await bookmakerApi.logout();
    } finally {
      setUser(null);
      setBalance(null);
      setIsConnected(false);
      setError(null);
    }
  };

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!isConnected) return null;

    try {
      const balanceData = await bookmakerApi.getBalance();
      setBalance(balanceData);
      return balanceData;
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      return null;
    }
  }, [isConnected]);

  // Place bet
  const placeBet = async ({ oddId, amount, currencyCode = 'EUR' }) => {
    if (!isConnected) {
      throw new Error('Not connected to bookmaker');
    }

    try {
      const result = await bookmakerApi.placeBet({ oddId, amount, currencyCode });

      // Refresh balance after bet
      await refreshBalance();

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Get bet history
  const getBetHistory = async (params = {}) => {
    if (!isConnected) {
      throw new Error('Not connected to bookmaker');
    }

    return bookmakerApi.getBetHistory(params);
  };

  // Cash out bet
  const cashoutBet = async (betId) => {
    if (!isConnected) {
      throw new Error('Not connected to bookmaker');
    }

    try {
      const result = await bookmakerApi.cashoutBet(betId);
      await refreshBalance();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    // State
    user,
    balance,
    loading,
    error,
    isConnected,

    // Actions
    login,
    register,
    logout,
    refreshBalance,
    placeBet,
    getBetHistory,
    cashoutBet,
    checkSession,

    // Clear error
    clearError: () => setError(null),
  };

  return (
    <BookmakerContext.Provider value={value}>
      {children}
    </BookmakerContext.Provider>
  );
}

export function useBookmaker() {
  const context = useContext(BookmakerContext);
  if (!context) {
    throw new Error('useBookmaker must be used within a BookmakerProvider');
  }
  return context;
}

export default BookmakerContext;

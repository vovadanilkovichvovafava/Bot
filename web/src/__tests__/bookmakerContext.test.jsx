import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { BookmakerProvider, useBookmaker } from '../features/betting/context/BookmakerContext';
import bookmakerApi from '../features/betting/api/bookmakerApi';

vi.mock('../features/betting/api/bookmakerApi', () => ({
  default: {
    hasSession: vi.fn(),
    getUser: vi.fn(),
    getBalance: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    placeBet: vi.fn(),
    getBetHistory: vi.fn(),
    cashoutBet: vi.fn(),
    clearSession: vi.fn(),
  },
}));

const wrapper = ({ children }) => <BookmakerProvider>{children}</BookmakerProvider>;

const mockUser = { id: 1, name: 'TestUser', email: 'test@example.com' };
const mockBalance = { amount: 100, currency: 'EUR' };

/**
 * Helper: set up mocks so the initial checkSession on mount resolves
 * with no active session (the most common default for tests).
 */
function mockNoSession() {
  bookmakerApi.hasSession.mockReturnValue(false);
}

/**
 * Helper: set up mocks so the initial checkSession on mount resolves
 * with an active session, user, and balance.
 */
function mockActiveSession() {
  bookmakerApi.hasSession.mockReturnValue(true);
  bookmakerApi.getUser.mockResolvedValue(mockUser);
  bookmakerApi.getBalance.mockResolvedValue(mockBalance);
}

/**
 * Render the hook and wait for the initial mount checkSession to finish.
 */
async function renderAndWait() {
  let result;
  await act(async () => {
    result = renderHook(() => useBookmaker(), { wrapper });
  });
  // Wait for loading to settle after initial checkSession
  await waitFor(() => {
    expect(result.result.current.loading).toBe(false);
  });
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// checkSession
// =============================================================================

describe('checkSession', () => {
  it('1. when hasSession() returns false, sets loading=false and isConnected=false', async () => {
    mockNoSession();

    const { result } = await renderAndWait();

    expect(bookmakerApi.hasSession).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.balance).toBeNull();
  });

  it('2. when hasSession() returns true and getUser+getBalance succeed, sets user/balance and isConnected=true', async () => {
    mockActiveSession();

    const { result } = await renderAndWait();

    expect(bookmakerApi.getUser).toHaveBeenCalled();
    expect(bookmakerApi.getBalance).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.balance).toEqual(mockBalance);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('3. when hasSession() returns true but getUser fails, clears session and isConnected=false', async () => {
    bookmakerApi.hasSession.mockReturnValue(true);
    bookmakerApi.getUser.mockRejectedValue(new Error('Session expired'));

    const { result } = await renderAndWait();

    expect(bookmakerApi.clearSession).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});

// =============================================================================
// login
// =============================================================================

describe('login', () => {
  it('4. successful login calls bookmakerApi.login, getUser, getBalance and sets state', async () => {
    mockNoSession();

    const loginResult = { success: true, sessionId: 'abc123' };
    bookmakerApi.login.mockResolvedValue(loginResult);
    bookmakerApi.getUser.mockResolvedValue(mockUser);
    bookmakerApi.getBalance.mockResolvedValue(mockBalance);

    const { result } = await renderAndWait();

    let returnedResult;
    await act(async () => {
      returnedResult = await result.current.login('user@test.com', 'password123');
    });

    expect(bookmakerApi.login).toHaveBeenCalledWith('user@test.com', 'password123', null);
    expect(bookmakerApi.getUser).toHaveBeenCalled();
    expect(bookmakerApi.getBalance).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.balance).toEqual(mockBalance);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(returnedResult).toEqual(loginResult);
  });

  it('5. failed login sets error, throws, and isConnected stays false', async () => {
    mockNoSession();

    const loginError = new Error('Invalid credentials');
    bookmakerApi.login.mockRejectedValue(loginError);

    const { result } = await renderAndWait();

    let thrownError;
    await act(async () => {
      try {
        await result.current.login('bad@test.com', 'wrong');
      } catch (err) {
        thrownError = err;
      }
    });

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toBe('Invalid credentials');
    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

// =============================================================================
// register
// =============================================================================

describe('register', () => {
  it('6. successful register calls bookmakerApi.register, getUser, getBalance and sets state', async () => {
    mockNoSession();

    const registerParams = { email: 'new@test.com', password: 'pass123', currency: 'EUR' };
    const registerResult = { success: true };
    bookmakerApi.register.mockResolvedValue(registerResult);
    bookmakerApi.getUser.mockResolvedValue(mockUser);
    bookmakerApi.getBalance.mockResolvedValue(mockBalance);

    const { result } = await renderAndWait();

    let returnedResult;
    await act(async () => {
      returnedResult = await result.current.register(registerParams);
    });

    expect(bookmakerApi.register).toHaveBeenCalledWith(registerParams);
    expect(bookmakerApi.getUser).toHaveBeenCalled();
    expect(bookmakerApi.getBalance).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.balance).toEqual(mockBalance);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(returnedResult).toEqual(registerResult);
  });

  it('7. failed register sets error and throws', async () => {
    mockNoSession();

    const registerError = new Error('Email already exists');
    bookmakerApi.register.mockRejectedValue(registerError);

    const { result } = await renderAndWait();

    let thrownError;
    await act(async () => {
      try {
        await result.current.register({ email: 'dup@test.com', password: 'pass' });
      } catch (err) {
        thrownError = err;
      }
    });

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toBe('Email already exists');
    expect(result.current.error).toBe('Email already exists');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});

// =============================================================================
// logout
// =============================================================================

describe('logout', () => {
  it('8. calls bookmakerApi.logout and clears user, balance, isConnected, error', async () => {
    mockActiveSession();
    bookmakerApi.logout.mockResolvedValue(undefined);

    const { result } = await renderAndWait();

    // Verify we start connected
    expect(result.current.isConnected).toBe(true);
    expect(result.current.user).toEqual(mockUser);

    await act(async () => {
      await result.current.logout();
    });

    expect(bookmakerApi.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

// =============================================================================
// refreshBalance
// =============================================================================

describe('refreshBalance', () => {
  it('9. when connected, calls getBalance and updates balance state', async () => {
    mockActiveSession();

    const { result } = await renderAndWait();

    const newBalance = { amount: 200, currency: 'EUR' };
    bookmakerApi.getBalance.mockResolvedValue(newBalance);

    let returnedBalance;
    await act(async () => {
      returnedBalance = await result.current.refreshBalance();
    });

    expect(bookmakerApi.getBalance).toHaveBeenCalled();
    expect(result.current.balance).toEqual(newBalance);
    expect(returnedBalance).toEqual(newBalance);
  });

  it('10. when NOT connected, returns null without calling API', async () => {
    mockNoSession();

    const { result } = await renderAndWait();

    // Clear any prior calls from mount
    bookmakerApi.getBalance.mockClear();

    let returnedBalance;
    await act(async () => {
      returnedBalance = await result.current.refreshBalance();
    });

    expect(bookmakerApi.getBalance).not.toHaveBeenCalled();
    expect(returnedBalance).toBeNull();
  });
});

// =============================================================================
// placeBet
// =============================================================================

describe('placeBet', () => {
  it('11. when connected, calls bookmakerApi.placeBet then refreshBalance', async () => {
    mockActiveSession();

    const { result } = await renderAndWait();

    const betParams = { oddId: 'odd-123', amount: 10, currencyCode: 'EUR' };
    const betResult = { betId: 'bet-456', status: 'placed' };
    const updatedBalance = { amount: 90, currency: 'EUR' };

    bookmakerApi.placeBet.mockResolvedValue(betResult);
    bookmakerApi.getBalance.mockResolvedValue(updatedBalance);

    let returnedResult;
    await act(async () => {
      returnedResult = await result.current.placeBet(betParams);
    });

    expect(bookmakerApi.placeBet).toHaveBeenCalledWith(betParams);
    expect(bookmakerApi.getBalance).toHaveBeenCalled();
    expect(result.current.balance).toEqual(updatedBalance);
    expect(returnedResult).toEqual(betResult);
  });

  it('12. when NOT connected, throws "Not connected to bookmaker"', async () => {
    mockNoSession();

    const { result } = await renderAndWait();

    await expect(
      act(async () => {
        await result.current.placeBet({ oddId: 'odd-1', amount: 5 });
      })
    ).rejects.toThrow('Not connected to bookmaker');
  });

  it('13. when placeBet fails, sets error and throws', async () => {
    mockActiveSession();

    const { result } = await renderAndWait();

    const betError = new Error('Insufficient balance');
    bookmakerApi.placeBet.mockRejectedValue(betError);

    let thrownError;
    await act(async () => {
      try {
        await result.current.placeBet({ oddId: 'odd-1', amount: 999 });
      } catch (err) {
        thrownError = err;
      }
    });

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toBe('Insufficient balance');
    expect(result.current.error).toBe('Insufficient balance');
  });
});

// =============================================================================
// getBetHistory
// =============================================================================

describe('getBetHistory', () => {
  it('14. when connected, calls bookmakerApi.getBetHistory and returns result', async () => {
    mockActiveSession();

    const { result } = await renderAndWait();

    const historyResult = [{ betId: 'bet-1' }, { betId: 'bet-2' }];
    bookmakerApi.getBetHistory.mockResolvedValue(historyResult);

    let returnedHistory;
    await act(async () => {
      returnedHistory = await result.current.getBetHistory({ page: 1 });
    });

    expect(bookmakerApi.getBetHistory).toHaveBeenCalledWith({ page: 1 });
    expect(returnedHistory).toEqual(historyResult);
  });

  it('15. when NOT connected, throws', async () => {
    mockNoSession();

    const { result } = await renderAndWait();

    await expect(
      act(async () => {
        await result.current.getBetHistory();
      })
    ).rejects.toThrow('Not connected to bookmaker');
  });
});

// =============================================================================
// cashoutBet
// =============================================================================

describe('cashoutBet', () => {
  it('16. when connected, calls bookmakerApi.cashoutBet then refreshBalance', async () => {
    mockActiveSession();

    const { result } = await renderAndWait();

    const cashoutResult = { success: true, amount: 50 };
    const updatedBalance = { amount: 150, currency: 'EUR' };

    bookmakerApi.cashoutBet.mockResolvedValue(cashoutResult);
    bookmakerApi.getBalance.mockResolvedValue(updatedBalance);

    let returnedResult;
    await act(async () => {
      returnedResult = await result.current.cashoutBet('bet-789');
    });

    expect(bookmakerApi.cashoutBet).toHaveBeenCalledWith('bet-789');
    expect(bookmakerApi.getBalance).toHaveBeenCalled();
    expect(result.current.balance).toEqual(updatedBalance);
    expect(returnedResult).toEqual(cashoutResult);
  });

  it('17. when NOT connected, throws', async () => {
    mockNoSession();

    const { result } = await renderAndWait();

    await expect(
      act(async () => {
        await result.current.cashoutBet('bet-789');
      })
    ).rejects.toThrow('Not connected to bookmaker');
  });
});

// =============================================================================
// clearError
// =============================================================================

describe('clearError', () => {
  it('18. clears error state to null', async () => {
    mockNoSession();

    bookmakerApi.login.mockRejectedValue(new Error('Some error'));

    const { result } = await renderAndWait();

    // Trigger an error via failed login
    await act(async () => {
      try {
        await result.current.login('user', 'pass');
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Some error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

// =============================================================================
// useBookmaker outside provider
// =============================================================================

describe('useBookmaker', () => {
  it('19. throws when used outside BookmakerProvider', () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBookmaker());
    }).toThrow('useBookmaker must be used within a BookmakerProvider');

    consoleSpy.mockRestore();
  });
});

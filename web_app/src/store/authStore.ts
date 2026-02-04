'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  user: User | null;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username?: string) => Promise<boolean>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

const createDemoUser = (): User => ({
  id: 0,
  email: 'demo@aibettingbot.com',
  username: 'Demo User',
  language: 'en',
  timezone: 'UTC',
  isPremium: true,
  premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  dailyRequests: 0,
  dailyLimit: 100,
  bonusPredictions: 10,
  minOdds: 1.5,
  maxOdds: 3.0,
  riskLevel: 'medium',
  totalPredictions: 150,
  correctPredictions: 105,
  accuracy: 70.0,
  createdAt: new Date().toISOString(),
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: true,
      isDemoMode: false,
      user: null,
      error: null,

      checkAuth: async () => {
        set({ isLoading: true });

        try {
          // Check if demo mode
          const isDemoMode = localStorage.getItem('demo_mode') === 'true';
          if (isDemoMode) {
            set({
              isAuthenticated: true,
              isDemoMode: true,
              user: createDemoUser(),
              isLoading: false,
            });
            return;
          }

          // Check if we have a token
          const token = localStorage.getItem('access_token');
          if (token) {
            api.setToken(token);
            try {
              const user = await api.getCurrentUser();
              set({
                isAuthenticated: true,
                user,
                isLoading: false,
              });
            } catch (e) {
              // Token invalid, clear it
              const errorMessage = e instanceof Error ? e.message : 'Unknown error';
              if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                api.clearToken();
                set({ isAuthenticated: false, user: null, isLoading: false });
              } else {
                // Network error - keep logged in with cached user
                const cachedUser = localStorage.getItem('user');
                if (cachedUser) {
                  set({
                    isAuthenticated: true,
                    user: JSON.parse(cachedUser),
                    isLoading: false,
                  });
                } else {
                  set({ isLoading: false });
                }
              }
            }
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { accessToken, refreshToken } = await api.login(email, password);

          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.removeItem('demo_mode');

          api.setToken(accessToken);
          const user = await api.getCurrentUser();

          localStorage.setItem('user', JSON.stringify(user));

          set({
            isAuthenticated: true,
            isDemoMode: false,
            user,
            isLoading: false,
          });

          return true;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Login failed';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      register: async (email: string, password: string, username?: string) => {
        set({ isLoading: true, error: null });

        try {
          const { accessToken, refreshToken } = await api.register(email, password, username);

          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.removeItem('demo_mode');

          api.setToken(accessToken);
          const user = await api.getCurrentUser();

          localStorage.setItem('user', JSON.stringify(user));

          set({
            isAuthenticated: true,
            isDemoMode: false,
            user,
            isLoading: false,
          });

          return true;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Registration failed';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      loginDemo: async () => {
        set({ isLoading: true, error: null });

        await new Promise(resolve => setTimeout(resolve, 500));
        localStorage.setItem('demo_mode', 'true');

        set({
          isAuthenticated: true,
          isDemoMode: true,
          user: createDemoUser(),
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('demo_mode');
        localStorage.removeItem('user');
        api.clearToken();

        set({
          isAuthenticated: false,
          isDemoMode: false,
          user: null,
          error: null,
        });
      },

      refreshUser: async () => {
        if (get().isDemoMode) return;

        try {
          const user = await api.getCurrentUser();
          localStorage.setItem('user', JSON.stringify(user));
          set({ user });
        } catch {
          // Ignore errors
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isDemoMode: state.isDemoMode,
        user: state.user,
      }),
    }
  )
);

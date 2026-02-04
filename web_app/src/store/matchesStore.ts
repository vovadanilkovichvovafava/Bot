'use client';

import { create } from 'zustand';
import { Match } from '@/types';
import { api } from '@/services/api';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEYS = {
  today: 'cache_today_matches',
  tomorrow: 'cache_tomorrow_matches',
  live: 'cache_live_matches',
  timestamp: 'cache_matches_timestamp',
};

interface MatchesState {
  todayMatches: Match[];
  tomorrowMatches: Match[];
  liveMatches: Match[];
  isLoading: boolean;
  isFromCache: boolean;
  isOffline: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  loadTodayMatches: (forceRefresh?: boolean) => Promise<void>;
  loadTomorrowMatches: (forceRefresh?: boolean) => Promise<void>;
  loadLiveMatches: () => Promise<void>;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

// Helper to load from localStorage cache
function loadFromCache(): { todayMatches: Match[]; tomorrowMatches: Match[]; timestamp: Date | null } {
  if (typeof window === 'undefined') {
    return { todayMatches: [], tomorrowMatches: [], timestamp: null };
  }

  try {
    const timestampStr = localStorage.getItem(CACHE_KEYS.timestamp);
    if (!timestampStr) return { todayMatches: [], tomorrowMatches: [], timestamp: null };

    const timestamp = new Date(timestampStr);
    const isExpired = Date.now() - timestamp.getTime() > CACHE_DURATION;

    if (isExpired) {
      return { todayMatches: [], tomorrowMatches: [], timestamp: null };
    }

    const todayJson = localStorage.getItem(CACHE_KEYS.today);
    const tomorrowJson = localStorage.getItem(CACHE_KEYS.tomorrow);

    return {
      todayMatches: todayJson ? JSON.parse(todayJson) : [],
      tomorrowMatches: tomorrowJson ? JSON.parse(tomorrowJson) : [],
      timestamp,
    };
  } catch {
    return { todayMatches: [], tomorrowMatches: [], timestamp: null };
  }
}

// Helper to save to localStorage cache
function saveToCache(todayMatches: Match[], tomorrowMatches: Match[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEYS.today, JSON.stringify(todayMatches));
    localStorage.setItem(CACHE_KEYS.tomorrow, JSON.stringify(tomorrowMatches));
    localStorage.setItem(CACHE_KEYS.timestamp, new Date().toISOString());
  } catch {
    // Ignore storage errors
  }
}

export const useMatchesStore = create<MatchesState>((set, get) => {
  // Load initial data from cache
  const cached = loadFromCache();

  return {
    todayMatches: cached.todayMatches,
    tomorrowMatches: cached.tomorrowMatches,
    liveMatches: [],
    isLoading: false,
    isFromCache: cached.todayMatches.length > 0 || cached.tomorrowMatches.length > 0,
    isOffline: false,
    error: null,
    lastUpdated: cached.timestamp,

    loadTodayMatches: async (forceRefresh = false) => {
      const state = get();

      // Skip if already loading
      if (state.isLoading) return;

      // Use cache if available and not forcing refresh
      if (!forceRefresh && state.todayMatches.length > 0 && state.isFromCache) {
        // Fetch in background to update
        api.getTodayMatches()
          .then(matches => {
            set({
              todayMatches: matches,
              isFromCache: false,
              isOffline: false,
              lastUpdated: new Date(),
            });
            saveToCache(matches, get().tomorrowMatches);
          })
          .catch(() => {
            set({ isOffline: true });
          });
        return;
      }

      set({ isLoading: true, error: null, isOffline: false });

      try {
        const matches = await api.getTodayMatches();
        set({
          todayMatches: matches,
          isLoading: false,
          isFromCache: false,
          isOffline: false,
          lastUpdated: new Date(),
        });
        saveToCache(matches, get().tomorrowMatches);
      } catch (e) {
        const hasData = get().todayMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    loadTomorrowMatches: async (forceRefresh = false) => {
      const state = get();

      if (state.isLoading) return;

      if (!forceRefresh && state.tomorrowMatches.length > 0 && state.isFromCache) {
        api.getTomorrowMatches()
          .then(matches => {
            set({
              tomorrowMatches: matches,
              isFromCache: false,
              isOffline: false,
              lastUpdated: new Date(),
            });
            saveToCache(get().todayMatches, matches);
          })
          .catch(() => {
            set({ isOffline: true });
          });
        return;
      }

      set({ isLoading: true, error: null, isOffline: false });

      try {
        const matches = await api.getTomorrowMatches();
        set({
          tomorrowMatches: matches,
          isLoading: false,
          isFromCache: false,
          isOffline: false,
          lastUpdated: new Date(),
        });
        saveToCache(get().todayMatches, matches);
      } catch (e) {
        const hasData = get().tomorrowMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    loadLiveMatches: async () => {
      try {
        const matches = await api.getLiveMatches();
        set({ liveMatches: matches });
      } catch {
        // Silent fail for live matches
      }
    },

    refresh: async () => {
      set({ isLoading: true, error: null, isOffline: false });

      try {
        const [todayMatches, tomorrowMatches, liveMatches] = await Promise.all([
          api.getTodayMatches(),
          api.getTomorrowMatches(),
          api.getLiveMatches(),
        ]);

        set({
          todayMatches,
          tomorrowMatches,
          liveMatches,
          isLoading: false,
          isFromCache: false,
          isOffline: false,
          lastUpdated: new Date(),
        });

        saveToCache(todayMatches, tomorrowMatches);
      } catch (e) {
        const hasData = get().todayMatches.length > 0 || get().tomorrowMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    clearCache: () => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(CACHE_KEYS.today);
      localStorage.removeItem(CACHE_KEYS.tomorrow);
      localStorage.removeItem(CACHE_KEYS.live);
      localStorage.removeItem(CACHE_KEYS.timestamp);
    },
  };
});

// Selectors
export const selectTodayMatches = (state: MatchesState) => state.todayMatches;
export const selectTomorrowMatches = (state: MatchesState) => state.tomorrowMatches;
export const selectLiveMatches = (state: MatchesState) => state.liveMatches;
export const selectIsLoading = (state: MatchesState) => state.isLoading;
export const selectIsOffline = (state: MatchesState) => state.isOffline;

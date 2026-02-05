'use client';

import { create } from 'zustand';
import { Match } from '@/types';
import { api } from '@/services/api';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEYS = {
  currentRound: 'cache_current_round_matches',
  nextRound: 'cache_next_round_matches',
  dateToday: 'cache_date_today_matches',
  dateTomorrow: 'cache_date_tomorrow_matches',
  live: 'cache_live_matches',
  timestamp: 'cache_matches_timestamp',
};

interface MatchesState {
  // Round-based (full matchday)
  currentRoundMatches: Match[];
  nextRoundMatches: Match[];
  // Date-based (specific day)
  dateTodayMatches: Match[];
  dateTomorrowMatches: Match[];
  // Live
  liveMatches: Match[];
  // Status
  isLoading: boolean;
  isFromCache: boolean;
  isOffline: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Legacy aliases for compatibility
  todayMatches: Match[];
  tomorrowMatches: Match[];

  // Actions
  loadCurrentRound: (forceRefresh?: boolean) => Promise<void>;
  loadNextRound: (forceRefresh?: boolean) => Promise<void>;
  loadDateToday: (forceRefresh?: boolean) => Promise<void>;
  loadDateTomorrow: (forceRefresh?: boolean) => Promise<void>;
  loadLiveMatches: () => Promise<void>;
  refresh: () => Promise<void>;
  clearCache: () => void;

  // Legacy aliases
  loadTodayMatches: (forceRefresh?: boolean) => Promise<void>;
  loadTomorrowMatches: (forceRefresh?: boolean) => Promise<void>;
}

// Helper to load from localStorage cache
function loadFromCache() {
  if (typeof window === 'undefined') {
    return {
      currentRoundMatches: [],
      nextRoundMatches: [],
      dateTodayMatches: [],
      dateTomorrowMatches: [],
      timestamp: null,
    };
  }

  try {
    const timestampStr = localStorage.getItem(CACHE_KEYS.timestamp);
    if (!timestampStr) return {
      currentRoundMatches: [],
      nextRoundMatches: [],
      dateTodayMatches: [],
      dateTomorrowMatches: [],
      timestamp: null,
    };

    const timestamp = new Date(timestampStr);
    const isExpired = Date.now() - timestamp.getTime() > CACHE_DURATION;

    if (isExpired) {
      return {
        currentRoundMatches: [],
        nextRoundMatches: [],
        dateTodayMatches: [],
        dateTomorrowMatches: [],
        timestamp: null,
      };
    }

    return {
      currentRoundMatches: JSON.parse(localStorage.getItem(CACHE_KEYS.currentRound) || '[]'),
      nextRoundMatches: JSON.parse(localStorage.getItem(CACHE_KEYS.nextRound) || '[]'),
      dateTodayMatches: JSON.parse(localStorage.getItem(CACHE_KEYS.dateToday) || '[]'),
      dateTomorrowMatches: JSON.parse(localStorage.getItem(CACHE_KEYS.dateTomorrow) || '[]'),
      timestamp,
    };
  } catch {
    return {
      currentRoundMatches: [],
      nextRoundMatches: [],
      dateTodayMatches: [],
      dateTomorrowMatches: [],
      timestamp: null,
    };
  }
}

// Helper to save to localStorage cache
function saveToCache(state: Partial<MatchesState>) {
  if (typeof window === 'undefined') return;

  try {
    if (state.currentRoundMatches) {
      localStorage.setItem(CACHE_KEYS.currentRound, JSON.stringify(state.currentRoundMatches));
    }
    if (state.nextRoundMatches) {
      localStorage.setItem(CACHE_KEYS.nextRound, JSON.stringify(state.nextRoundMatches));
    }
    if (state.dateTodayMatches) {
      localStorage.setItem(CACHE_KEYS.dateToday, JSON.stringify(state.dateTodayMatches));
    }
    if (state.dateTomorrowMatches) {
      localStorage.setItem(CACHE_KEYS.dateTomorrow, JSON.stringify(state.dateTomorrowMatches));
    }
    localStorage.setItem(CACHE_KEYS.timestamp, new Date().toISOString());
  } catch {
    // Ignore storage errors
  }
}

export const useMatchesStore = create<MatchesState>((set, get) => {
  // Load initial data from cache
  const cached = loadFromCache();
  const hasCache = cached.currentRoundMatches.length > 0 || cached.dateTodayMatches.length > 0;

  return {
    currentRoundMatches: cached.currentRoundMatches,
    nextRoundMatches: cached.nextRoundMatches,
    dateTodayMatches: cached.dateTodayMatches,
    dateTomorrowMatches: cached.dateTomorrowMatches,
    liveMatches: [],
    isLoading: false,
    isFromCache: hasCache,
    isOffline: false,
    error: null,
    lastUpdated: cached.timestamp,

    // Legacy aliases
    get todayMatches() { return get().currentRoundMatches; },
    get tomorrowMatches() { return get().nextRoundMatches; },

    loadCurrentRound: async (forceRefresh = false) => {
      const state = get();
      if (state.isLoading) return;

      if (!forceRefresh && state.currentRoundMatches.length > 0 && state.isFromCache) {
        api.getTodayMatches()
          .then(matches => {
            set({ currentRoundMatches: matches, isFromCache: false, isOffline: false, lastUpdated: new Date() });
            saveToCache({ currentRoundMatches: matches });
          })
          .catch(() => set({ isOffline: true }));
        return;
      }

      set({ isLoading: true, error: null, isOffline: false });

      try {
        const matches = await api.getTodayMatches();
        set({ currentRoundMatches: matches, isLoading: false, isFromCache: false, isOffline: false, lastUpdated: new Date() });
        saveToCache({ currentRoundMatches: matches });
      } catch (e) {
        const hasData = get().currentRoundMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    loadNextRound: async (forceRefresh = false) => {
      const state = get();
      if (state.isLoading) return;

      if (!forceRefresh && state.nextRoundMatches.length > 0 && state.isFromCache) {
        api.getTomorrowMatches()
          .then(matches => {
            set({ nextRoundMatches: matches, isFromCache: false, isOffline: false, lastUpdated: new Date() });
            saveToCache({ nextRoundMatches: matches });
          })
          .catch(() => set({ isOffline: true }));
        return;
      }

      set({ isLoading: true, error: null, isOffline: false });

      try {
        const matches = await api.getTomorrowMatches();
        set({ nextRoundMatches: matches, isLoading: false, isFromCache: false, isOffline: false, lastUpdated: new Date() });
        saveToCache({ nextRoundMatches: matches });
      } catch (e) {
        const hasData = get().nextRoundMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    loadDateToday: async (forceRefresh = false) => {
      const state = get();
      if (state.isLoading) return;

      if (!forceRefresh && state.dateTodayMatches.length > 0 && state.isFromCache) {
        api.getDateTodayMatches()
          .then(matches => {
            set({ dateTodayMatches: matches, isFromCache: false, isOffline: false, lastUpdated: new Date() });
            saveToCache({ dateTodayMatches: matches });
          })
          .catch(() => set({ isOffline: true }));
        return;
      }

      set({ isLoading: true, error: null, isOffline: false });

      try {
        const matches = await api.getDateTodayMatches();
        set({ dateTodayMatches: matches, isLoading: false, isFromCache: false, isOffline: false, lastUpdated: new Date() });
        saveToCache({ dateTodayMatches: matches });
      } catch (e) {
        const hasData = get().dateTodayMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    loadDateTomorrow: async (forceRefresh = false) => {
      const state = get();
      if (state.isLoading) return;

      if (!forceRefresh && state.dateTomorrowMatches.length > 0 && state.isFromCache) {
        api.getDateTomorrowMatches()
          .then(matches => {
            set({ dateTomorrowMatches: matches, isFromCache: false, isOffline: false, lastUpdated: new Date() });
            saveToCache({ dateTomorrowMatches: matches });
          })
          .catch(() => set({ isOffline: true }));
        return;
      }

      set({ isLoading: true, error: null, isOffline: false });

      try {
        const matches = await api.getDateTomorrowMatches();
        set({ dateTomorrowMatches: matches, isLoading: false, isFromCache: false, isOffline: false, lastUpdated: new Date() });
        saveToCache({ dateTomorrowMatches: matches });
      } catch (e) {
        const hasData = get().dateTomorrowMatches.length > 0;
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
        const [currentRound, nextRound, dateToday, dateTomorrow, live] = await Promise.all([
          api.getTodayMatches(),
          api.getTomorrowMatches(),
          api.getDateTodayMatches(),
          api.getDateTomorrowMatches(),
          api.getLiveMatches(),
        ]);

        set({
          currentRoundMatches: currentRound,
          nextRoundMatches: nextRound,
          dateTodayMatches: dateToday,
          dateTomorrowMatches: dateTomorrow,
          liveMatches: live,
          isLoading: false,
          isFromCache: false,
          isOffline: false,
          lastUpdated: new Date(),
        });

        saveToCache({
          currentRoundMatches: currentRound,
          nextRoundMatches: nextRound,
          dateTodayMatches: dateToday,
          dateTomorrowMatches: dateTomorrow,
        });
      } catch (e) {
        const hasData = get().currentRoundMatches.length > 0 || get().dateTodayMatches.length > 0;
        set({
          isLoading: false,
          isOffline: hasData,
          error: hasData ? null : (e instanceof Error ? e.message : 'Failed to load matches'),
        });
      }
    },

    clearCache: () => {
      if (typeof window === 'undefined') return;
      Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
    },

    // Legacy aliases
    loadTodayMatches: async (forceRefresh = false) => get().loadCurrentRound(forceRefresh),
    loadTomorrowMatches: async (forceRefresh = false) => get().loadNextRound(forceRefresh),
  };
});

// Selectors
export const selectCurrentRoundMatches = (state: MatchesState) => state.currentRoundMatches;
export const selectNextRoundMatches = (state: MatchesState) => state.nextRoundMatches;
export const selectDateTodayMatches = (state: MatchesState) => state.dateTodayMatches;
export const selectDateTomorrowMatches = (state: MatchesState) => state.dateTomorrowMatches;
export const selectLiveMatches = (state: MatchesState) => state.liveMatches;
export const selectIsLoading = (state: MatchesState) => state.isLoading;
export const selectIsOffline = (state: MatchesState) => state.isOffline;

// Legacy selectors
export const selectTodayMatches = selectCurrentRoundMatches;
export const selectTomorrowMatches = selectNextRoundMatches;

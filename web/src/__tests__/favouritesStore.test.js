import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage BEFORE any module imports.
// jsdom throws SecurityError when accessing localStorage directly.
let store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

import {
  addFavouriteTeam,
  removeFavouriteTeam,
  isTeamFavourite,
  toggleFavouriteTeam,
  addFavouriteLeague,
  removeFavouriteLeague,
  isLeagueFavourite,
  toggleFavouriteLeague,
  getFavouriteTeams,
  getFavouriteLeagues,
  getAllFavourites,
  isMatchFavourite,
  clearAll,
} from '../services/favouritesStore';

const teamA = { id: 1, name: 'Arsenal', logo: 'arsenal.png' };
const teamB = { id: 2, name: 'Barcelona', logo: 'barca.png' };
const teamC = { id: 3, name: 'Chelsea', logo: 'chelsea.png' };

const leagueA = { id: 100, name: 'Premier League', logo: 'pl.png', country: 'England', code: 'PL' };
const leagueB = { id: 200, name: 'La Liga', logo: 'll.png', country: 'Spain', code: 'LL' };

describe('favouritesStore', () => {
  beforeEach(() => {
    store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.key.mockClear();
    // Also clear module internal state by clearing localStorage and re-triggering reads
    clearAll();
  });

  // ── Teams ──────────────────────────────────────────────────────

  describe('addFavouriteTeam', () => {
    it('adds a team to an empty favourites list', () => {
      const result = addFavouriteTeam(teamA);
      expect(result).toEqual([expect.objectContaining(teamA)]);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pva_favourites',
        expect.stringContaining('"teams"'),
      );
      const stored = JSON.parse(store['pva_favourites']);
      expect(stored.teams).toEqual([expect.objectContaining(teamA)]);
      expect(stored.leagues).toEqual([]);
    });

    it('does not add a duplicate team (same id)', () => {
      addFavouriteTeam(teamA);
      const result = addFavouriteTeam({ id: 1, name: 'Arsenal Updated', logo: 'new.png' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('adds multiple distinct teams', () => {
      addFavouriteTeam(teamA);
      const result = addFavouriteTeam(teamB);
      expect(result).toHaveLength(2);
      expect(result).toEqual([expect.objectContaining(teamA), expect.objectContaining(teamB)]);
    });
  });

  describe('removeFavouriteTeam', () => {
    it('removes a team by id and returns updated array', () => {
      addFavouriteTeam(teamA);
      addFavouriteTeam(teamB);
      const result = removeFavouriteTeam(teamA.id);
      expect(result).toEqual([expect.objectContaining(teamB)]);
    });

    it('returns empty array when removing the only team', () => {
      addFavouriteTeam(teamA);
      const result = removeFavouriteTeam(teamA.id);
      expect(result).toEqual([]);
    });

    it('handles removing a non-existent team id gracefully', () => {
      addFavouriteTeam(teamA);
      const result = removeFavouriteTeam(999);
      expect(result).toEqual([expect.objectContaining(teamA)]);
    });
  });

  describe('isTeamFavourite', () => {
    it('returns false when no favourites exist', () => {
      expect(isTeamFavourite(teamA.id)).toBe(false);
    });

    it('returns true for a team that has been added', () => {
      addFavouriteTeam(teamA);
      expect(isTeamFavourite(teamA.id)).toBe(true);
    });

    it('returns false for a team that has not been added', () => {
      addFavouriteTeam(teamA);
      expect(isTeamFavourite(teamB.id)).toBe(false);
    });
  });

  describe('toggleFavouriteTeam', () => {
    it('returns true when adding a team via toggle', () => {
      const result = toggleFavouriteTeam(teamA);
      expect(result).toBe(true);
      expect(isTeamFavourite(teamA.id)).toBe(true);
    });

    it('returns false when removing a team via toggle', () => {
      addFavouriteTeam(teamA);
      const result = toggleFavouriteTeam(teamA);
      expect(result).toBe(false);
      expect(isTeamFavourite(teamA.id)).toBe(false);
    });

    it('toggles back and forth correctly', () => {
      expect(toggleFavouriteTeam(teamA)).toBe(true);
      expect(toggleFavouriteTeam(teamA)).toBe(false);
      expect(toggleFavouriteTeam(teamA)).toBe(true);
      expect(isTeamFavourite(teamA.id)).toBe(true);
    });
  });

  // ── Leagues ────────────────────────────────────────────────────

  describe('addFavouriteLeague', () => {
    it('adds a league and persists it to localStorage', () => {
      addFavouriteLeague(leagueA);
      const stored = JSON.parse(store['pva_favourites']);
      expect(stored.leagues).toEqual([expect.objectContaining(leagueA)]);
    });

    it('does not add a duplicate league', () => {
      addFavouriteLeague(leagueA);
      addFavouriteLeague({ ...leagueA, name: 'PL Updated' });
      const leagues = getFavouriteLeagues();
      expect(leagues).toHaveLength(1);
    });
  });

  describe('removeFavouriteLeague', () => {
    it('removes a league by id', () => {
      addFavouriteLeague(leagueA);
      addFavouriteLeague(leagueB);
      removeFavouriteLeague(leagueA.id);
      expect(getFavouriteLeagues()).toEqual([expect.objectContaining(leagueB)]);
    });
  });

  describe('isLeagueFavourite', () => {
    it('returns true for an added league and false otherwise', () => {
      expect(isLeagueFavourite(leagueA.id)).toBe(false);
      addFavouriteLeague(leagueA);
      expect(isLeagueFavourite(leagueA.id)).toBe(true);
      expect(isLeagueFavourite(leagueB.id)).toBe(false);
    });
  });

  describe('toggleFavouriteLeague', () => {
    it('toggles a league on and off', () => {
      expect(toggleFavouriteLeague(leagueA)).toBe(true);
      expect(isLeagueFavourite(leagueA.id)).toBe(true);
      expect(toggleFavouriteLeague(leagueA)).toBe(false);
      expect(isLeagueFavourite(leagueA.id)).toBe(false);
    });
  });

  // ── Getters ────────────────────────────────────────────────────

  describe('getFavouriteTeams', () => {
    it('returns an empty array when no teams are stored', () => {
      expect(getFavouriteTeams()).toEqual([]);
    });

    it('returns all added teams', () => {
      addFavouriteTeam(teamA);
      addFavouriteTeam(teamB);
      expect(getFavouriteTeams()).toEqual([expect.objectContaining(teamA), expect.objectContaining(teamB)]);
    });
  });

  describe('getFavouriteLeagues', () => {
    it('returns an empty array when no leagues are stored', () => {
      expect(getFavouriteLeagues()).toEqual([]);
    });
  });

  describe('getAllFavourites', () => {
    it('returns an object with both teams and leagues', () => {
      addFavouriteTeam(teamA);
      addFavouriteLeague(leagueA);
      const result = getAllFavourites();
      expect(result).toEqual({
        teams: [expect.objectContaining(teamA)],
        leagues: [expect.objectContaining(leagueA)],
      });
    });

    it('returns empty arrays when nothing is stored', () => {
      const result = getAllFavourites();
      expect(result.teams).toEqual([]);
      expect(result.leagues).toEqual([]);
    });
  });

  // ── Match Favourite ────────────────────────────────────────────

  describe('isMatchFavourite', () => {
    it('returns false when neither team is a favourite', () => {
      expect(isMatchFavourite(teamA.id, teamB.id)).toBe(false);
    });

    it('returns true when the home team is a favourite', () => {
      addFavouriteTeam(teamA);
      expect(isMatchFavourite(teamA.id, teamB.id)).toBe(true);
    });

    it('returns true when the away team is a favourite', () => {
      addFavouriteTeam(teamB);
      expect(isMatchFavourite(teamA.id, teamB.id)).toBe(true);
    });

    it('returns true when both teams are favourites', () => {
      addFavouriteTeam(teamA);
      addFavouriteTeam(teamB);
      expect(isMatchFavourite(teamA.id, teamB.id)).toBe(true);
    });
  });

  // ── clearAll ───────────────────────────────────────────────────

  describe('clearAll', () => {
    it('removes all favourites from localStorage', () => {
      addFavouriteTeam(teamA);
      addFavouriteLeague(leagueA);
      clearAll();
      expect(getFavouriteTeams()).toEqual([]);
      expect(getFavouriteLeagues()).toEqual([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pva_favourites');
    });

    it('is safe to call when storage is already empty', () => {
      expect(() => clearAll()).not.toThrow();
      expect(getFavouriteTeams()).toEqual([]);
    });
  });
});

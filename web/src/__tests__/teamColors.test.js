import { describe, it, expect, vi } from 'vitest';
import {
  TEAM_COLORS,
  DEFAULT_HOME_COLOR,
  DEFAULT_AWAY_COLOR,
  getTeamColor,
  colorsSimilar,
  getMatchColors,
} from '../shared/utils/teamColors';

describe('TEAM_COLORS', () => {
  it('contains known team entries with primary, secondary, and name', () => {
    const arsenal = TEAM_COLORS[42];
    expect(arsenal).toBeDefined();
    expect(arsenal.primary).toBe('#EF0107');
    expect(arsenal).toHaveProperty('secondary');
    expect(arsenal).toHaveProperty('name');
  });

  it('includes all expected team IDs', () => {
    expect(TEAM_COLORS[42]).toBeDefined();  // Arsenal
    expect(TEAM_COLORS[49]).toBeDefined();  // Chelsea
    expect(TEAM_COLORS[40]).toBeDefined();  // Liverpool
    expect(TEAM_COLORS[50]).toBeDefined();  // Man City
    expect(TEAM_COLORS[157]).toBeDefined(); // Bayern
  });
});

describe('DEFAULT_HOME_COLOR / DEFAULT_AWAY_COLOR', () => {
  it('has the correct default hex values', () => {
    expect(DEFAULT_HOME_COLOR).toBe('#3B82F6');
    expect(DEFAULT_AWAY_COLOR).toBe('#EF4444');
  });
});

describe('getTeamColor', () => {
  it('returns the primary color for a known team when isAway is false', () => {
    expect(getTeamColor(42, false)).toBe('#EF0107'); // Arsenal primary
  });

  it('returns the secondary color for a known team when isAway is true', () => {
    const secondary = TEAM_COLORS[42].secondary;
    expect(getTeamColor(42, true)).toBe(secondary);
  });

  it('returns the primary color when isAway is not provided', () => {
    expect(getTeamColor(49)).toBe('#034694'); // Chelsea primary
  });

  it('returns DEFAULT_HOME_COLOR for an unknown team when isAway is false', () => {
    expect(getTeamColor(99999, false)).toBe(DEFAULT_HOME_COLOR);
  });

  it('returns DEFAULT_AWAY_COLOR for an unknown team when isAway is true', () => {
    expect(getTeamColor(99999, true)).toBe(DEFAULT_AWAY_COLOR);
  });

  it('returns a default for null/undefined teamId', () => {
    expect(getTeamColor(null, false)).toBe(DEFAULT_HOME_COLOR);
    expect(getTeamColor(undefined, true)).toBe(DEFAULT_AWAY_COLOR);
  });
});

describe('colorsSimilar', () => {
  it('returns true for identical colors', () => {
    expect(colorsSimilar('#FF0000', '#FF0000')).toBe(true);
  });

  it('returns true for very similar colors (RGB distance < 80)', () => {
    // #FF0000 vs #FF3000 — distance ~48, should be similar
    expect(colorsSimilar('#FF0000', '#FF3000')).toBe(true);
  });

  it('returns false for black vs white (max distance)', () => {
    expect(colorsSimilar('#000000', '#FFFFFF')).toBe(false);
  });

  it('returns false for clearly different colors', () => {
    // Red vs Blue — distance ~360
    expect(colorsSimilar('#FF0000', '#0000FF')).toBe(false);
  });

  it('handles lowercase hex strings', () => {
    expect(colorsSimilar('#ff0000', '#ff0000')).toBe(true);
  });
});

describe('getMatchColors', () => {
  it('returns primary colors when they are sufficiently different', () => {
    // Chelsea (#034694) vs Man City (#6CABDD) — different enough
    const result = getMatchColors(49, 50);
    expect(result.homeColor).toBe('#034694');
    expect(result.awayColor).toBe('#6CABDD');
  });

  it('uses secondary for away team when primaries are similar', () => {
    // Arsenal (#EF0107) vs Liverpool (#C8102E) — both red, likely similar
    const result = getMatchColors(42, 40);
    expect(result.homeColor).toBe('#EF0107');
    // Away should switch to Liverpool secondary since primaries clash
    expect(result.awayColor).not.toBe('#C8102E');
  });

  it('returns defaults for two unknown teams', () => {
    const result = getMatchColors(99998, 99999);
    expect(result.homeColor).toBe(DEFAULT_HOME_COLOR);
    expect(result.awayColor).toBe(DEFAULT_AWAY_COLOR);
  });

  it('returns an object with homeColor and awayColor keys', () => {
    const result = getMatchColors(42, 49);
    expect(result).toHaveProperty('homeColor');
    expect(result).toHaveProperty('awayColor');
    expect(result.homeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.awayColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('ensures home and away colors are not similar in the final result', () => {
    // Bayern (#DC052D) vs Arsenal (#EF0107) — both red, should resolve contrast
    const result = getMatchColors(157, 42);
    expect(colorsSimilar(result.homeColor, result.awayColor)).toBe(false);
  });
});

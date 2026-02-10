const STORAGE_KEY = 'pva_favourites';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"teams":[],"leagues":[]}');
  } catch {
    return { teams: [], leagues: [] };
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Add a team to favourites
 */
export function addFavouriteTeam(team) {
  const data = getAll();
  if (!data.teams.find(t => t.id === team.id)) {
    data.teams.push({
      id: team.id,
      name: team.name,
      logo: team.logo,
      addedAt: new Date().toISOString(),
    });
    saveAll(data);
  }
  return data.teams;
}

/**
 * Remove a team from favourites
 */
export function removeFavouriteTeam(teamId) {
  const data = getAll();
  data.teams = data.teams.filter(t => t.id !== teamId);
  saveAll(data);
  return data.teams;
}

/**
 * Check if team is favourite
 */
export function isTeamFavourite(teamId) {
  const data = getAll();
  return data.teams.some(t => t.id === teamId);
}

/**
 * Add a league to favourites
 */
export function addFavouriteLeague(league) {
  const data = getAll();
  if (!data.leagues.find(l => l.id === league.id)) {
    data.leagues.push({
      id: league.id,
      name: league.name,
      logo: league.logo,
      country: league.country,
      code: league.code,
      addedAt: new Date().toISOString(),
    });
    saveAll(data);
  }
  return data.leagues;
}

/**
 * Remove a league from favourites
 */
export function removeFavouriteLeague(leagueId) {
  const data = getAll();
  data.leagues = data.leagues.filter(l => l.id !== leagueId);
  saveAll(data);
  return data.leagues;
}

/**
 * Check if league is favourite
 */
export function isLeagueFavourite(leagueId) {
  const data = getAll();
  return data.leagues.some(l => l.id === leagueId);
}

/**
 * Toggle team favourite status
 */
export function toggleFavouriteTeam(team) {
  if (isTeamFavourite(team.id)) {
    removeFavouriteTeam(team.id);
    return false;
  } else {
    addFavouriteTeam(team);
    return true;
  }
}

/**
 * Toggle league favourite status
 */
export function toggleFavouriteLeague(league) {
  if (isLeagueFavourite(league.id)) {
    removeFavouriteLeague(league.id);
    return false;
  } else {
    addFavouriteLeague(league);
    return true;
  }
}

/**
 * Get all favourite teams
 */
export function getFavouriteTeams() {
  return getAll().teams;
}

/**
 * Get all favourite leagues
 */
export function getFavouriteLeagues() {
  return getAll().leagues;
}

/**
 * Get all favourites
 */
export function getAllFavourites() {
  return getAll();
}

/**
 * Check if a match involves favourite teams
 */
export function isMatchFavourite(homeTeamId, awayTeamId) {
  const data = getAll();
  return data.teams.some(t => t.id === homeTeamId || t.id === awayTeamId);
}

/**
 * Clear all favourites
 */
export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

export default {
  addFavouriteTeam,
  removeFavouriteTeam,
  isTeamFavourite,
  addFavouriteLeague,
  removeFavouriteLeague,
  isLeagueFavourite,
  toggleFavouriteTeam,
  toggleFavouriteLeague,
  getFavouriteTeams,
  getFavouriteLeagues,
  getAllFavourites,
  isMatchFavourite,
  clearAll,
};

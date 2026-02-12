// Team colors database - primary and secondary/away colors
export const TEAM_COLORS = {
  // Premier League
  42: { primary: '#EF0107', secondary: '#063672', name: 'Arsenal' }, // Red / Navy
  49: { primary: '#034694', secondary: '#DBA111', name: 'Chelsea' }, // Blue / Gold
  40: { primary: '#C8102E', secondary: '#00B2A9', name: 'Liverpool' }, // Red / Teal
  33: { primary: '#DA291C', secondary: '#FBE122', name: 'Manchester United' }, // Red / Yellow
  50: { primary: '#6CABDD', secondary: '#1C2C5B', name: 'Manchester City' }, // Sky Blue / Navy
  47: { primary: '#132257', secondary: '#FFFFFF', name: 'Tottenham' }, // Navy / White
  48: { primary: '#7A263A', secondary: '#95BFE5', name: 'West Ham' }, // Claret / Blue
  55: { primary: '#241F20', secondary: '#F5C400', name: 'Brentford' }, // Black-Red / Gold
  51: { primary: '#0057B8', secondary: '#FFFFFF', name: 'Brighton' }, // Blue / White
  52: { primary: '#0E63AD', secondary: '#EFE230', name: 'Crystal Palace' }, // Blue-Red / Yellow
  36: { primary: '#003399', secondary: '#FFFFFF', name: 'Fulham' }, // White / Navy
  45: { primary: '#003090', secondary: '#FBEE23', name: 'Everton' }, // Blue / Yellow
  66: { primary: '#1B458F', secondary: '#FDB913', name: 'Aston Villa' }, // Claret-Blue / Yellow
  39: { primary: '#6C1D45', secondary: '#99D6EA', name: 'Wolves' }, // Gold / Black
  34: { primary: '#FDB913', secondary: '#231F20', name: 'Newcastle' }, // Black-White / Yellow
  46: { primary: '#003399', secondary: '#FEF200', name: 'Leicester' }, // Blue / Yellow
  35: { primary: '#DA020E', secondary: '#0A4595', name: 'Bournemouth' }, // Red / Blue
  41: { primary: '#ED1A3B', secondary: '#63666A', name: 'Southampton' }, // Red / Gray
  65: { primary: '#99D6EA', secondary: '#F9EC34', name: 'Nott\'m Forest' }, // Red / Yellow
  57: { primary: '#E03A3E', secondary: '#1C2D5A', name: 'Ipswich Town' }, // Blue / White

  // La Liga
  529: { primary: '#A50044', secondary: '#EDBB00', name: 'Barcelona' }, // Blaugrana / Gold
  541: { primary: '#FEBE10', secondary: '#00529F', name: 'Real Madrid' }, // White / Purple
  530: { primary: '#CB3524', secondary: '#FFFFFF', name: 'Atletico Madrid' }, // Red-White / Blue
  532: { primary: '#005BBB', secondary: '#FDB913', name: 'Valencia' }, // White / Orange
  533: { primary: '#FECB09', secondary: '#0067B1', name: 'Villarreal' }, // Yellow / Blue
  536: { primary: '#0067B1', secondary: '#CE1126', name: 'Sevilla' }, // Red-White / Blue
  543: { primary: '#005BBB', secondary: '#CE1126', name: 'Real Betis' }, // Green-White / Gold
  531: { primary: '#CE1126', secondary: '#FFFFFF', name: 'Athletic Bilbao' }, // Red-White / Black
  548: { primary: '#00529F', secondary: '#FFFFFF', name: 'Real Sociedad' }, // Blue-White / Gold
  546: { primary: '#FECB09', secondary: '#0050A0', name: 'Getafe' }, // Blue / Yellow

  // Serie A
  489: { primary: '#000000', secondary: '#0068A8', name: 'AC Milan' }, // Red-Black / White
  505: { primary: '#0068A8', secondary: '#000000', name: 'Inter' }, // Blue-Black / White
  496: { primary: '#000000', secondary: '#FF8C00', name: 'Juventus' }, // Black-White / Gold
  492: { primary: '#7B1FA2', secondary: '#FFFFFF', name: 'Napoli' }, // Blue / White
  487: { primary: '#6B1FA2', secondary: '#FECB09', name: 'Lazio' }, // Sky Blue / White
  497: { primary: '#7B1FA2', secondary: '#FECB09', name: 'Roma' }, // Red-Yellow / Gray
  499: { primary: '#000000', secondary: '#FFFFFF', name: 'Atalanta' }, // Blue-Black / Orange
  502: { primary: '#A020F0', secondary: '#FFFFFF', name: 'Fiorentina' }, // Purple / White
  503: { primary: '#000000', secondary: '#FFCC00', name: 'Torino' }, // Maroon / White
  504: { primary: '#A50024', secondary: '#1C39BB', name: 'Verona' }, // Yellow-Blue / White

  // Bundesliga
  157: { primary: '#DC052D', secondary: '#0066B2', name: 'Bayern Munich' }, // Red / White-Blue
  165: { primary: '#FDE100', secondary: '#000000', name: 'Borussia Dortmund' }, // Yellow / Black
  173: { primary: '#E32221', secondary: '#FFFFFF', name: 'RB Leipzig' }, // Red / White
  169: { primary: '#ED1C24', secondary: '#000000', name: 'Eintracht Frankfurt' }, // Red / Black
  168: { primary: '#005CA9', secondary: '#FFFFFF', name: 'Bayer Leverkusen' }, // Red-Black / White
  167: { primary: '#1E5631', secondary: '#FFFFFF', name: 'Wolfsburg' }, // Green / White
  163: { primary: '#004D9D', secondary: '#FFFFFF', name: 'Schalke' }, // Blue / White
  172: { primary: '#1D428A', secondary: '#FFFFFF', name: 'Hoffenheim' }, // Blue / White
  162: { primary: '#00966E', secondary: '#FFFFFF', name: 'Werder Bremen' }, // Green / White
  161: { primary: '#E2001A', secondary: '#FFFFFF', name: 'Mainz' }, // Red / White
  160: { primary: '#BA0C2F', secondary: '#FFFFFF', name: 'Freiburg' }, // Red / White
  159: { primary: '#1E3264', secondary: '#FFFFFF', name: 'Hertha Berlin' }, // Blue-White / Navy
  170: { primary: '#E30613', secondary: '#FFFFFF', name: 'Stuttgart' }, // Red / White
  164: { primary: '#CE1719', secondary: '#FFFFFF', name: 'Augsburg' }, // Red / White
  176: { primary: '#005F3B', secondary: '#FFFFFF', name: 'Gladbach' }, // Green / White
  166: { primary: '#0066B2', secondary: '#FFFFFF', name: 'Hamburg' }, // Blue / White

  // Ligue 1
  85: { primary: '#004170', secondary: '#DA291C', name: 'PSG' }, // Navy-Red / White
  91: { primary: '#ED1C24', secondary: '#034694', name: 'Monaco' }, // Red-White / Blue
  80: { primary: '#0077C0', secondary: '#F4B223', name: 'Lyon' }, // Blue / White-Gold
  81: { primary: '#2FAEE0', secondary: '#FFFFFF', name: 'Marseille' }, // Sky Blue / White
  79: { primary: '#E4002B', secondary: '#000000', name: 'Lille' }, // Red / White
  93: { primary: '#DA1A35', secondary: '#FFFFFF', name: 'Reims' }, // Red / White
  95: { primary: '#E5322E', secondary: '#FFFFFF', name: 'Rennes' }, // Red-Black / White
  84: { primary: '#009E60', secondary: '#FFFFFF', name: 'Nice' }, // Red-Black / White
  94: { primary: '#FCDD09', secondary: '#009E60', name: 'Nantes' }, // Yellow-Green / White
  82: { primary: '#005BAC', secondary: '#FFFFFF', name: 'Strasbourg' }, // Blue / White

  // Other notable teams
  211: { primary: '#005DAA', secondary: '#FFFFFF', name: 'Benfica' }, // Red / White
  212: { primary: '#006BB6', secondary: '#FFFFFF', name: 'Porto' }, // Blue-White / White
  228: { primary: '#006847', secondary: '#FF0000', name: 'Sporting CP' }, // Green / White
  194: { primary: '#EE2737', secondary: '#FFFFFF', name: 'Ajax' }, // Red-White / Black
  197: { primary: '#F58220', secondary: '#000000', name: 'PSV' }, // Red-White / Yellow
  209: { primary: '#EE2737', secondary: '#FFFFFF', name: 'Feyenoord' }, // Red-White / White
  292: { primary: '#003DA5', secondary: '#FFFFFF', name: 'Rangers' }, // Blue / White
  247: { primary: '#007749', secondary: '#FFFFFF', name: 'Celtic' }, // Green-White / Yellow
};

// Default colors for teams without mapping
export const DEFAULT_HOME_COLOR = '#3B82F6'; // Blue
export const DEFAULT_AWAY_COLOR = '#EF4444'; // Red

// Get team color, with fallback
export function getTeamColor(teamId, isAway = false) {
  const team = TEAM_COLORS[teamId];
  if (team) {
    return isAway ? team.secondary : team.primary;
  }
  return isAway ? DEFAULT_AWAY_COLOR : DEFAULT_HOME_COLOR;
}

// Check if two colors are similar (within threshold)
export function colorsSimilar(color1, color2) {
  // Simple check - compare hex values
  const normalize = (c) => c?.toLowerCase().replace('#', '') || '';
  const c1 = normalize(color1);
  const c2 = normalize(color2);

  if (c1 === c2) return true;

  // Convert to RGB and check distance
  const hexToRgb = (hex) => {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  };

  try {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    const distance = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
    return distance < 80; // Colors are similar if distance < 80
  } catch {
    return false;
  }
}

// Get colors for both teams, ensuring contrast
export function getMatchColors(homeTeamId, awayTeamId) {
  let homeColor = getTeamColor(homeTeamId, false);
  let awayColor = getTeamColor(awayTeamId, false);

  // If primary colors are similar, use secondary for away team
  if (colorsSimilar(homeColor, awayColor)) {
    awayColor = getTeamColor(awayTeamId, true);

    // If still similar, use secondary for home team instead
    if (colorsSimilar(homeColor, awayColor)) {
      homeColor = getTeamColor(homeTeamId, true);
    }
  }

  return { homeColor, awayColor };
}

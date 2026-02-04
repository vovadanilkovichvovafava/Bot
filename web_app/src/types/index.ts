// Match types
export interface TeamInfo {
  name: string;
  logo?: string;
}

export interface Match {
  id: number;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  league: string;
  leagueCode: string;
  matchDate: string;
  matchday?: number;
  status: string;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  halfTimeScore?: string;
}

export interface MatchDetail extends Match {
  venue?: string;
  referee?: string;
  homeForm: string[];
  awayForm: string[];
  headToHead?: Record<string, unknown>;
}

// User types
export interface User {
  id: number;
  email: string;
  username?: string;
  language: string;
  timezone: string;
  isPremium: boolean;
  premiumUntil?: string;
  dailyRequests: number;
  dailyLimit: number;
  bonusPredictions: number;
  minOdds: number;
  maxOdds: number;
  riskLevel: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  createdAt: string;
}

// Prediction types
export interface Prediction {
  id: number;
  matchId: number;
  userId: number;
  prediction: string;
  confidence: number;
  odds?: number;
  result?: string;
  isCorrect?: boolean;
  createdAt: string;
}

// Chat types
export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatPreferences {
  minOdds?: number;
  maxOdds?: number;
  riskLevel?: string;
}

export interface MatchInfo {
  matchId?: string;
  homeTeam?: string;
  awayTeam?: string;
  leagueCode?: string;
  matchDate?: string;
}

// League types
export interface League {
  code: string;
  name: string;
  country: string;
  logo?: string;
}

// Stats types
export interface AccuracyStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  period: string;
}

export interface RoiStats {
  category: string;
  roi: number;
  predictions: number;
}

// Parse match from API response
export function parseMatch(data: Record<string, unknown>): Match {
  return {
    id: data.id as number,
    homeTeam: {
      name: (data.home_team as Record<string, unknown>)?.name as string || 'Unknown',
      logo: (data.home_team as Record<string, unknown>)?.logo as string || (data.home_team as Record<string, unknown>)?.crest as string,
    },
    awayTeam: {
      name: (data.away_team as Record<string, unknown>)?.name as string || 'Unknown',
      logo: (data.away_team as Record<string, unknown>)?.logo as string || (data.away_team as Record<string, unknown>)?.crest as string,
    },
    league: data.league as string || data.competition as string || 'Unknown',
    leagueCode: data.league_code as string || data.competition_code as string || '',
    matchDate: data.match_date as string || data.utc_date as string,
    matchday: data.matchday as number | undefined,
    status: data.status as string || 'scheduled',
    homeScore: data.home_score as number | undefined,
    awayScore: data.away_score as number | undefined,
    minute: data.minute as number | undefined,
    halfTimeScore: data.half_time_score as string | undefined,
  };
}

export function parseMatchDetail(data: Record<string, unknown>): MatchDetail {
  const match = parseMatch(data);
  return {
    ...match,
    venue: data.venue as string | undefined,
    referee: data.referee as string | undefined,
    homeForm: (data.home_form as string[]) || [],
    awayForm: (data.away_form as string[]) || [],
    headToHead: data.head_to_head as Record<string, unknown> | undefined,
  };
}

export function parseUser(data: Record<string, unknown>): User {
  return {
    id: data.id as number,
    email: data.email as string,
    username: data.username as string | undefined,
    language: data.language as string || 'en',
    timezone: data.timezone as string || 'UTC',
    isPremium: data.is_premium as boolean || false,
    premiumUntil: data.premium_until as string | undefined,
    dailyRequests: data.daily_requests as number || 0,
    dailyLimit: data.daily_limit as number || 3,
    bonusPredictions: data.bonus_predictions as number || 0,
    minOdds: data.min_odds as number || 1.5,
    maxOdds: data.max_odds as number || 3.0,
    riskLevel: data.risk_level as string || 'medium',
    totalPredictions: data.total_predictions as number || 0,
    correctPredictions: data.correct_predictions as number || 0,
    accuracy: data.accuracy as number || 0,
    createdAt: data.created_at as string,
  };
}

// Helper functions
export function isMatchLive(match: Match): boolean {
  const status = match.status.toLowerCase();
  return status === 'in_play' || status === 'live' || status === 'paused';
}

export function isMatchFinished(match: Match): boolean {
  return match.status.toLowerCase() === 'finished';
}

export function isMatchScheduled(match: Match): boolean {
  const status = match.status.toLowerCase();
  return status === 'scheduled' || status === 'timed';
}

export function getMatchScore(match: Match): string {
  if (match.homeScore !== undefined && match.awayScore !== undefined) {
    return `${match.homeScore} - ${match.awayScore}`;
  }
  return '-';
}

export function formatMatchDate(date: string): string {
  const matchDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());

  const time = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (matchDay.getTime() === today.getTime()) {
    return `Today ${time}`;
  } else if (matchDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow ${time}`;
  } else {
    return `${matchDate.getDate()}.${matchDate.getMonth() + 1} ${time}`;
  }
}

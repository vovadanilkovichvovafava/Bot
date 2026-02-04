import { Match, MatchDetail, User, Prediction, parseMatch, parseMatchDetail, parseUser, ChatPreferences, MatchInfo } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://appbot-production-152e.up.railway.app';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000];

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private shouldRetry(error: unknown, statusCode?: number): boolean {
    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    // Retry on 5xx server errors (Railway waking up)
    if (statusCode && statusCode >= 500 && statusCode < 600) {
      return true;
    }
    return false;
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (this.shouldRetry(null, response.status) && retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms for ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry<T>(url, options, retryCount + 1);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (this.shouldRetry(error) && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms for ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  // ============= AUTH =============

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const data = await this.fetchWithRetry<{ access_token: string; refresh_token: string }>(
      `${API_URL}/api/v1/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    );
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }

  async register(email: string, password: string, username?: string, language?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const data = await this.fetchWithRetry<{ access_token: string; refresh_token: string }>(
      `${API_URL}/api/v1/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(username && { username }),
          ...(language && { language }),
        }),
      }
    );
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }

  // ============= USER =============

  async getCurrentUser(): Promise<User> {
    const data = await this.fetchWithRetry<Record<string, unknown>>(
      `${API_URL}/api/v1/users/me`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return parseUser(data);
  }

  async updateUser(updates: Partial<{
    language: string;
    timezone: string;
    minOdds: number;
    maxOdds: number;
    riskLevel: string;
  }>): Promise<User> {
    const data = await this.fetchWithRetry<Record<string, unknown>>(
      `${API_URL}/api/v1/users/me`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...(updates.language && { language: updates.language }),
          ...(updates.timezone && { timezone: updates.timezone }),
          ...(updates.minOdds && { min_odds: updates.minOdds }),
          ...(updates.maxOdds && { max_odds: updates.maxOdds }),
          ...(updates.riskLevel && { risk_level: updates.riskLevel }),
        }),
      }
    );
    return parseUser(data);
  }

  async getAiLimits(): Promise<{ dailyRequests: number; dailyLimit: number; remaining: number }> {
    const data = await this.fetchWithRetry<{ daily_requests: number; daily_limit: number; remaining: number }>(
      `${API_URL}/api/v1/users/me/ai-limits`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return {
      dailyRequests: data.daily_requests,
      dailyLimit: data.daily_limit,
      remaining: data.remaining,
    };
  }

  // ============= MATCHES =============

  async getTodayMatches(): Promise<Match[]> {
    const data = await this.fetchWithRetry<Record<string, unknown>[]>(
      `${API_URL}/api/v1/matches/today`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data.map(parseMatch);
  }

  async getTomorrowMatches(): Promise<Match[]> {
    const data = await this.fetchWithRetry<Record<string, unknown>[]>(
      `${API_URL}/api/v1/matches/tomorrow`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data.map(parseMatch);
  }

  async getLiveMatches(): Promise<Match[]> {
    const data = await this.fetchWithRetry<Record<string, unknown>[]>(
      `${API_URL}/api/v1/matches/live`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data.map(parseMatch);
  }

  async getUpcomingMatches(league?: string, days = 14): Promise<Match[]> {
    const params = new URLSearchParams({ days: days.toString() });
    if (league) params.append('league', league);

    const data = await this.fetchWithRetry<Record<string, unknown>[]>(
      `${API_URL}/api/v1/matches/upcoming?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data.map(parseMatch);
  }

  async getMatchDetail(matchId: number): Promise<MatchDetail> {
    const data = await this.fetchWithRetry<Record<string, unknown>>(
      `${API_URL}/api/v1/matches/${matchId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return parseMatchDetail(data);
  }

  // ============= LEAGUES =============

  async getLeagues(): Promise<{ code: string; name: string; country: string; logo?: string }[]> {
    const data = await this.fetchWithRetry<{ code: string; name: string; country: string; logo?: string }[]>(
      `${API_URL}/api/v1/matches/leagues`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data;
  }

  async getStandings(leagueCode: string): Promise<Record<string, unknown>[]> {
    const data = await this.fetchWithRetry<Record<string, unknown>[]>(
      `${API_URL}/api/v1/matches/standings/${leagueCode}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data;
  }

  // ============= PREDICTIONS =============

  async createPrediction(matchId: number): Promise<Prediction> {
    const data = await this.fetchWithRetry<Record<string, unknown>>(
      `${API_URL}/api/v1/predictions/${matchId}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );
    return data as unknown as Prediction;
  }

  async getPredictionHistory(limit = 50, offset = 0): Promise<Prediction[]> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const data = await this.fetchWithRetry<Record<string, unknown>[]>(
      `${API_URL}/api/v1/predictions/history?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data as unknown as Prediction[];
  }

  // ============= STATS =============

  async getAccuracy(days = 30): Promise<{ totalPredictions: number; correctPredictions: number; accuracy: number }> {
    const data = await this.fetchWithRetry<{ total_predictions: number; correct_predictions: number; accuracy: number }>(
      `${API_URL}/api/v1/stats/accuracy?days=${days}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return {
      totalPredictions: data.total_predictions,
      correctPredictions: data.correct_predictions,
      accuracy: data.accuracy,
    };
  }

  async getRoiByCategory(days = 30): Promise<{ category: string; roi: number; predictions: number }[]> {
    const data = await this.fetchWithRetry<{ category: string; roi: number; predictions: number }[]>(
      `${API_URL}/api/v1/stats/roi?days=${days}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data;
  }

  // ============= FAVORITES =============

  async getFavoriteTeams(): Promise<string[]> {
    const data = await this.fetchWithRetry<{ team_name: string }[]>(
      `${API_URL}/api/v1/favorites/teams`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return data.map(t => t.team_name);
  }

  async addFavoriteTeam(teamName: string): Promise<void> {
    await this.fetchWithRetry<void>(
      `${API_URL}/api/v1/favorites/teams/${encodeURIComponent(teamName)}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );
  }

  async removeFavoriteTeam(teamName: string): Promise<void> {
    await this.fetchWithRetry<void>(
      `${API_URL}/api/v1/favorites/teams/${encodeURIComponent(teamName)}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
  }

  // ============= AI CHAT =============

  async sendChatMessage(
    message: string,
    history: { role: string; content: string }[] = [],
    preferences?: ChatPreferences,
    matchInfo?: MatchInfo
  ): Promise<{ response: string; cached?: boolean }> {
    // Ensure we have the latest token from localStorage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken && storedToken !== this.token) {
        this.token = storedToken;
        console.log('[API] Updated token from localStorage');
      }
    }

    const body: Record<string, unknown> = {
      message,
      history,
    };

    if (preferences) {
      body.preferences = {
        min_odds: preferences.minOdds ?? 1.5,
        max_odds: preferences.maxOdds ?? 3.0,
        risk_level: preferences.riskLevel ?? 'medium',
      };
    }

    if (matchInfo?.homeTeam && matchInfo?.awayTeam) {
      body.match_info = {
        match_id: matchInfo.matchId,
        home_team: matchInfo.homeTeam,
        away_team: matchInfo.awayTeam,
        league_code: matchInfo.leagueCode,
        match_date: matchInfo.matchDate,
      };
    }

    console.log('[API] Sending chat message:', {
      url: `${API_URL}/api/v1/chat/send`,
      hasToken: !!this.token,
      hasMatchInfo: !!matchInfo
    });

    const data = await this.fetchWithRetry<{ response: string; cached?: boolean }>(
      `${API_URL}/api/v1/chat/send`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      }
    );
    return data;
  }

  async isChatAvailable(): Promise<boolean> {
    try {
      const data = await this.fetchWithRetry<{ available: boolean }>(
        `${API_URL}/api/v1/chat/status`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );
      return data.available;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const api = new ApiService();

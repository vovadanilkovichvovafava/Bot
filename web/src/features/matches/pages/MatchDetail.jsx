import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import api from '../../../shared/api';
import footballApi from '../api/footballApi';
import { savePrediction, getSavedAnalysis, updatePredictionAnalysis } from '../../predictions/services/predictionStore';
import ShareButton from '../../predictions/components/ShareButton';
import { generateMatchShareText } from '../../predictions/services/shareUtils';
import { getMatchColors } from '../../../shared/utils/teamColors';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import fonbetApi from '../../../services/fonbetApi';
import { getTrackingLink, addTrackingToUrl } from '../../betting/services/trackingService';
import CommunityPick from '../components/CommunityPick';
import MatchChat from '../components/MatchChat';

const TAB_KEYS = ['overview', 'fans', 'stats', 'lineups'];
const PREDICTION_CACHE_KEY = 'match_predictions_cache';
const PREDICTION_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

const FREE_AI_LIMIT = 3;

// Helper functions for prediction caching
const getCachedPrediction = (matchId) => {
  try {
    const cache = JSON.parse(localStorage.getItem(PREDICTION_CACHE_KEY) || '{}');
    const entry = cache[matchId];
    if (!entry) return null;
    // Expire old entries
    if (Date.now() - entry.timestamp > PREDICTION_CACHE_TTL) {
      delete cache[matchId];
      localStorage.setItem(PREDICTION_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    // Return cached data if it has any analysis content
    if (entry.data?.claudeAnalysis) {
      return entry.data;
    }
    return null;
  } catch {
    return null;
  }
};

const saveCachedPrediction = (matchId, data) => {
  try {
    const cache = JSON.parse(localStorage.getItem(PREDICTION_CACHE_KEY) || '{}');
    // Clean up old entries
    const now = Date.now();
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > PREDICTION_CACHE_TTL) {
        delete cache[key];
      }
    });
    cache[matchId] = { data, timestamp: now };
    localStorage.setItem(PREDICTION_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to cache prediction:', e);
  }
};

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick, countryCode } = useAdvertiser();
  // Only users registered on bookmaker (use_deeplink=true) or PRO users go directly to match
  // Everyone else must first register through the offer
  const canUseDeeplink = user?.use_deeplink === true || user?.is_premium;
  const [match, setMatch] = useState(null);
  const [enriched, setEnriched] = useState(null);
  const [prediction, setPrediction] = useState(null); // { apiPrediction, claudeAnalysis }
  const [loading, setLoading] = useState(true);
  const [enrichedLoading, setEnrichedLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [isRestoredAnalysis, setIsRestoredAnalysis] = useState(false); // true if loaded from saved history
  const [activeTab, setActiveTab] = useState('overview');
  const [aiRemaining, setAiRemaining] = useState(null);
  const [fonbetMatch, setFonbetMatch] = useState(null); // Fonbet real odds + deeplink

  useEffect(() => {
    loadMatch();
    // Fetch AI remaining from server
    if (!user?.is_premium) {
      api.getChatLimit()
        .then(data => setAiRemaining(data.remaining ?? FREE_AI_LIMIT))
        .catch(() => setAiRemaining(FREE_AI_LIMIT));
    }
    // Restore saved analysis — check prediction store first, then short-term cache
    const saved = getSavedAnalysis(id);
    if (saved?.claudeAnalysis) {
      const restored = {
        apiPrediction: saved.apiPrediction || null,
        claudeAnalysis: saved.claudeAnalysis,
      };
      setPrediction(restored);
      setIsRestoredAnalysis(true);
      // Also populate short-term cache so getAnalysis() finds it quickly
      saveCachedPrediction(id, restored);
    } else {
      // Fallback: check short-term cache
      const cached = getCachedPrediction(id);
      if (cached?.claudeAnalysis) {
        setPrediction(cached);
        setIsRestoredAnalysis(true);
      }
    }
  }, [id]);

  const loadMatch = async () => {
    // For numeric IDs (API-Football), load fixture first, then ALL enriched data in one parallel batch
    const isApiFootballId = /^\d+$/.test(id);

    if (isApiFootballId) {
      try {
        const fixture = await footballApi.getFixture(id);

        if (fixture) {
          const converted = {
            id: fixture.fixture.id,
            league: fixture.league?.name || '',
            match_date: fixture.fixture.date,
            status: fixture.fixture.status?.long || 'Upcoming',
            home_team: {
              name: fixture.teams?.home?.name,
              logo: fixture.teams?.home?.logo,
            },
            away_team: {
              name: fixture.teams?.away?.name,
              logo: fixture.teams?.away?.logo,
            },
            home_score: fixture.goals?.home,
            away_score: fixture.goals?.away,
          };
          setMatch(converted);
          setLoading(false);

          // Load Fonbet odds (non-blocking, never crashes main flow)
          try {
            const fbMatch = await fonbetApi.findMatch(
              fixture.teams?.home?.name,
              fixture.teams?.away?.name,
              fixture.fixture?.date
            );
            if (fbMatch) setFonbetMatch(fbMatch);
          } catch (_) { /* Fonbet unavailable — app works as before */ }

          // Extract IDs for standings/H2H — load ALL enriched data in ONE parallel batch
          const leagueId = fixture.league?.id;
          const season = fixture.league?.season;
          const homeId = fixture.teams?.home?.id;
          const awayId = fixture.teams?.away?.id;

          const enrichedData = await loadEnrichedDataParallel(id, leagueId, season, homeId, awayId);

          setEnriched({
            fixture,
            fixtureId: id,
            homeId,
            awayId,
            ...enrichedData,
          });
          setEnrichedLoading(false);
          return;
        }
      } catch (e) {
        console.warn('API-Football load failed:', e);
      }
    }

    // Fallback: Try backend (Football-Data.org)
    try {
      const data = await api.getMatchDetail(id);
      if (data) {
        setMatch(data);
        loadEnrichedData(data);
        return;
      }
    } catch (e) {
      console.warn('Backend match not found:', e);
    }

    setLoading(false);
  };

  // All enriched data in ONE parallel batch — no waterfall
  const loadEnrichedDataParallel = async (fixtureId, leagueId, season, homeId, awayId) => {
    const [prediction, odds, stats, events, lineups, injuries, standings, h2h] = await Promise.allSettled([
      footballApi.getPrediction(fixtureId),
      footballApi.getOdds(fixtureId),
      footballApi.getFixtureStatistics(fixtureId),
      footballApi.getFixtureEvents(fixtureId),
      footballApi.getFixtureLineups(fixtureId),
      footballApi.getInjuries(fixtureId),
      leagueId && season ? footballApi.getStandings(leagueId, season) : Promise.resolve([]),
      homeId && awayId ? footballApi.getHeadToHead(homeId, awayId, 10) : Promise.resolve([]),
    ]);

    return {
      prediction: prediction.status === 'fulfilled' ? prediction.value : null,
      odds: odds.status === 'fulfilled' ? odds.value : [],
      stats: stats.status === 'fulfilled' ? stats.value : [],
      events: events.status === 'fulfilled' ? events.value : [],
      lineups: lineups.status === 'fulfilled' ? lineups.value : [],
      injuries: injuries.status === 'fulfilled' ? injuries.value : [],
      standings: standings.status === 'fulfilled' ? standings.value : [],
      h2hFixtures: h2h.status === 'fulfilled' ? h2h.value : [],
    };
  };

  const loadEnrichedData = async (m) => {
    try {
      const date = new Date(m.match_date).toISOString().split('T')[0];
      const data = await footballApi.getMatchEnrichedData(
        m.home_team?.name,
        m.away_team?.name,
        date
      );
      setEnriched(data);
    } catch (e) {
      console.error('API-Football enrichment failed:', e);
    } finally {
      setEnrichedLoading(false);
      setLoading(false);
    }
  };

  // For API-Football fixtures - load enriched data directly
  const loadEnrichedDataFromFixture = async (fixture) => {
    const fixtureId = fixture.fixture.id;
    try {
      // Fetch all enriched data in parallel
      const [prediction, odds, stats, events, lineups, injuries] = await Promise.allSettled([
        footballApi.getPrediction(fixtureId),
        footballApi.getOdds(fixtureId),
        footballApi.getFixtureStatistics(fixtureId),
        footballApi.getFixtureEvents(fixtureId),
        footballApi.getFixtureLineups(fixtureId),
        footballApi.getInjuries(fixtureId),
      ]);

      setEnriched({
        fixture,
        fixtureId,
        homeId: fixture.teams?.home?.id,
        awayId: fixture.teams?.away?.id,
        prediction: prediction.status === 'fulfilled' ? prediction.value : null,
        odds: odds.status === 'fulfilled' ? odds.value : [],
        stats: stats.status === 'fulfilled' ? stats.value : [],
        events: events.status === 'fulfilled' ? events.value : [],
        lineups: lineups.status === 'fulfilled' ? lineups.value : [],
        injuries: injuries.status === 'fulfilled' ? injuries.value : [],
      });
    } catch (e) {
      console.error('Failed to load enriched data:', e);
    } finally {
      setEnrichedLoading(false);
      setLoading(false);
    }
  };

  // Build a rich prompt for Claude with ALL available enriched data
  const buildAIPrompt = () => {
    const home = match.home_team?.name;
    const away = match.away_team?.name;
    const league = enriched?.fixture?.league?.name || match.league || '';
    const country = enriched?.fixture?.league?.country || '';
    const matchDate = match.match_date || enriched?.fixture?.fixture?.date;
    const status = enriched?.fixture?.fixture?.status?.long || match.status || 'Scheduled';

    let prompt = `Match: ${home} vs ${away}`;
    prompt += `\nLeague: ${league}${country ? ` (${country})` : ''}`;
    if (matchDate) prompt += `\nDate: ${new Date(matchDate).toLocaleString()}`;
    prompt += `\nStatus: ${status}`;

    // Score if available (live/finished)
    if (enriched?.fixture?.goals?.home !== null && enriched?.fixture?.goals?.home !== undefined) {
      prompt += `\nScore: ${enriched.fixture.goals.home} - ${enriched.fixture.goals.away}`;
    }

    // API-Football Prediction data
    if (enriched?.prediction) {
      const p = enriched.prediction.predictions || enriched.prediction;
      const cmp = enriched.prediction.comparison;
      prompt += `\n\n--- API Prediction ---`;
      if (p?.winner?.name) prompt += `\nPredicted winner: ${p.winner.name} (${p.winner.comment || ''})`;
      if (p?.advice) prompt += `\nAdvice: ${p.advice}`;
      if (p?.percent) {
        prompt += `\nWin probability: Home ${p.percent.home}, Draw ${p.percent.draw}, Away ${p.percent.away}`;
      }
      if (cmp) {
        prompt += `\nForm: Home ${cmp.form?.home || '?'}% vs Away ${cmp.form?.away || '?'}%`;
        prompt += `\nAttack: Home ${cmp.att?.home || '?'}% vs Away ${cmp.att?.away || '?'}%`;
        prompt += `\nDefense: Home ${cmp.def?.home || '?'}% vs Away ${cmp.def?.away || '?'}%`;
        prompt += `\nOverall: Home ${cmp.total?.home || '?'}% vs Away ${cmp.total?.away || '?'}%`;
      }
    }

    // Odds
    const odds1x2 = getOdds1x2();
    if (odds1x2) {
      prompt += `\n\n--- Odds ---`;
      prompt += `\nMatch Winner: Home ${odds1x2.home}, Draw ${odds1x2.draw}, Away ${odds1x2.away} (${odds1x2.bookmaker || 'bookmaker'})`;
    }
    // Additional odds markets
    if (enriched?.odds?.length > 0) {
      const bookmaker = enriched.odds[0]?.bookmakers?.[0];
      if (bookmaker?.bets) {
        const ouMarket = bookmaker.bets.find(b => b.name === 'Goals Over/Under' || b.name === 'Over/Under');
        if (ouMarket?.values) {
          const lines = ouMarket.values.slice(0, 6).map(v => `${v.value}: ${v.odd}`).join(', ');
          prompt += `\nOver/Under: ${lines}`;
        }
        const bttsMarket = bookmaker.bets.find(b => b.name === 'Both Teams Score');
        if (bttsMarket?.values) {
          const yes = bttsMarket.values.find(v => v.value === 'Yes')?.odd;
          const no = bttsMarket.values.find(v => v.value === 'No')?.odd;
          if (yes) prompt += `\nBTTS: Yes ${yes}, No ${no}`;
        }
        const dcMarket = bookmaker.bets.find(b => b.name === 'Double Chance');
        if (dcMarket?.values) {
          const dc = dcMarket.values.map(v => `${v.value}: ${v.odd}`).join(', ');
          prompt += `\nDouble Chance: ${dc}`;
        }
      }
    }

    // Fonbet real odds (if available)
    if (fonbetMatch?.odds) {
      const fo = fonbetMatch.odds;
      prompt += `\n\n--- Fonbet Real Odds (live from bookmaker) ---`;
      if (fo['1']) prompt += `\nMatch Winner: Home ${fo['1']}, Draw ${fo['X']}, Away ${fo['2']}`;
      if (fo['over_2.5']) prompt += `\nTotal: Over 2.5 = ${fo['over_2.5']}, Under 2.5 = ${fo['under_2.5']}`;
      if (fo['btts_yes']) prompt += `\nBTTS: Yes = ${fo['btts_yes']}, No = ${fo['btts_no']}`;
      if (fo['1X']) prompt += `\nDouble Chance: 1X = ${fo['1X']}, 12 = ${fo['12']}, X2 = ${fo['X2']}`;
      if (fo['handicap_1']) prompt += `\nHandicap: Home = ${fo['handicap_1']}, Away = ${fo['handicap_2']}`;
      if (fonbetMatch.deeplink) prompt += `\nFonbet deeplink: ${fonbetMatch.deeplink}`;
    }

    // Standings (league positions)
    if (enriched?.standings?.length > 0) {
      prompt += `\n\n--- League Standings ---`;
      const homeStd = enriched.standings.find(s => s.team?.name?.toLowerCase().includes(home?.toLowerCase()?.split(' ')[0]));
      const awayStd = enriched.standings.find(s => s.team?.name?.toLowerCase().includes(away?.toLowerCase()?.split(' ')[0]));
      if (homeStd) {
        prompt += `\n${home}: ${homeStd.rank || homeStd.position}th, ${homeStd.points}pts, ${homeStd.all?.win || 0}W-${homeStd.all?.draw || 0}D-${homeStd.all?.lose || 0}L, GD ${homeStd.goalsDiff ?? '?'}, Form: ${homeStd.form || '?'}`;
      }
      if (awayStd) {
        prompt += `\n${away}: ${awayStd.rank || awayStd.position}th, ${awayStd.points}pts, ${awayStd.all?.win || 0}W-${awayStd.all?.draw || 0}D-${awayStd.all?.lose || 0}L, GD ${awayStd.goalsDiff ?? '?'}, Form: ${awayStd.form || '?'}`;
      }
    }

    // Head-to-Head fixtures
    if (enriched?.h2hFixtures?.length > 0) {
      prompt += `\n\n--- Head-to-Head (last ${enriched.h2hFixtures.length} meetings) ---`;
      let homeWins = 0, draws = 0, awayWins = 0;
      for (const f of enriched.h2hFixtures.slice(0, 10)) {
        const hg = f.goals?.home ?? 0;
        const ag = f.goals?.away ?? 0;
        const hName = f.teams?.home?.name || '?';
        const aName = f.teams?.away?.name || '?';
        const date = f.fixture?.date ? new Date(f.fixture.date).toLocaleDateString() : '?';
        prompt += `\n${date}: ${hName} ${hg}-${ag} ${aName}`;
        if (hg > ag) homeWins++;
        else if (hg < ag) awayWins++;
        else draws++;
      }
      prompt += `\nH2H Summary: ${homeWins}W-${draws}D-${awayWins}L`;
    } else if (match.head_to_head?.total_matches > 0) {
      const h = match.head_to_head;
      prompt += `\n\n--- Head-to-Head ---`;
      prompt += `\nH2H (${h.total_matches} matches): Home ${h.home_wins}W, ${h.draws}D, Away ${h.away_wins}W`;
    }

    // Injuries
    if (enriched?.injuries?.length > 0) {
      prompt += `\n\n--- Injuries & Suspensions ---`;
      const homeInj = enriched.injuries.filter(i => i.team?.id === enriched.homeId);
      const awayInj = enriched.injuries.filter(i => i.team?.id === enriched.awayId);
      if (homeInj.length) prompt += `\n${home}: ${homeInj.map(i => `${i.player?.name} (${i.player?.reason || i.player?.type || 'injured'})`).join(', ')}`;
      if (awayInj.length) prompt += `\n${away}: ${awayInj.map(i => `${i.player?.name} (${i.player?.reason || i.player?.type || 'injured'})`).join(', ')}`;
    }

    // Lineups
    if (enriched?.lineups?.length > 0) {
      prompt += `\n\n--- Lineups ---`;
      for (const lineup of enriched.lineups) {
        const teamName = lineup.team?.name || '?';
        const formation = lineup.formation || '?';
        const starters = (lineup.startXI || []).map(p => p.player?.name || '?').join(', ');
        prompt += `\n${teamName} (${formation}): ${starters}`;
      }
    }

    // Match Statistics (if live/finished)
    if (enriched?.stats?.length > 0) {
      prompt += `\n\n--- Match Statistics ---`;
      for (const teamStats of enriched.stats) {
        const teamName = teamStats.team?.name || '?';
        const statsArr = teamStats.statistics || [];
        if (statsArr.length > 0) {
          const statLine = statsArr.map(s => `${s.type}: ${s.value ?? 0}`).join(', ');
          prompt += `\n${teamName}: ${statLine}`;
        }
      }
    }

    // User betting preferences
    const minOdds = user?.min_odds || 1.5;
    const maxOdds = user?.max_odds || 3.0;
    const riskLevel = user?.risk_level || 'medium';
    const riskDesc = {
      low: 'Conservative approach - focus on safer bets like double chance, under goals, favorites. Suggest 1-2% of bankroll per bet.',
      medium: 'Balanced approach - standard 1X2, over/under, BTTS bets. Suggest 2-5% of bankroll per bet.',
      high: 'Aggressive approach - value picks, accumulators, correct scores allowed. Suggest 5-10% of bankroll per bet.'
    };

    prompt += `\n\n**=== MANDATORY BETTING RULES (NEVER VIOLATE) ===**`;
    prompt += `\n- MINIMUM odds: ${minOdds} — NEVER recommend anything below ${minOdds}!`;
    prompt += `\n- MAXIMUM odds: ${maxOdds} — NEVER recommend anything above ${maxOdds}!`;
    prompt += `\n- Risk level: ${riskLevel.toUpperCase()}`;
    prompt += `\n- Strategy: ${riskDesc[riskLevel]}`;
    prompt += `\n\n⚠️ STRICT REQUIREMENT: Every [BET] recommendation MUST have odds between ${minOdds} and ${maxOdds}.`;
    prompt += `\nIf a market's odds are outside this range, find a DIFFERENT market that fits.`;
    prompt += `\nFor example, if Match Winner odds are 1.10 (below ${minOdds}), suggest Over/Under, BTTS, Handicap, or Corners instead.`;

    prompt += `\n\nProvide a detailed prediction with probabilities and key factors.`;
    prompt += `\n\n**IMPORTANT: End your analysis with a FINAL RECOMMENDATIONS section containing 2-3 bets from DIFFERENT markets.**`;
    prompt += `\nEach recommendation MUST use this exact format on its own line:`;
    prompt += `\n[BET] Bet Type @ Odds`;
    prompt += `\n`;
    prompt += `\nExample final section:`;
    prompt += `\n**FINAL RECOMMENDATIONS**`;
    prompt += `\n1. [BET] Over 2.5 Goals @ 1.85`;
    prompt += `\n2. [BET] ${home} Win @ 2.10`;
    prompt += `\n3. [BET] Both Teams to Score @ 1.75`;
    prompt += `\n`;
    prompt += `\nAll odds MUST be between ${minOdds} and ${maxOdds}. Pick different markets (1X2, Over/Under, BTTS, Handicap, Corners, etc).`;
    return prompt;
  };

  const getAnalysis = async (forceReanalyze = false) => {
    // Check free limit for non-premium users BEFORE making request
    const isPremium = user?.is_premium;
    if (!isPremium && aiRemaining !== null && aiRemaining <= 0) {
      navigate('/pro-access?reason=limit&feature=match-analysis');
      return;
    }

    // Check cache first (skip on reanalyze)
    if (!forceReanalyze) {
      // 1. Check short-term cache (2h TTL)
      const cached = getCachedPrediction(id);
      if (cached) {
        console.log('Using cached prediction for match:', id);
        setPrediction(cached);
        return;
      }
      // 2. Fallback: check prediction store (persists across sessions)
      const saved = getSavedAnalysis(id);
      if (saved?.claudeAnalysis) {
        console.log('Using saved prediction from store for match:', id);
        const restored = {
          apiPrediction: saved.apiPrediction || null,
          claudeAnalysis: saved.claudeAnalysis,
        };
        setPrediction(restored);
        setIsRestoredAnalysis(true);
        // Repopulate short-term cache
        saveCachedPrediction(id, restored);
        return;
      }
    }

    setPredicting(true);
    try {
      // If enriched data hasn't loaded yet, try to fetch prediction directly
      let apiPred = enriched?.prediction || null;
      if (!apiPred && enriched?.fixtureId) {
        try {
          apiPred = await footballApi.getPrediction(enriched.fixtureId);
        } catch (_) {}
      }

      const prompt = buildAIPrompt();
      // Split: match data goes as match_context, question as message
      const matchContext = prompt;
      const userMessage = `Analyze the match ${match.home_team?.name} vs ${match.away_team?.name} and provide a detailed prediction with betting recommendation.`;

      let data;
      if (forceReanalyze) {
        // Re-analyze via dedicated endpoint (costs 1 token, fresh analysis)
        const locale = navigator.language?.slice(0, 2) || 'en';
        data = await api.reanalyzeChat(userMessage, matchContext, null, locale);
      } else {
        data = await api.aiChat(userMessage, [], matchContext);
      }

      // Refresh AI remaining counter from server (AFTER successful response)
      if (!user?.is_premium) {
        api.getChatLimit()
          .then(data => setAiRemaining(data.remaining ?? 0))
          .catch(() => {});
      }

      const result = { apiPrediction: apiPred, claudeAnalysis: data.response };
      setPrediction(result);
      setIsRestoredAnalysis(false);

      // Cache any non-empty analysis so it persists across navigation
      const isGeneric = !data.response ||
        data.response.includes("I don't have real-time") ||
        data.response.includes("cannot provide") ||
        data.response.includes("do not have") ||
        data.response.includes("no real-time") ||
        data.response.includes("don't have access") ||
        (data.response.includes("I need") && data.response.includes("Confirmation"));
      if (data.response && !isGeneric) {
        saveCachedPrediction(id, result);
      }

      // Save prediction for history tracking
      try {
        const matchDate = match.match_date || enriched?.fixture?.fixture?.date || new Date().toISOString();
        if (forceReanalyze) {
          // Update existing prediction entry with new analysis
          updatePredictionAnalysis(id, {
            claudeAnalysis: data.response,
            apiPrediction: apiPred,
          });
          console.log('Prediction updated (reanalyzed):', id);
        } else {
          // First analysis — save new entry
          const saved = savePrediction({
            matchId: id,
            homeTeam: match.home_team || { name: 'Home' },
            awayTeam: match.away_team || { name: 'Away' },
            league: match.league || enriched?.fixture?.league?.name || '',
            matchDate,
            apiPrediction: apiPred,
            claudeAnalysis: data.response,
            odds: getOdds1x2(),
          });
          console.log('Prediction saved:', saved);
        }
      } catch (e) {
        console.error('Failed to save prediction:', e);
      }
    } catch (e) {
      console.error(e);
      // Still show API-Football prediction even if Claude fails
      setPrediction({
        apiPrediction: enriched?.prediction || null,
        claudeAnalysis: t('matchDetail.aiAnalysisFailed'),
      });
    } finally {
      setPredicting(false);
    }
  };

  // Extract 1X2 odds from API-Football
  const getOdds1x2 = () => {
    if (!enriched?.odds?.length) return null;
    const bookmaker = enriched.odds[0]?.bookmakers?.[0];
    if (!bookmaker) return null;
    const market = bookmaker.bets?.find(b => b.name === 'Match Winner');
    if (!market) return null;
    const home = market.values?.find(v => v.value === 'Home')?.odd;
    const draw = market.values?.find(v => v.value === 'Draw')?.odd;
    const away = market.values?.find(v => v.value === 'Away')?.odd;
    return home ? { home, draw, away, bookmaker: bookmaker.name } : null;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const statusLabel = (s) => {
    if (!s) return t('matchDetail.statusUpcoming');
    const map = { scheduled: t('matchDetail.statusUpcoming'), timed: t('matchDetail.statusUpcoming'), in_play: t('matchDetail.statusLive'), paused: t('matchDetail.statusHalfTime'), finished: t('matchDetail.statusFinished') };
    return map[s.toLowerCase()] || s;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#F0F2F5]">
        <div className="flex-1 flex items-center justify-center">
          <FootballSpinner size="lg" text={t('matchDetail.loading')} />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="h-screen flex flex-col bg-[#F0F2F5]">
        <div className="bg-white px-5 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
            {t('matchDetail.back')}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('matchDetail.notFound')}</h2>
            <p className="text-gray-500 text-sm mb-6">{t('matchDetail.notFoundDesc')}</p>
            <button
              onClick={() => navigate('/matches')}
              className="bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl"
            >
              {t('matchDetail.backToMatches')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const odds1x2 = getOdds1x2();

  // Registered (use_deeplink) and PRO users go directly to bookmaker match
  // Everyone else goes to offer link to register on bookmaker first
  const handlePromoClick = (source) => {
    if (canUseDeeplink && fonbetMatch?.deeplink) {
      trackClick(user?.id, source);
      window.open(addTrackingToUrl(fonbetMatch.deeplink, user?.id, source), '_blank', 'noopener,noreferrer');
    } else {
      // Not registered → open offer link directly (no promo quiz)
      trackClick(user?.id, source);
      window.open(getTrackingLink(user?.id, source) || advertiser?.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
     <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">{match.league}</h1>
          <div className="w-10"/>
        </div>

        {/* Match Info Card */}
        <div className="card border border-gray-100">
          <p className="text-gray-500 text-center text-sm">{formatDate(match.match_date)} &bull; {formatTime(match.match_date)}</p>

          <div className="flex items-center justify-between mt-4 px-2">
            <div className="flex-1 text-center">
              {match.home_team?.logo && (
                <img src={match.home_team.logo} alt="" className="w-16 h-16 mx-auto mb-2 object-contain" onError={(e) => e.target.style.display='none'}/>
              )}
              <p className="font-semibold text-sm">{match.home_team?.name}</p>
            </div>

            <div className="px-4 text-center">
              <span className="text-2xl font-bold text-gray-300">{t('matchDetail.vs')}</span>
              <p className={`text-xs mt-1 font-medium ${statusLabel(match.status) === 'Live' ? 'text-red-500' : 'text-amber-500'}`}>
                {statusLabel(match.status)}
              </p>
            </div>

            <div className="flex-1 text-center">
              {match.away_team?.logo && (
                <img src={match.away_team.logo} alt="" className="w-16 h-16 mx-auto mb-2 object-contain" onError={(e) => e.target.style.display='none'}/>
              )}
              <p className="font-semibold text-sm">{match.away_team?.name}</p>
            </div>
          </div>

          {/* Odds row - clickable */}
          {odds1x2 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                <div
                  onClick={() => handlePromoClick('match_odds_home')}
                  className="bg-blue-50 hover:bg-blue-100 rounded-lg py-2 text-center cursor-pointer transition-colors border border-blue-200"
                >
                  <p className="text-[10px] text-blue-500 uppercase font-medium">{t('matchDetail.home')}</p>
                  <p className="text-sm font-bold text-blue-600">{odds1x2.home}</p>
                </div>
                <div
                  onClick={() => handlePromoClick('match_odds_draw')}
                  className="bg-gray-50 hover:bg-gray-100 rounded-lg py-2 text-center cursor-pointer transition-colors border border-gray-200"
                >
                  <p className="text-[10px] text-gray-500 uppercase font-medium">{t('matchDetail.draw')}</p>
                  <p className="text-sm font-bold text-gray-700">{odds1x2.draw}</p>
                </div>
                <div
                  onClick={() => handlePromoClick('match_odds_away')}
                  className="bg-blue-50 hover:bg-blue-100 rounded-lg py-2 text-center cursor-pointer transition-colors border border-blue-200"
                >
                  <p className="text-[10px] text-blue-500 uppercase font-medium">{t('matchDetail.away')}</p>
                  <p className="text-sm font-bold text-blue-600">{odds1x2.away}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex mt-4 border-b border-gray-200 overflow-x-auto scrollbar-none">
          {TAB_KEYS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-0 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap px-1 ${
                activeTab === tab
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-400 border-transparent'
              }`}
            >
              {t(`matchDetail.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4 pb-8">
        {activeTab === 'overview' && (
          <OverviewTab
            matchId={id}
            match={match}
            enriched={enriched}
            enrichedLoading={enrichedLoading}
            prediction={prediction}
            predicting={predicting}
            getAnalysis={getAnalysis}
            isRestoredAnalysis={isRestoredAnalysis}
            user={user}
            aiRemaining={aiRemaining}
            formatDate={formatDate}
            formatTime={formatTime}
            statusLabel={statusLabel}
            getOdds1x2={() => getOdds1x2()}
            advertiser={advertiser}
            trackClick={trackClick}
            navigate={navigate}
            t={t}
            fonbetMatch={fonbetMatch}
            canUseDeeplink={canUseDeeplink}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab enriched={enriched} loading={enrichedLoading} match={match} t={t} />
        )}
        {activeTab === 'lineups' && (
          <LineupsTab enriched={enriched} loading={enrichedLoading} t={t} />
        )}
        {activeTab === 'fans' && (
          <FansAreaTab matchId={id} match={match} t={t} />
        )}
      </div>
     </div>
    </div>
  );
}

// ============================
// Fans Area Tab
// ============================
function FansAreaTab({ matchId, match, t }) {
  return (
    <>
      <CommunityPick matchId={matchId} homeTeam={match.home_team} awayTeam={match.away_team} />
      <MatchChat matchId={matchId} />
    </>
  );
}

// ============================
// Overview Tab
// ============================
function OverviewTab({ matchId, match, enriched, enrichedLoading, prediction, predicting, getAnalysis, isRestoredAnalysis, user, aiRemaining, formatDate, formatTime, statusLabel, getOdds1x2, advertiser, trackClick, navigate, t, fonbetMatch, canUseDeeplink }) {
  const pred = prediction?.apiPrediction;
  const odds1x2 = getOdds1x2();

  // Check AI limit status (server-based)
  const isPremium = user?.is_premium;
  const remaining = isPremium ? 999 : (aiRemaining ?? FREE_AI_LIMIT);
  const limitReached = !isPremium && aiRemaining !== null && aiRemaining <= 0;
  const remainingRequests = Math.max(0, remaining);

  // Use i18n for all promo texts (never use advertiser.texts directly)
  const adTexts = {
    promoTitle: t('advertiser.promoTitle', { bonus: advertiser?.bonusBanner?.bonus || '' }),
    promoCtaFree: t('advertiser.promoCtaFree'),
  };
  // Parse AI recommended bets from analysis (multiple [BET] tags)
  const parseRecommendedBets = () => {
    if (!prediction?.claudeAnalysis) return [];
    const regex = /\[BET\]\s*(.+?)\s*@\s*([\d.]+)/gi;
    const bets = [];
    let m;
    while ((m = regex.exec(prediction.claudeAnalysis)) !== null) {
      bets.push({
        type: m[1].trim(),
        odds: parseFloat(m[2]),
        homeTeam: match.home_team?.name,
        awayTeam: match.away_team?.name,
        league: match.league,
        date: formatDate(match.match_date),
      });
    }
    return bets;
  };

  const recommendedBets = parseRecommendedBets();
  const recommendedBet = recommendedBets[0] || null;

  // Calculate potential win for free bet card
  const bonusNumeric = advertiser?.freeBetAmount || 75;
  const potentialWin = recommendedBet ? Math.round(bonusNumeric * recommendedBet.odds) : 0;
  const formatWinAmount = (val) => {
    const currency = advertiser?.currency || '€';
    const bonusFmt = advertiser?.bonusBanner?.bonus || '';
    if (bonusFmt.indexOf(currency) === 0) return `${currency}${val.toLocaleString('en-US')}`;
    return `${val.toLocaleString('de-DE')} ${currency}`;
  };

  return (
    <>
      {/* Combined AI Analysis - shown only after button click */}
      {prediction ? (
        <div className="card border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            <h3 className="font-bold text-gray-900">{t('matchDetail.aiAnalysis')}</h3>
            <div className="ml-auto flex gap-1.5 items-center">
              {pred && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{t('matchDetail.data')}</span>}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">Claude AI</span>
              <ShareButton
                variant="icon"
                text={generateMatchShareText({
                  homeTeam: match.home_team?.name,
                  awayTeam: match.away_team?.name,
                  league: match.league,
                  date: formatDate(match.match_date),
                  prediction: pred,
                  odds: odds1x2,
                })}
              />
            </div>
          </div>

          {/* API-Football Prediction - win probability */}
          {pred?.predictions?.percent && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">{t('matchDetail.winProbability')}</p>
              <div className="space-y-2">
                <ProbBar label={match.home_team?.name} pct={parseInt(pred.predictions.percent.home)} color="bg-blue-500"/>
                <ProbBar label={t('matchDetail.draw')} pct={parseInt(pred.predictions.percent.draw)} color="bg-gray-400"/>
                <ProbBar label={match.away_team?.name} pct={parseInt(pred.predictions.percent.away)} color="bg-red-500"/>
              </div>
            </div>
          )}

          {/* API-Football advice */}
          {pred?.predictions?.advice && (
            <div className="bg-amber-50 rounded-xl px-4 py-2.5 text-sm text-amber-800 font-medium mb-4">
              {pred.predictions.advice}
            </div>
          )}

          {/* Team comparison */}
          {pred?.comparison && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{t('matchDetail.teamComparison')}</p>
              <CompareBar label={t('matchDetail.form')} home={pred.comparison.form?.home} away={pred.comparison.form?.away}/>
              <CompareBar label={t('matchDetail.attack')} home={pred.comparison.att?.home} away={pred.comparison.att?.away}/>
              <CompareBar label={t('matchDetail.defense')} home={pred.comparison.def?.home} away={pred.comparison.def?.away}/>
              <CompareBar label={t('matchDetail.overall')} home={pred.comparison.total?.home} away={pred.comparison.total?.away}/>
            </div>
          )}

          {/* Claude AI Analysis text */}
          {(pred?.predictions || pred?.comparison) && <div className="border-t border-gray-100 my-4"/>}
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">{t('matchDetail.expertAnalysis')}</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {prediction.claudeAnalysis?.split('\n').map((line, i) => {
              const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }}/>;
            })}
          </div>

          {/* AI Recommended Bets - multiple cards */}
          {recommendedBets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {recommendedBets.map((bet, idx) => {
                const betPotentialWin = bonusNumeric ? Math.round(bonusNumeric * bet.odds) : 0;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (canUseDeeplink && fonbetMatch?.deeplink) {
                        trackClick(user?.id, 'match_ai_bet');
                        window.open(addTrackingToUrl(fonbetMatch.deeplink, user?.id, 'match_ai_bet'), '_blank', 'noopener,noreferrer');
                      } else {
                        trackClick(user?.id, 'match_ai_bet');
                        window.open(getTrackingLink(user?.id, 'match_ai_bet') || advertiser?.link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="w-full text-left relative overflow-hidden rounded-xl shadow-lg"
                    style={{ background: idx === 0 ? '#059669' : '#0f766e' }}
                  >
                    {/* Animated shimmer overlay - only on first */}
                    {idx === 0 && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent 80%)',
                          animation: 'shimmer 5s infinite',
                          backgroundSize: '200% 100%',
                        }}
                      />
                    )}

                    {/* Top section - Recommendation */}
                    <div className="relative p-3 pb-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">
                            {idx === 0 ? t('matchDetail.aiRecommendedBet') : `${t('matchDetail.aiRecommendedBet')} #${idx + 1}`}
                          </span>
                        </div>
                        <span className="bg-white text-emerald-700 text-sm font-bold px-2.5 py-0.5 rounded-lg shadow">
                          {bet.odds.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-base font-bold text-white">{bet.type}</p>
                    </div>

                    {/* Bottom section - CTA */}
                    <div
                      className="relative px-3 py-2"
                      style={{
                        background: 'rgba(0,0,0,0.15)',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {isPremium ? (
                          <div>
                            <p className="text-white font-bold text-xs">{t('aiChat.placeBetNow', { defaultValue: 'Place this bet now' })}</p>
                            <p className="text-emerald-200 text-[10px] mt-0.5">{bet.type} @ {bet.odds.toFixed(2)}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-amber-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                              {advertiser?.texts?.freeBetLabel || t('advertiser.freeBetLabel')}
                            </p>
                            <p className="text-white font-bold text-xs">
                              {advertiser?.bonusBanner?.bonus} &times; {bet.odds.toFixed(2)} = {formatWinAmount(betPotentialWin)} {advertiser?.texts?.potentialWin || 'Win'}
                            </p>
                          </div>
                        )}
                        <svg className="w-4 h-4 text-white/70 shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Re-analyze button — shown when user returns to a previously analyzed match */}
          {isRestoredAnalysis && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => getAnalysis(true)}
                disabled={predicting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <FootballSpinner size="xs" />
                    {t('matchDetail.reanalyzing')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>
                    </svg>
                    {t('matchDetail.reanalyze')}
                    <span className="text-xs text-gray-400">({t('matchDetail.reanalyzeCost')})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Match Bonus Card after AI Analysis - hidden for PRO */}
          {!isPremium && (
            <MatchBonusCard
              match={match}
              enriched={enriched}
              advertiser={advertiser}
              user={user}
              trackClick={trackClick}
              adTexts={adTexts}
            />
          )}
        </div>
      ) : (
        <div className="card border border-gray-100 text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-primary-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <h3 className="font-bold text-lg mb-1">{t('matchDetail.aiAnalysis')}</h3>
          <p className="text-gray-500 text-sm mb-1">
            {enriched ? t('matchDetail.aiDescEnriched') : t('matchDetail.aiDescBasic')}
          </p>

          {/* Limit info badge - only show for premium or when requests remain */}
          {isPremium ? (
            <div className="bg-green-50 text-green-600 text-xs py-2 px-4 rounded-xl inline-flex items-center gap-2 mb-4">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              {t('matchDetail.proUnlimited')}
            </div>
          ) : !limitReached && (
            <div className="bg-blue-50 text-primary-600 text-xs py-2 px-4 rounded-xl inline-flex items-center gap-2 mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
              </svg>
              {t('matchDetail.freeRequestsLeft', { count: remainingRequests, total: 3 })}
            </div>
          )}

          {/* Always show the same AI analysis button */}
          <button onClick={getAnalysis} disabled={predicting} className="btn-primary flex items-center justify-center gap-2 max-w-xs mx-auto">
            {predicting ? (
              <>
                <FootballSpinner size="xs" light />
                {t('matchDetail.analyzing')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
                {t('matchDetail.getAiAnalysis')}
              </>
            )}
          </button>

          {/* Match Bonus Card with team colors - hidden for PRO */}
          {!isPremium && (
            <MatchBonusCard
              match={match}
              enriched={enriched}
              advertiser={advertiser}
              user={user}
              trackClick={trackClick}
              adTexts={adTexts}
            />
          )}
        </div>
      )}

      {/* Injuries */}
      {enriched?.injuries?.length > 0 && (
        <div className="card border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            {t('matchDetail.injuries')}
          </h3>
          <div className="space-y-2">
            {enriched.injuries.map((inj, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <img src={inj.team.logo} alt="" className="w-5 h-5 object-contain"/>
                <span className="font-medium text-gray-900">{inj.player.name}</span>
                <span className="text-gray-400 text-xs ml-auto">{inj.player.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Form */}
      <TeamFormCard enriched={enriched} match={match} t={t} />

      {/* H2H Matches */}
      <H2HList enriched={enriched} match={match} t={t} formatDate={formatDate} />

      {/* League Standings */}
      <StandingsTable enriched={enriched} match={match} t={t} />

      {/* Match Info */}
      <div className="card border border-gray-100">
        <h3 className="font-bold text-lg mb-4">{t('matchDetail.matchInfo')}</h3>
        <div className="space-y-3">
          <InfoRow icon="trophy" label={t('matchDetail.competition')} value={match.league}/>
          <InfoRow icon="calendar" label={t('matchDetail.date')} value={formatDate(match.match_date)}/>
          <InfoRow icon="clock" label={t('matchDetail.time')} value={formatTime(match.match_date)}/>
          <InfoRow icon="info" label={t('matchDetail.status')} value={statusLabel(match.status)}/>
        </div>

        {match.head_to_head && match.head_to_head.total_matches > 0 && (
          <div className="border-t border-gray-100 mt-4 pt-4">
            <h4 className="font-semibold mb-3">{t('matchDetail.headToHead', { count: match.head_to_head.total_matches })}</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary-600">{match.head_to_head.home_wins}</p>
                <p className="text-xs text-gray-500">{t('matchDetail.homeWins')}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-500">{match.head_to_head.draws}</p>
                <p className="text-xs text-gray-500">{t('matchDetail.draws')}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{match.head_to_head.away_wins}</p>
                <p className="text-xs text-gray-500">{t('matchDetail.awayWins')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-gray-400 text-xs px-4">
        {t('matchDetail.disclaimer')}
      </p>
    </>
  );
}

// ============================
// Stats Tab
// ============================
function StatsTab({ enriched, loading, match, t }) {
  if (loading) {
    return (
      <div className="card border border-gray-100 space-y-4">
        {[1,2,3,4,5].map(i => <div key={i} className="shimmer h-8 w-full rounded"/>)}
      </div>
    );
  }

  if (!enriched?.stats?.length) {
    return (
      <div className="card border border-gray-100 text-center py-10">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
        <p className="text-gray-500 font-medium">{t('matchDetail.statsNotAvailable')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('matchDetail.statsAppearDuring')}</p>
      </div>
    );
  }

  const homeStats = enriched.stats[0]?.statistics || [];
  const awayStats = enriched.stats[1]?.statistics || [];

  // Map stats into pairs
  const statPairs = homeStats.map((s, i) => ({
    label: s.type,
    home: s.value,
    away: awayStats[i]?.value,
  }));

  return (
    <div className="card border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src={enriched.stats[0]?.team?.logo} alt="" className="w-6 h-6 object-contain"/>
          <span className="text-xs font-medium text-gray-600">{enriched.stats[0]?.team?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">{enriched.stats[1]?.team?.name}</span>
          <img src={enriched.stats[1]?.team?.logo} alt="" className="w-6 h-6 object-contain"/>
        </div>
      </div>
      <div className="space-y-4">
        {statPairs.map((s, i) => (
          <StatBar key={i} label={s.label} home={s.home} away={s.away}/>
        ))}
      </div>
    </div>
  );
}

// ============================
// Lineups Tab
// ============================
function LineupsTab({ enriched, loading, t }) {
  if (loading) {
    return (
      <div className="card border border-gray-100 space-y-3">
        {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer h-6 w-full rounded"/>)}
      </div>
    );
  }

  if (!enriched?.lineups?.length) {
    return (
      <div className="card border border-gray-100 text-center py-10">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
        </svg>
        <p className="text-gray-500 font-medium">{t('matchDetail.lineupsNotAvailable')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('matchDetail.lineupsAppearBefore')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual Formation Pitch */}
      {enriched.lineups.length >= 2 && enriched.lineups[0]?.startXI?.[0]?.player?.grid && (
        <div className="card border border-gray-100 p-0 overflow-hidden">
          <FormationPitch homeLineup={enriched.lineups[0]} awayLineup={enriched.lineups[1]} />
        </div>
      )}

      {enriched.lineups.map((team, idx) => (
        <div key={idx} className="card border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <img src={team.team.logo} alt="" className="w-7 h-7 object-contain"/>
            <div>
              <h3 className="font-bold text-gray-900">{team.team.name}</h3>
              <p className="text-xs text-gray-500">{team.formation}</p>
            </div>
          </div>

          {/* Coach */}
          {team.coach?.name && (
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t('matchDetail.coach')}</span>
              <span>{team.coach.name}</span>
            </div>
          )}

          {/* Starting XI */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">{t('matchDetail.startingXI')}</p>
            <div className="space-y-1.5">
              {team.startXI?.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600">
                    {p.player.number}
                  </span>
                  <span className="text-gray-900">{p.player.name}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{p.player.pos}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Substitutes */}
          {team.substitutes?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">{t('matchDetail.substitutes')}</p>
              <div className="space-y-1.5">
                {team.substitutes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {p.player.number}
                    </span>
                    <span className="text-gray-500">{p.player.name}</span>
                    <span className="text-[10px] text-gray-300 ml-auto">{p.player.pos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================
// Shared Components
// ============================

function ProbBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 truncate">{label}</span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-xs font-bold text-gray-900 w-10 text-right">{pct}%</span>
    </div>
  );
}

function CompareBar({ label, home, away }) {
  const h = parseInt(home) || 0;
  const a = parseInt(away) || 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-blue-600">{home || '0%'}</span>
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-red-500">{away || '0%'}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div className="bg-blue-500 rounded-l-full" style={{ width: `${h}%` }}/>
        <div className="bg-red-500 rounded-r-full ml-auto" style={{ width: `${a}%` }}/>
      </div>
    </div>
  );
}

function StatBar({ label, home, away }) {
  const hVal = typeof home === 'string' ? parseInt(home) || 0 : (home ?? 0);
  const aVal = typeof away === 'string' ? parseInt(away) || 0 : (away ?? 0);
  const total = hVal + aVal || 1;
  const hPct = Math.round((hVal / total) * 100);
  const aPct = 100 - hPct;

  const displayHome = typeof home === 'string' && home.includes('%') ? home : (home ?? 0);
  const displayAway = typeof away === 'string' && away.includes('%') ? away : (away ?? 0);

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-gray-900">{displayHome}</span>
        <span className="text-xs text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900">{displayAway}</span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="flex-1 bg-gray-100 rounded-full overflow-hidden flex justify-end">
          <div className="bg-blue-500 rounded-full" style={{ width: `${hPct}%` }}/>
        </div>
        <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="bg-red-500 rounded-full" style={{ width: `${aPct}%` }}/>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  const icons = {
    trophy: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.77.938 6.003 6.003 0 01-2.77-.938"/>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    info: <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>,
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-gray-500">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">{icons[icon]}</svg>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

// ============================
// Formation Pitch Visual
// ============================
function FormationPitch({ homeLineup, awayLineup }) {
  const renderHalf = (lineup, isHome) => {
    if (!lineup?.startXI?.length) return null;

    // Group players by grid row
    const rows = {};
    lineup.startXI.forEach(p => {
      const [row, col] = (p.player.grid || '').split(':').map(Number);
      if (!row) return;
      if (!rows[row]) rows[row] = [];
      rows[row].push({ ...p.player, col });
    });
    Object.values(rows).forEach(r => r.sort((a, b) => a.col - b.col));
    const maxRow = Math.max(...Object.keys(rows).map(Number));

    return (
      <div className="relative" style={{ height: '240px' }}>
        {/* Team label */}
        <div className={`absolute ${isHome ? 'top-1' : 'bottom-1'} left-2 z-10 flex items-center gap-1.5`}>
          <img src={lineup.team.logo} alt="" className="w-4 h-4 object-contain"/>
          <span className="text-[10px] font-bold text-white/80">{lineup.formation}</span>
        </div>
        {/* Players */}
        {Object.entries(rows).map(([rowNum, players]) => {
          const row = parseInt(rowNum);
          // Home (top half): GK (row 1) at top (near their goal), FWD (max row) at bottom (near center)
          // Away (bottom half): GK (row 1) at bottom (near their goal), FWD (max row) at top (near center)
          const yPct = isHome
            ? 10 + ((row - 1) / Math.max(maxRow - 1, 1)) * 78
            : 12 + ((maxRow - row) / Math.max(maxRow - 1, 1)) * 78;
          const numInRow = players.length;

          return players.map((player, i) => {
            const xPct = ((i + 1) / (numInRow + 1)) * 100;
            return (
              <div
                key={player.id || `${rowNum}-${i}`}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                  isHome ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {player.number}
                </div>
                <span className="text-[8px] text-white/90 font-medium mt-0.5 max-w-[50px] truncate text-center leading-tight">
                  {player.name?.split(' ').pop()}
                </span>
              </div>
            );
          });
        })}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-green-700 via-green-600 to-green-700 relative rounded-lg overflow-hidden">
      {/* Pitch markings */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Field border */}
        <div className="absolute inset-[3%] border border-white/20 rounded"/>
        {/* Center line */}
        <div className="absolute top-1/2 left-[3%] right-[3%] h-px bg-white/30"/>
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/25 rounded-full"/>
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full"/>
        {/* Top penalty box (18-yard) */}
        <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[14%] border-b border-l border-r border-white/20"/>
        {/* Top goal box (6-yard) */}
        <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-b border-l border-r border-white/15"/>
        {/* Bottom penalty box (18-yard) */}
        <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[14%] border-t border-l border-r border-white/20"/>
        {/* Bottom goal box (6-yard) */}
        <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-t border-l border-r border-white/15"/>
      </div>

      {/* Home team (top half — GK at top, FWD near center) */}
      {renderHalf(homeLineup, true)}
      {/* Away team (bottom half — FWD near center, GK at bottom) */}
      {renderHalf(awayLineup, false)}
    </div>
  );
}

// ============================
// Team Form Card (last 5 results from standings)
// ============================
function TeamFormCard({ enriched, match, t }) {
  const standings = enriched?.standings;
  if (!standings?.length) return null;

  const homeId = enriched.homeId;
  const awayId = enriched.awayId;

  const homeEntry = standings.find(s => s.team?.id === homeId);
  const awayEntry = standings.find(s => s.team?.id === awayId);

  if (!homeEntry && !awayEntry) return null;

  const formBadges = (formStr) => {
    if (!formStr) return null;
    return formStr.split('').slice(-5).map((ch, i) => {
      const colors = { W: 'bg-green-500', D: 'bg-gray-400', L: 'bg-red-500' };
      return (
        <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${colors[ch] || 'bg-gray-300'}`}>
          {ch}
        </span>
      );
    });
  };

  const renderTeamRow = (entry) => {
    if (!entry) return null;
    const all = entry.all || {};
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src={entry.team?.logo} alt="" className="w-6 h-6 object-contain shrink-0"/>
          <span className="text-sm font-medium text-gray-900 truncate">{entry.team?.name}</span>
          <span className="text-xs text-gray-400 shrink-0">#{entry.rank}</span>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className="text-xs text-gray-500 shrink-0">{all.win || 0}W {all.draw || 0}D {all.lose || 0}L</span>
          <div className="flex gap-1">
            {formBadges(entry.form)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
        {t('matchDetail.form') || 'Form'}
      </h3>
      <div className="space-y-3">
        {renderTeamRow(homeEntry)}
        {renderTeamRow(awayEntry)}
      </div>
    </div>
  );
}

// ============================
// H2H Matches List
// ============================
function H2HList({ enriched, match, t, formatDate }) {
  const h2h = enriched?.h2hFixtures;
  if (!h2h?.length) return null;

  return (
    <div className="card border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>
        </svg>
        Head to Head
      </h3>
      <div className="space-y-2">
        {h2h.slice(0, 6).map((f, i) => {
          const homeGoals = f.goals?.home ?? '?';
          const awayGoals = f.goals?.away ?? '?';
          const homeName = f.teams?.home?.name || '';
          const awayName = f.teams?.away?.name || '';
          const homeWin = f.teams?.home?.winner;
          const awayWin = f.teams?.away?.winner;
          const date = f.fixture?.date ? new Date(f.fixture.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

          return (
            <div key={f.fixture?.id || i} className="flex items-center gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-[10px] text-gray-400 w-16 shrink-0">{date}</span>
              <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                <span className={`truncate text-right ${homeWin ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{homeName}</span>
                <img src={f.teams?.home?.logo} alt="" className="w-4 h-4 object-contain shrink-0"/>
              </div>
              <div className="bg-gray-100 rounded px-2 py-0.5 font-bold text-xs text-gray-700 shrink-0 min-w-[40px] text-center">
                {homeGoals} - {awayGoals}
              </div>
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <img src={f.teams?.away?.logo} alt="" className="w-4 h-4 object-contain shrink-0"/>
                <span className={`truncate ${awayWin ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{awayName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================
// League Standings Table
// ============================
function StandingsTable({ enriched, match, t }) {
  const standings = enriched?.standings;
  if (!standings?.length) return null;

  const homeId = enriched.homeId;
  const awayId = enriched.awayId;
  const leagueName = enriched.fixture?.league?.name || match.league;
  const leagueLogo = enriched.fixture?.league?.logo;

  return (
    <div className="card border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        {leagueLogo && <img src={leagueLogo} alt="" className="w-5 h-5 object-contain"/>}
        <span className="truncate">{leagueName}</span>
      </h3>
      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left pl-4 py-1.5 w-6">#</th>
              <th className="text-left py-1.5">{t('matchDetail.teamLabel') || 'Team'}</th>
              <th className="text-center py-1.5 w-8">P</th>
              <th className="text-center py-1.5 w-8">W</th>
              <th className="text-center py-1.5 w-8">D</th>
              <th className="text-center py-1.5 w-8">L</th>
              <th className="text-center py-1.5 w-8">GD</th>
              <th className="text-center pr-4 py-1.5 w-8 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, i) => {
              const isMatch = entry.team?.id === homeId || entry.team?.id === awayId;
              return (
                <tr key={entry.team?.id || i} className={`border-b border-gray-50 ${isMatch ? 'bg-primary-50/60 font-semibold' : ''}`}>
                  <td className="pl-4 py-1.5 text-gray-500">{entry.rank}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <img src={entry.team?.logo} alt="" className="w-4 h-4 object-contain shrink-0"/>
                      <span className={`truncate max-w-[100px] ${isMatch ? 'text-primary-700' : 'text-gray-700'}`}>{entry.team?.name}</span>
                    </div>
                  </td>
                  <td className="text-center text-gray-500">{entry.all?.played}</td>
                  <td className="text-center text-gray-500">{entry.all?.win}</td>
                  <td className="text-center text-gray-500">{entry.all?.draw}</td>
                  <td className="text-center text-gray-500">{entry.all?.lose}</td>
                  <td className="text-center text-gray-500">{entry.goalsDiff > 0 ? '+' : ''}{entry.goalsDiff}</td>
                  <td className={`text-center pr-4 font-bold ${isMatch ? 'text-primary-700' : 'text-gray-900'}`}>{entry.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Match Bonus Card with team colors diagonal split
function MatchBonusCard({ match, enriched, advertiser, user, trackClick, adTexts }) {
  const { t } = useTranslation();
  const matchName = `${match?.home_team?.name || ''} — ${match?.away_team?.name || ''}`;

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Header bar */}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('aiChat.exclusiveFor')}</span>
        </div>
        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">{t('aiChat.limitedTime')}</span>
      </div>

      {/* Body */}
      <div className="bg-white p-4">
        {/* Dynamic text with match name */}
        <p
          className="text-sm text-gray-700 leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: t('aiChat.bonusBannerText', {
            match: matchName,
            confidence: 62,
            bonus: advertiser?.bonusBanner?.bonus || '',
          }) }}
        />

        {/* Free bet card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 mb-3 border border-amber-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{t('advertiser.freeBetLabel')}</p>
              <p className="text-xl font-black text-gray-900">{advertiser?.bonusBanner?.bonus}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t('aiChat.bonusBannerDeposit', {
                  deposit: advertiser?.bonusBanner?.deposit || '',
                  bonus: advertiser?.bonusBanner?.bonus || '',
                })}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">{t('aiChat.noRisk')}</span>
          </div>
        </div>

        {/* 3 steps */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">1</div>
            <p className="text-[10px] text-gray-500 text-center leading-tight">{t('aiChat.step1Label')}</p>
            <p className="text-[10px] font-semibold text-gray-800">{advertiser?.bonusBanner?.deposit}</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">2</div>
            <p className="text-[10px] text-gray-500 text-center leading-tight">{t('aiChat.step2Label')}</p>
            <p className="text-[10px] font-semibold text-gray-800">{advertiser?.bonusBanner?.bonus}</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">3</div>
            <p className="text-[10px] text-gray-500 text-center leading-tight">{t('aiChat.step3Label')}</p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-gray-400 text-center mb-3">{t('aiChat.bonusDisclaimer')}</p>

        {/* CTA button */}
        <button
          onClick={() => { trackClick(user?.id, 'match_promo_banner'); window.open(getTrackingLink(user?.id, 'match_promo_banner') || advertiser?.link, '_blank', 'noopener,noreferrer'); }}
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
          {t('aiChat.bonusCta', { bonus: advertiser?.bonusBanner?.bonus || '' })}
        </button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            {t('aiChat.trustSafe')}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            {t('aiChat.trustLicensed')}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            4.9/5
          </span>
        </div>
      </div>
    </div>
  );
}


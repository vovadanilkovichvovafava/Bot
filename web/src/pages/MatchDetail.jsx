import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import api from '../api';
import footballApi from '../api/footballApi';
import { savePrediction } from '../services/predictionStore';
import ShareButton from '../components/ShareButton';
import { generateMatchShareText } from '../services/shareUtils';
import { getMatchColors } from '../utils/teamColors';
import FootballSpinner from '../components/FootballSpinner';

const TAB_KEYS = ['overview', 'stats', 'lineups'];
const PREDICTION_CACHE_KEY = 'match_predictions_cache';
const PREDICTION_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

const FREE_AI_LIMIT = 3;

// Helper functions for prediction caching
const getCachedPrediction = (matchId) => {
  try {
    const cache = JSON.parse(localStorage.getItem(PREDICTION_CACHE_KEY) || '{}');
    const entry = cache[matchId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > PREDICTION_CACHE_TTL) {
      delete cache[matchId];
      localStorage.setItem(PREDICTION_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.data;
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
  const { advertiser, trackClick } = useAdvertiser();
  const [match, setMatch] = useState(null);
  const [enriched, setEnriched] = useState(null);
  const [prediction, setPrediction] = useState(null); // { apiPrediction, claudeAnalysis }
  const [loading, setLoading] = useState(true);
  const [enrichedLoading, setEnrichedLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiRemaining, setAiRemaining] = useState(null);

  useEffect(() => {
    loadMatch();
    // Fetch AI remaining from server
    if (!user?.is_premium) {
      api.getChatLimit()
        .then(data => setAiRemaining(data.remaining ?? FREE_AI_LIMIT))
        .catch(() => setAiRemaining(FREE_AI_LIMIT));
    }
  }, [id]);

  const loadMatch = async () => {
    // For numeric IDs (API-Football), load fixture and enriched data in parallel
    const isApiFootballId = /^\d+$/.test(id);

    if (isApiFootballId) {
      try {
        // Start both requests in parallel for faster loading
        const [fixture, enrichedData] = await Promise.all([
          footballApi.getFixture(id),
          loadEnrichedDataParallel(id),
        ]);

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
          setEnriched({
            fixture,
            fixtureId: id,
            homeId: fixture.teams?.home?.id,
            awayId: fixture.teams?.away?.id,
            ...enrichedData,
          });
          setEnrichedLoading(false);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('API-Football parallel load failed:', e);
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

  // Parallel enriched data loading (returns data instead of setting state)
  const loadEnrichedDataParallel = async (fixtureId) => {
    const [prediction, odds, stats, events, lineups, injuries] = await Promise.allSettled([
      footballApi.getPrediction(fixtureId),
      footballApi.getOdds(fixtureId),
      footballApi.getFixtureStatistics(fixtureId),
      footballApi.getFixtureEvents(fixtureId),
      footballApi.getFixtureLineups(fixtureId),
      footballApi.getInjuries(fixtureId),
    ]);

    return {
      prediction: prediction.status === 'fulfilled' ? prediction.value : null,
      odds: odds.status === 'fulfilled' ? odds.value : [],
      stats: stats.status === 'fulfilled' ? stats.value : [],
      events: events.status === 'fulfilled' ? events.value : [],
      lineups: lineups.status === 'fulfilled' ? lineups.value : [],
      injuries: injuries.status === 'fulfilled' ? injuries.value : [],
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

  // Build a rich prompt for Claude with real data
  const buildAIPrompt = () => {
    const home = match.home_team?.name;
    const away = match.away_team?.name;
    let prompt = `Analyze the match ${home} vs ${away} in ${match.league}.`;

    if (enriched?.prediction) {
      const p = enriched.prediction.predictions;
      const cmp = enriched.prediction.comparison;
      prompt += `\n\nAPI-Football Data:`;
      prompt += `\nPrediction: ${p?.winner?.name || 'N/A'} (${p?.winner?.comment || ''})`;
      prompt += `\nAdvice: ${p?.advice || 'N/A'}`;
      if (p?.percent) {
        prompt += `\nWin probabilities: Home ${p.percent.home}, Draw ${p.percent.draw}, Away ${p.percent.away}`;
      }
      if (cmp) {
        prompt += `\nForm comparison: Home ${cmp.form?.home || '?'}% vs Away ${cmp.form?.away || '?'}%`;
        prompt += `\nAttack: Home ${cmp.att?.home || '?'}% vs Away ${cmp.att?.away || '?'}%`;
        prompt += `\nDefense: Home ${cmp.def?.home || '?'}% vs Away ${cmp.def?.away || '?'}%`;
      }
    }

    if (enriched?.injuries?.length > 0) {
      const homeInj = enriched.injuries.filter(i => i.team.id === enriched.homeId);
      const awayInj = enriched.injuries.filter(i => i.team.id === enriched.awayId);
      if (homeInj.length) prompt += `\n${home} injuries: ${homeInj.map(i => `${i.player.name} (${i.player.reason})`).join(', ')}`;
      if (awayInj.length) prompt += `\n${away} injuries: ${awayInj.map(i => `${i.player.name} (${i.player.reason})`).join(', ')}`;
    }

    const odds1x2 = getOdds1x2();
    if (odds1x2) {
      prompt += `\nOdds: Home ${odds1x2.home}, Draw ${odds1x2.draw}, Away ${odds1x2.away}`;
    }

    if (match.head_to_head?.total_matches > 0) {
      const h = match.head_to_head;
      prompt += `\nH2H (${h.total_matches} matches): Home ${h.home_wins}W, ${h.draws}D, Away ${h.away_wins}W`;
    }

    // Add user betting preferences
    const minOdds = user?.min_odds || 1.5;
    const maxOdds = user?.max_odds || 3.0;
    const riskLevel = user?.risk_level || 'medium';
    const riskDesc = {
      low: 'Conservative approach - focus on safer bets like double chance, under goals, favorites. Suggest 1-2% of bankroll per bet.',
      medium: 'Balanced approach - standard 1X2, over/under, BTTS bets. Suggest 2-5% of bankroll per bet.',
      high: 'Aggressive approach - value picks, accumulators, correct scores allowed. Suggest 5-10% of bankroll per bet.'
    };

    prompt += `\n\n**USER BETTING PREFERENCES (IMPORTANT - FOLLOW THESE):**`;
    prompt += `\n- Minimum acceptable odds: ${minOdds}`;
    prompt += `\n- Maximum acceptable odds: ${maxOdds}`;
    prompt += `\n- Risk level: ${riskLevel.toUpperCase()}`;
    prompt += `\n- Strategy: ${riskDesc[riskLevel]}`;
    prompt += `\n\nONLY recommend bets with odds between ${minOdds} and ${maxOdds}. Adjust your recommendations based on the ${riskLevel} risk profile.`;

    prompt += `\n\nProvide a detailed prediction with probabilities and key factors.`;
    prompt += `\n\n**IMPORTANT: End your analysis with exactly this format:**`;
    prompt += `\n[BET] Bet Type Here @ Odds Here`;
    prompt += `\nExample: [BET] Over 2.5 Goals @ 1.85`;
    prompt += `\nExample: [BET] ${home} Win @ 2.10`;
    prompt += `\nExample: [BET] Both Teams to Score @ 1.75`;
    return prompt;
  };

  const getAnalysis = async () => {
    // Check free limit for non-premium users BEFORE making request
    const isPremium = user?.is_premium;
    if (!isPremium && aiRemaining !== null && aiRemaining <= 0) {
      navigate('/pro-access?reason=limit&feature=match-analysis');
      return;
    }

    // Check cache first
    const cached = getCachedPrediction(id);
    if (cached) {
      console.log('Using cached prediction for match:', id);
      setPrediction(cached);
      return;
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
      const data = await api.aiChat(prompt);

      // Refresh AI remaining counter from server (AFTER successful response)
      if (!user?.is_premium) {
        api.getChatLimit()
          .then(data => setAiRemaining(data.remaining ?? 0))
          .catch(() => {});
      }

      const result = { apiPrediction: apiPred, claudeAnalysis: data.response };
      setPrediction(result);

      // Cache only if AI returned a real analysis (not generic fallback)
      const isGeneric = !data.response ||
        data.response.includes("I don't have real-time") ||
        data.response.includes("cannot provide") ||
        data.response.includes("I need") && data.response.includes("Confirmation");
      if (!isGeneric) {
        saveCachedPrediction(id, result);
      }

      // Auto-save prediction for history tracking
      try {
        const matchDate = match.match_date || enriched?.fixture?.fixture?.date || new Date().toISOString();
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

  // PRO users go directly to bookmaker, free users go to promo page
  const handlePromoClick = (source) => {
    if (user?.is_premium && advertiser?.link) {
      trackClick(user.id, source);
      window.open(advertiser.link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/promo?banner=${source}`);
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
        <div className="flex mt-4 border-b border-gray-200">
          {TAB_KEYS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
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
            match={match}
            enriched={enriched}
            enrichedLoading={enrichedLoading}
            prediction={prediction}
            predicting={predicting}
            getAnalysis={getAnalysis}
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
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab enriched={enriched} loading={enrichedLoading} match={match} t={t} />
        )}
        {activeTab === 'lineups' && (
          <LineupsTab enriched={enriched} loading={enrichedLoading} t={t} />
        )}
      </div>
     </div>
    </div>
  );
}

// ============================
// Overview Tab
// ============================
function OverviewTab({ match, enriched, enrichedLoading, prediction, predicting, getAnalysis, user, aiRemaining, formatDate, formatTime, statusLabel, getOdds1x2, advertiser, trackClick, navigate, t }) {
  const pred = prediction?.apiPrediction;
  const odds1x2 = getOdds1x2();

  // Check AI limit status (server-based)
  const isPremium = user?.is_premium;
  const remaining = isPremium ? 999 : (aiRemaining ?? FREE_AI_LIMIT);
  const limitReached = !isPremium && aiRemaining !== null && aiRemaining <= 0;
  const remainingRequests = Math.max(0, remaining);

  // Use i18n for all promo texts (never use advertiser.texts directly)
  const adTexts = {
    promoTitle: t('advertiser.promoTitle', { bonus: advertiser?.bonusAmount || '' }),
    promoCtaFree: t('advertiser.promoCtaFree'),
  };
  // Parse AI recommended bet from analysis
  const parseRecommendedBet = () => {
    if (!prediction?.claudeAnalysis) return null;
    const betMatch = prediction.claudeAnalysis.match(/\[BET\]\s*(.+?)\s*@\s*([\d.]+)/i);
    if (betMatch) {
      return {
        type: betMatch[1].trim(),
        odds: parseFloat(betMatch[2]),
        homeTeam: match.home_team?.name,
        awayTeam: match.away_team?.name,
        league: match.league,
        date: formatDate(match.match_date),
      };
    }
    return null;
  };

  const recommendedBet = parseRecommendedBet();

  // Calculate potential win for free bet card
  const bonusNumeric = parseInt((advertiser?.bonusAmount || '').replace(/[^\d]/g, ''), 10) || 0;
  const potentialWin = recommendedBet ? Math.round(bonusNumeric * recommendedBet.odds) : 0;
  const formatWinAmount = (val) => {
    const currency = advertiser?.currency || '€';
    const original = advertiser?.bonusAmount || '';
    if (original.indexOf(currency) === 0) return `${currency}${val.toLocaleString('en-US')}`;
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

          {/* AI Recommended Bet - Two-level card with free bet CTA */}
          {recommendedBet && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {/* Top: Recommendation */}
              <div className={`bg-gradient-to-r from-green-500 to-emerald-500 p-4 ${bonusNumeric > 0 && !isPremium ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-sm text-white/80 font-semibold uppercase tracking-wide">{t('matchDetail.aiRecommendedBet')}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white text-lg">{recommendedBet.type}</p>
                  <div className="bg-white text-green-700 font-bold text-lg px-4 py-1.5 rounded-xl shadow-sm">
                    {recommendedBet.odds.toFixed(2)}
                  </div>
                </div>
              </div>
              {/* Bottom: Free Bet CTA - hidden for PRO users */}
              {bonusNumeric > 0 && !isPremium && (
                <div
                  onClick={() => {
                    if (isPremium && advertiser?.link) {
                      trackClick(user.id, 'match_ai_bet');
                      window.open(advertiser.link, '_blank', 'noopener,noreferrer');
                    } else {
                      navigate('/promo?banner=match_ai_bet');
                    }
                  }}
                  className="bg-gradient-to-r from-green-700 to-emerald-700 rounded-b-2xl p-4 cursor-pointer hover:from-green-800 hover:to-emerald-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">
                        {advertiser?.texts?.freeBetLabel || t('advertiser.freeBetLabel')}
                      </p>
                      <p className="text-white font-bold text-sm">
                        {advertiser?.bonusAmount} &times; {recommendedBet.odds.toFixed(2)} = {formatWinAmount(potentialWin)} {advertiser?.texts?.potentialWin || 'Win'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-white/90 shrink-0 ml-3">
                      <span className="text-xs font-medium max-w-[80px] text-right leading-tight">
                        {advertiser?.texts?.betAndTakeIt || 'Use it now!'}
                      </span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
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

// Match Bonus Card with team colors diagonal split
function MatchBonusCard({ match, enriched, advertiser, user, trackClick, adTexts }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Get team IDs from enriched data or match data
  const homeTeamId = enriched?.homeId || enriched?.fixture?.teams?.home?.id;
  const awayTeamId = enriched?.awayId || enriched?.fixture?.teams?.away?.id;

  // Get team colors with contrast check
  const { homeColor, awayColor } = getMatchColors(homeTeamId, awayTeamId);

  return (
    <div
      onClick={() => {
        if (user?.is_premium && advertiser?.link) {
          trackClick(user.id, 'match_promo_banner');
          window.open(advertiser.link, '_blank', 'noopener,noreferrer');
        } else {
          navigate('/promo?banner=match_promo_banner');
        }
      }}
      className="block mt-4 relative overflow-hidden rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] cursor-pointer"
      style={{ minHeight: '120px' }}
    >
      {/* Diagonal split background */}
      <div className="absolute inset-0">
        {/* Home team color - left side */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: homeColor,
            clipPath: 'polygon(0 0, 65% 0, 35% 100%, 0 100%)'
          }}
        />
        {/* Away team color - right side */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: awayColor,
            clipPath: 'polygon(65% 0, 100% 0, 100% 100%, 35% 100%)'
          }}
        />
        {/* Diagonal line separator */}
        <div
          className="absolute inset-0 bg-white/30"
          style={{
            clipPath: 'polygon(63% 0, 67% 0, 37% 100%, 33% 100%)'
          }}
        />
      </div>

      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" style={{animation: 'shine 6s infinite'}}/>

      {/* Sparkle decoration */}
      <div className="absolute top-2 right-3 text-yellow-200 animate-pulse text-lg">✨</div>

      {/* Content */}
      <div className="relative flex items-center justify-between h-full p-4" style={{ minHeight: '120px' }}>
        {/* Home team - left side */}
        <div className="flex flex-col items-center gap-1 z-10 w-16">
          <div className="w-14 h-14 bg-white/90 rounded-xl p-1.5 flex items-center justify-center shadow-lg">
            <img
              src={match?.home_team?.logo}
              alt={match?.home_team?.name}
              className="w-full h-full object-contain"
              onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
            />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow-lg max-w-[70px] truncate">
            {match?.home_team?.name}
          </span>
        </div>

        {/* Center - Promo text */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 px-2">
          <span className="text-white/80 font-bold text-xs mb-1 drop-shadow">{t('matchDetail.vs')}</span>
          <p className="font-black text-sm sm:text-base leading-tight drop-shadow-lg text-center mb-2 max-w-[160px]">
            {adTexts?.promoTitle || t('matchDetail.ad1Title')}
          </p>
          <div className="bg-white text-gray-800 font-bold px-4 py-1.5 rounded-xl text-xs shadow-lg hover:bg-gray-100 transition-colors">
            {adTexts?.promoCtaFree || t('matchDetail.ad1Cta', { bonus: advertiser?.bonusAmount || '' })}
          </div>
        </div>

        {/* Away team - right side */}
        <div className="flex flex-col items-center gap-1 z-10 w-16">
          <div className="w-14 h-14 bg-white/90 rounded-xl p-1.5 flex items-center justify-center shadow-lg">
            <img
              src={match?.away_team?.logo}
              alt={match?.away_team?.name}
              className="w-full h-full object-contain"
              onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
            />
          </div>
          <span className="text-[10px] font-bold text-white text-center leading-tight drop-shadow-lg max-w-[70px] truncate">
            {match?.away_team?.name}
          </span>
        </div>
      </div>
    </div>
  );
}

// Native Ad Block with rotating ad texts
function NativeAdBlock({ advertiser, matchId }) {
  const { t } = useTranslation();
  const bonus = advertiser?.bonusAmount || '';
  // 6 ad text variants for rotation (based on match ID for consistency)
  const adVariants = [
    // Variant 1: Main (recommended)
    {
      title: t('matchDetail.ad1Title'),
      body: t('matchDetail.ad1Body'),
      features: [
        { icon: '🎁', text: t('matchDetail.ad1Feature1', { bonus }) },
        { icon: '⚡', text: t('matchDetail.ad1Feature2') },
        { icon: '📱', text: t('matchDetail.ad1Feature3') },
        { icon: '🔒', text: t('matchDetail.ad1Feature4') },
      ],
      cta: t('matchDetail.ad1Cta', { bonus }),
    },
    // Variant 2: Short
    {
      title: t('matchDetail.ad2Title'),
      body: t('matchDetail.ad2Body', { bonus }),
      features: [],
      cta: t('matchDetail.ad2Cta', { bonus }),
    },
    // Variant 3: Motivational
    {
      title: t('matchDetail.ad3Title'),
      body: t('matchDetail.ad3Body'),
      features: [
        { icon: '•', text: t('matchDetail.ad3Feature1', { bonus }) },
        { icon: '•', text: t('matchDetail.ad3Feature2') },
        { icon: '•', text: t('matchDetail.ad3Feature3') },
      ],
      cta: t('matchDetail.ad3Cta', { bonus }),
    },
    // Variant 4: Social proof
    {
      title: t('matchDetail.ad4Title'),
      body: t('matchDetail.ad4Body'),
      features: [
        { icon: '✔', text: t('matchDetail.ad4Feature1', { bonus }) },
        { icon: '✔', text: t('matchDetail.ad4Feature2') },
        { icon: '✔', text: t('matchDetail.ad4Feature3') },
        { icon: '✔', text: t('matchDetail.ad4Feature4') },
      ],
      cta: t('matchDetail.ad4Cta', { bonus }),
    },
    // Variant 5: Urgency (for matches starting soon)
    {
      title: t('matchDetail.ad5Title'),
      body: t('matchDetail.ad5Body'),
      features: [
        { icon: '⚡', text: t('matchDetail.ad5Feature1') },
        { icon: '🎁', text: t('matchDetail.ad5Feature2', { bonus }) },
        { icon: '✓', text: t('matchDetail.ad5Feature3') },
      ],
      cta: t('matchDetail.ad5Cta', { bonus }),
    },
    // Variant 6: Focus on odds
    {
      title: t('matchDetail.ad6Title'),
      body: t('matchDetail.ad6Body', { bonus }),
      features: [],
      cta: t('matchDetail.ad6Cta', { bonus }),
    },
  ];

  // Select variant based on matchId for consistency (same match = same ad)
  const variantIndex = matchId ? Math.abs(parseInt(matchId, 10) || 0) % adVariants.length : 0;
  const ad = adVariants[variantIndex];

  return (
    <div className="mt-6 pt-4 border-t border-gray-100">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <h4 className="font-bold text-gray-900 mb-2">{ad.title}</h4>
        <p className="text-sm text-gray-600 mb-3">{ad.body}</p>

        {ad.features.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {ad.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/promo?banner=match_ad_cta')}
          className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-4 rounded-xl text-center text-sm hover:opacity-95 transition-opacity shadow-lg shadow-orange-500/20"
        >
          👉 {ad.cta}
        </button>
      </div>
    </div>
  );
}

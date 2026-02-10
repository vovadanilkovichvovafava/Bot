import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import footballApi from '../api/footballApi';
import { savePrediction } from '../services/predictionStore';

const TABS = ['Overview', 'Stats', 'Lineups'];

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [enriched, setEnriched] = useState(null);
  const [prediction, setPrediction] = useState(null); // { apiPrediction, claudeAnalysis }
  const [loading, setLoading] = useState(true);
  const [enrichedLoading, setEnrichedLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    loadMatch();
  }, [id]);

  const loadMatch = async () => {
    try {
      // First try backend (Football-Data.org)
      const data = await api.getMatchDetail(id);
      if (data) {
        setMatch(data);
        // Load enriched data from API-Football
        loadEnrichedData(data);
        return;
      }
    } catch (e) {
      console.warn('Backend match not found, trying API-Football:', e);
    }

    // Fallback: Load directly from API-Football (for Today tab matches)
    try {
      const fixture = await footballApi.getFixture(id);
      if (fixture) {
        // Convert API-Football format to our format
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
        // Load enriched data
        loadEnrichedDataFromFixture(fixture);
        return;
      }
    } catch (e) {
      console.error('API-Football fixture not found:', e);
    }

    setLoading(false);
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
      const result = { apiPrediction: apiPred, claudeAnalysis: data.response };
      setPrediction(result);

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
        claudeAnalysis: 'Failed to get AI analysis. Please try again.',
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
    if (!s) return 'Upcoming';
    const map = { scheduled: 'Upcoming', timed: 'Upcoming', in_play: 'Live', paused: 'Half Time', finished: 'Finished' };
    return map[s.toLowerCase()] || s;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#F0F2F5]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-gray-500 text-sm">Loading match...</p>
          </div>
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
            Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Match Not Found</h2>
            <p className="text-gray-500 text-sm mb-6">The match may have ended or data is unavailable</p>
            <button
              onClick={() => navigate('/matches')}
              className="bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Back to Matches
            </button>
          </div>
        </div>
      </div>
    );
  }

  const odds1x2 = getOdds1x2();

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
              <span className="text-2xl font-bold text-gray-300">VS</span>
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

          {/* Odds row */}
          {odds1x2 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg py-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Home</p>
                  <p className="text-sm font-bold text-gray-900">{odds1x2.home}</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Draw</p>
                  <p className="text-sm font-bold text-gray-900">{odds1x2.draw}</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">Away</p>
                  <p className="text-sm font-bold text-gray-900">{odds1x2.away}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1">{odds1x2.bookmaker}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex mt-4 border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-400 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4 pb-8">
        {activeTab === 'Overview' && (
          <OverviewTab
            match={match}
            enriched={enriched}
            enrichedLoading={enrichedLoading}
            prediction={prediction}
            predicting={predicting}
            getAnalysis={getAnalysis}
            user={user}
            formatDate={formatDate}
            formatTime={formatTime}
            statusLabel={statusLabel}
            getOdds1x2={() => getOdds1x2()}
          />
        )}
        {activeTab === 'Stats' && (
          <StatsTab enriched={enriched} loading={enrichedLoading} match={match} />
        )}
        {activeTab === 'Lineups' && (
          <LineupsTab enriched={enriched} loading={enrichedLoading} />
        )}
      </div>
     </div>
    </div>
  );
}

// ============================
// Overview Tab
// ============================
function OverviewTab({ match, enriched, enrichedLoading, prediction, predicting, getAnalysis, user, formatDate, formatTime, statusLabel, getOdds1x2 }) {
  const pred = prediction?.apiPrediction;
  const odds1x2 = getOdds1x2();

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

  return (
    <>
      {/* Combined AI Analysis - shown only after button click */}
      {prediction ? (
        <div className="card border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            <h3 className="font-bold text-gray-900">AI Analysis</h3>
            <div className="ml-auto flex gap-1.5">
              {pred && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Data</span>}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">Claude AI</span>
            </div>
          </div>

          {/* API-Football Prediction - win probability */}
          {pred?.predictions?.percent && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Win Probability</p>
              <div className="space-y-2">
                <ProbBar label={match.home_team?.name} pct={parseInt(pred.predictions.percent.home)} color="bg-blue-500"/>
                <ProbBar label="Draw" pct={parseInt(pred.predictions.percent.draw)} color="bg-gray-400"/>
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
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Team Comparison</p>
              <CompareBar label="Form" home={pred.comparison.form?.home} away={pred.comparison.form?.away}/>
              <CompareBar label="Attack" home={pred.comparison.att?.home} away={pred.comparison.att?.away}/>
              <CompareBar label="Defense" home={pred.comparison.def?.home} away={pred.comparison.def?.away}/>
              <CompareBar label="Overall" home={pred.comparison.total?.home} away={pred.comparison.total?.away}/>
            </div>
          )}

          {/* Claude AI Analysis text */}
          {(pred?.predictions || pred?.comparison) && <div className="border-t border-gray-100 my-4"/>}
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Expert Analysis</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {prediction.claudeAnalysis?.split('\n').map((line, i) => {
              const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }}/>;
            })}
          </div>

          {/* AI Recommended Bet - Display only */}
          {recommendedBet && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-xs text-green-700 font-semibold uppercase">AI Recommended Bet</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900">{recommendedBet.type}</p>
                  <div className="bg-green-600 text-white font-bold text-lg px-3 py-1 rounded-lg">
                    {recommendedBet.odds.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card border border-gray-100 text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-primary-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <h3 className="font-bold text-lg mb-1">AI Analysis</h3>
          <p className="text-gray-500 text-sm mb-1">
            {enriched ? 'Win probabilities, team comparison & expert analysis' : 'Get detailed prediction & betting recommendation'}
          </p>
          <div className="bg-blue-50 text-primary-600 text-xs py-2 px-4 rounded-xl inline-flex items-center gap-2 mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
            </svg>
            Uses 1 of your 3 free AI requests
          </div>
          <button onClick={getAnalysis} disabled={predicting} className="btn-primary flex items-center justify-center gap-2 max-w-xs mx-auto">
            {predicting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
                Get AI Analysis
              </>
            )}
          </button>
        </div>
      )}

      {/* Injuries */}
      {enriched?.injuries?.length > 0 && (
        <div className="card border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            Injuries & Suspensions
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
        <h3 className="font-bold text-lg mb-4">Match Info</h3>
        <div className="space-y-3">
          <InfoRow icon="trophy" label="Competition" value={match.league}/>
          <InfoRow icon="calendar" label="Date" value={formatDate(match.match_date)}/>
          <InfoRow icon="clock" label="Time" value={formatTime(match.match_date)}/>
          <InfoRow icon="info" label="Status" value={statusLabel(match.status)}/>
        </div>

        {match.head_to_head && match.head_to_head.total_matches > 0 && (
          <div className="border-t border-gray-100 mt-4 pt-4">
            <h4 className="font-semibold mb-3">Head to Head ({match.head_to_head.total_matches} matches)</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary-600">{match.head_to_head.home_wins}</p>
                <p className="text-xs text-gray-500">Home Wins</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-500">{match.head_to_head.draws}</p>
                <p className="text-xs text-gray-500">Draws</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{match.head_to_head.away_wins}</p>
                <p className="text-xs text-gray-500">Away Wins</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-gray-400 text-xs px-4">
        Please bet responsibly. Predictions do not guarantee results.
      </p>
    </>
  );
}

// ============================
// Stats Tab
// ============================
function StatsTab({ enriched, loading, match }) {
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
        <p className="text-gray-500 font-medium">Statistics not available yet</p>
        <p className="text-gray-400 text-sm mt-1">Stats appear during and after the match</p>
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
function LineupsTab({ enriched, loading }) {
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
        <p className="text-gray-500 font-medium">Lineups not available yet</p>
        <p className="text-gray-400 text-sm mt-1">Lineups usually appear ~1 hour before kick-off</p>
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
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Coach</span>
              <span>{team.coach.name}</span>
            </div>
          )}

          {/* Starting XI */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Starting XI</p>
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
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Substitutes</p>
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

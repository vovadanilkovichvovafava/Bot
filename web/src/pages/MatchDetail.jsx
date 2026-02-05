import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    loadMatch();
  }, [id]);

  const loadMatch = async () => {
    try {
      const data = await api.getMatchDetail(id);
      setMatch(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysis = async () => {
    setPredicting(true);
    try {
      const prompt = `Analyze the match ${match.home_team?.name} vs ${match.away_team?.name} in ${match.league}. Provide a detailed prediction with probabilities and betting recommendation.`;
      const data = await api.aiChat(prompt);
      setPrediction({ analysis: data.response });
    } catch (e) {
      console.error(e);
      setPrediction({ analysis: 'Failed to get AI analysis. Please try again.' });
    } finally {
      setPredicting(false);
    }
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
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white px-5 pt-4 pb-6">
            <div className="shimmer h-6 w-48 mx-auto mb-4"/>
            <div className="shimmer h-32 w-full rounded-xl"/>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F0F2F5]">
        <p className="text-gray-500">Match not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
     <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">{match.league}</h1>
          <div className="flex gap-2">
            <button className="w-10 h-10 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
              </svg>
            </button>
            <button className="w-10 h-10 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
              </svg>
            </button>
          </div>
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
              <p className="text-xs text-gray-400">Home</p>
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
              <p className="text-xs text-gray-400">Away</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* AI Analysis Section */}
        {prediction ? (
          <div className="card border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <h3 className="font-bold text-gray-900">AI Analysis</h3>
              <span className="ml-auto badge bg-primary-100 text-primary-700">Claude AI</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {prediction.analysis?.split('\n').map((line, i) => {
                const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }}/>;
              })}
            </div>
          </div>
        ) : (
          <div className="card border border-gray-100 text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-primary-50 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-2">AI Match Analysis</h3>
            <p className="text-gray-500 text-sm mb-4">
              Get detailed analysis from Claude AI including predictions, team form, and betting recommendations.
            </p>
            <div className="bg-blue-50 text-primary-600 text-sm py-2 px-4 rounded-xl inline-flex items-center gap-2 mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
              </svg>
              This uses 1 of your {user?.daily_limit || 10} daily AI requests
            </div>
            <button
              onClick={getAnalysis}
              disabled={predicting}
              className="btn-primary flex items-center justify-center gap-2 max-w-xs mx-auto"
            >
              {predicting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
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
            <>
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
            </>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs px-4 pb-6">
          Please bet responsibly. Predictions do not guarantee results.
        </p>
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

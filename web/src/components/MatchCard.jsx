import { useNavigate } from 'react-router-dom';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function isMatchSoon(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  return diff > 0 && diff < 3 * 60 * 60 * 1000;
}

function isLive(status) {
  return ['in_play', 'live', 'paused', 'halftime'].includes(status?.toLowerCase());
}

export default function MatchCard({ match, showLeague = true, compact = false }) {
  const navigate = useNavigate();
  const live = isLive(match.status);
  const soon = isMatchSoon(match.match_date);

  if (compact) {
    return (
      <div
        onClick={() => navigate(`/match/${match.id}`)}
        className="card cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between mb-2">
          {showLeague && <span className="badge-league">{match.league}</span>}
          <div className="flex items-center gap-2 ml-auto">
            {soon && <span className="badge-soon">Soon</span>}
            {live && <span className="badge-live">Live</span>}
            <span className="text-sm text-gray-500">{formatTime(match.match_date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{match.home_team?.name}</p>
            <p className="font-medium text-gray-900">{match.away_team?.name}</p>
          </div>
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="card cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        {showLeague && <span className="badge-league">{match.league}</span>}
        <span className="text-sm text-gray-500 ml-auto">
          {formatDate(match.match_date)} &bull; {formatTime(match.match_date)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          {match.home_team?.logo && (
            <img src={match.home_team.logo} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" onError={(e) => e.target.style.display='none'}/>
          )}
          <p className="font-medium text-sm text-gray-900 leading-tight">{match.home_team?.name}</p>
        </div>

        <div className="px-4 text-center">
          {live ? (
            <div>
              <span className="text-xl font-bold text-gray-900">
                {match.home_score ?? 0} - {match.away_score ?? 0}
              </span>
              <span className="badge-live block mt-1">Live</span>
            </div>
          ) : (
            <span className="text-gray-400 font-semibold text-lg">VS</span>
          )}
        </div>

        <div className="flex-1 text-center">
          {match.away_team?.logo && (
            <img src={match.away_team.logo} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" onError={(e) => e.target.style.display='none'}/>
          )}
          <p className="font-medium text-sm text-gray-900 leading-tight">{match.away_team?.name}</p>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/match/${match.id}`); }}
        className="mt-3 w-full py-2 text-primary-600 text-sm font-medium bg-primary-50 rounded-xl flex items-center justify-center gap-1"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
        </svg>
        Tap for AI Analysis
      </button>
    </div>
  );
}

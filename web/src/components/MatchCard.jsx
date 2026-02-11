import { useNavigate } from 'react-router-dom';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function isLive(status) {
  return ['in_play', 'live', 'paused', 'halftime'].includes(status?.toLowerCase());
}

export default function MatchCard({ match, showLeague = true, compact = false }) {
  const navigate = useNavigate();
  const live = isLive(match.status);

  // Compact card style - team logos on left, names, time/score on right
  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="bg-white cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center py-3 px-4">
        {/* Teams column */}
        <div className="flex-1 min-w-0">
          {/* Home team */}
          <div className="flex items-center gap-2.5 mb-1.5">
            {match.home_team?.logo ? (
              <img
                src={match.home_team.logo}
                alt=""
                className="w-5 h-5 object-contain flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0" />
            )}
            <span className="text-sm text-gray-900 truncate">{match.home_team?.name}</span>
          </div>
          {/* Away team */}
          <div className="flex items-center gap-2.5">
            {match.away_team?.logo ? (
              <img
                src={match.away_team.logo}
                alt=""
                className="w-5 h-5 object-contain flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0" />
            )}
            <span className="text-sm text-gray-900 truncate">{match.away_team?.name}</span>
          </div>
        </div>

        {/* Time/Score column */}
        <div className="flex-shrink-0 text-right ml-3">
          {live ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-bold text-gray-900">{match.home_score ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">{match.away_score ?? 0}</span>
              </div>
              <span className="text-[10px] text-red-500 font-medium mt-0.5">LIVE</span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">{formatTime(match.match_date)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

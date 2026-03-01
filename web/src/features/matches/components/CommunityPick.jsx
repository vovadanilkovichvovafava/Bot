import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../shared/api';

const PICK_CACHE_KEY = 'community_picks_cache';

function getCachedStats(matchId) {
  try {
    const cache = JSON.parse(localStorage.getItem(PICK_CACHE_KEY) || '{}');
    const entry = cache[matchId];
    if (!entry) return null;
    if (Date.now() - entry.ts > 5 * 60 * 1000) return null; // 5 min TTL
    return entry.data;
  } catch { return null; }
}

function setCachedStats(matchId, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(PICK_CACHE_KEY) || '{}');
    const now = Date.now();
    Object.keys(cache).forEach(k => {
      if (now - cache[k].ts > 30 * 60 * 1000) delete cache[k];
    });
    cache[matchId] = { data, ts: now };
    localStorage.setItem(PICK_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export default function CommunityPick({ matchId, homeTeam, awayTeam }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [voting, setVoting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const cached = getCachedStats(matchId);
    if (cached) {
      setStats(cached);
      setLoaded(true);
    }
    api.getCommunityPick(matchId)
      .then(data => {
        setStats(data);
        setCachedStats(matchId, data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [matchId]);

  const handleVote = async (pick) => {
    if (voting) return;
    setVoting(true);
    try {
      const data = await api.voteCommunityPick(matchId, pick);
      setStats(data);
      setCachedStats(matchId, data);
    } catch {}
    setVoting(false);
  };

  if (!loaded) {
    return (
      <div className="card border border-gray-100">
        <div className="shimmer h-16 w-full rounded-xl" />
      </div>
    );
  }

  const userPick = stats?.user_pick;
  const hasVoted = !!userPick;
  const total = stats?.total || 0;
  const homePct = total > 0 ? Math.round((stats.home / total) * 100) : 33;
  const drawPct = total > 0 ? Math.round((stats.draw / total) * 100) : 34;
  const awayPct = total > 0 ? 100 - homePct - drawPct : 33;

  const homeName = homeTeam?.name?.split(' ').slice(-1)[0] || t('matchDetail.home');
  const awayName = awayTeam?.name?.split(' ').slice(-1)[0] || t('matchDetail.away');

  return (
    <div className="card border border-gray-100">
      {!hasVoted ? (
        /* Voting state */
        <>
          <p className="text-center text-sm font-bold text-gray-800 mb-3">
            {t('communityPick.chooseWinner')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleVote('home')}
              disabled={voting}
              className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-xs text-blue-500 font-medium uppercase">{t('communityPick.win1')}</span>
              <span className="text-sm font-bold text-blue-700">{homeName}</span>
            </button>
            <button
              onClick={() => handleVote('draw')}
              disabled={voting}
              className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-xs text-gray-500 font-medium uppercase">{t('communityPick.draw')}</span>
              <span className="text-sm font-bold text-gray-700">X</span>
            </button>
            <button
              onClick={() => handleVote('away')}
              disabled={voting}
              className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-xs text-red-500 font-medium uppercase">{t('communityPick.win2')}</span>
              <span className="text-sm font-bold text-red-700">{awayName}</span>
            </button>
          </div>
        </>
      ) : (
        /* Results — single horizontal bar split into 3 sections */
        <>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-violet-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
            </svg>
            <h3 className="font-bold text-gray-900 text-sm">{t('communityPick.title')}</h3>
            {total > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                {total.toLocaleString()} {t('communityPick.votes')}
              </span>
            )}
          </div>

          {/* Single horizontal bar */}
          <div className="flex w-full h-10 rounded-xl overflow-hidden">
            {/* Home (П1) */}
            <button
              onClick={() => handleVote('home')}
              disabled={voting || userPick === 'home'}
              className={`relative flex items-center justify-center transition-all duration-500 ${
                userPick === 'home' ? 'bg-blue-500' : 'bg-blue-400 hover:bg-blue-500'
              }`}
              style={{ width: `${homePct}%`, minWidth: homePct > 0 ? '40px' : '0' }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-white font-bold text-sm">{homePct}%</span>
                <span className="text-white/80 text-[10px] font-medium uppercase">{t('communityPick.win1')}</span>
              </div>
              {userPick === 'home' && (
                <svg className="absolute top-1 right-1 w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>

            {/* Draw (X) */}
            <button
              onClick={() => handleVote('draw')}
              disabled={voting || userPick === 'draw'}
              className={`relative flex items-center justify-center transition-all duration-500 border-x border-white/30 ${
                userPick === 'draw' ? 'bg-gray-500' : 'bg-gray-400 hover:bg-gray-500'
              }`}
              style={{ width: `${drawPct}%`, minWidth: drawPct > 0 ? '40px' : '0' }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-white font-bold text-sm">{drawPct}%</span>
                <span className="text-white/80 text-[10px] font-medium uppercase">X</span>
              </div>
              {userPick === 'draw' && (
                <svg className="absolute top-1 right-1 w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>

            {/* Away (П2) */}
            <button
              onClick={() => handleVote('away')}
              disabled={voting || userPick === 'away'}
              className={`relative flex items-center justify-center transition-all duration-500 ${
                userPick === 'away' ? 'bg-red-500' : 'bg-red-400 hover:bg-red-500'
              }`}
              style={{ width: `${awayPct}%`, minWidth: awayPct > 0 ? '40px' : '0' }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-white font-bold text-sm">{awayPct}%</span>
                <span className="text-white/80 text-[10px] font-medium uppercase">{t('communityPick.win2')}</span>
              </div>
              {userPick === 'away' && (
                <svg className="absolute top-1 right-1 w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

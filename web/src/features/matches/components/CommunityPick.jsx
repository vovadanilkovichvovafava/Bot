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
    // Cleanup old entries
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
        <div className="shimmer h-20 w-full rounded-xl" />
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
      {/* Header */}
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

      {!hasVoted ? (
        /* Voting buttons */
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
      ) : (
        /* Results view */
        <div className="space-y-2.5">
          {/* Progress bars */}
          <PickBar
            label={homeName}
            tag={t('communityPick.win1')}
            pct={homePct}
            count={stats.home}
            isSelected={userPick === 'home'}
            color="blue"
            onRevote={() => handleVote('home')}
            voting={voting}
          />
          <PickBar
            label="X"
            tag={t('communityPick.draw')}
            pct={drawPct}
            count={stats.draw}
            isSelected={userPick === 'draw'}
            color="gray"
            onRevote={() => handleVote('draw')}
            voting={voting}
          />
          <PickBar
            label={awayName}
            tag={t('communityPick.win2')}
            pct={awayPct}
            count={stats.away}
            isSelected={userPick === 'away'}
            color="red"
            onRevote={() => handleVote('away')}
            voting={voting}
          />
        </div>
      )}
    </div>
  );
}

function PickBar({ label, tag, pct, count, isSelected, color, onRevote, voting }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-100',
      fill: 'bg-blue-500',
      text: 'text-blue-700',
      ring: 'ring-blue-500',
    },
    gray: {
      bg: 'bg-gray-100',
      fill: 'bg-gray-400',
      text: 'text-gray-700',
      ring: 'ring-gray-400',
    },
    red: {
      bg: 'bg-red-100',
      fill: 'bg-red-500',
      text: 'text-red-700',
      ring: 'ring-red-500',
    },
  };
  const c = colorMap[color];

  return (
    <button
      onClick={onRevote}
      disabled={voting || isSelected}
      className={`w-full text-left rounded-xl p-2.5 transition-all ${c.bg} ${isSelected ? `ring-2 ${c.ring}` : 'opacity-75 hover:opacity-100'}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${c.text}`}>{label}</span>
          {isSelected && (
            <svg className={`w-3.5 h-3.5 ${c.text}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          )}
        </div>
        <span className={`text-sm font-bold ${c.text}`}>{pct}%</span>
      </div>
      <div className={`h-2 rounded-full bg-white/60 overflow-hidden`}>
        <div
          className={`h-full rounded-full ${c.fill} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

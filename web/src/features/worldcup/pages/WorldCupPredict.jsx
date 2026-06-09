import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'wc_predict_picks_v1';

// 12 groups (top-3 used for the knockout seeding)
const G = {
  A: [['Mexico', 'mx'], ['South Africa', 'za'], ['South Korea', 'kr']],
  B: [['Canada', 'ca'], ['Bosnia & H.', 'ba'], ['Qatar', 'qa']],
  C: [['Brazil', 'br'], ['Morocco', 'ma'], ['Haiti', 'ht']],
  D: [['United States', 'us'], ['Paraguay', 'py'], ['Australia', 'au']],
  E: [['Germany', 'de'], ['Curaçao', 'cw'], ['Ivory Coast', 'ci']],
  F: [['Netherlands', 'nl'], ['Japan', 'jp'], ['Sweden', 'se']],
  G: [['Belgium', 'be'], ['Egypt', 'eg'], ['Iran', 'ir']],
  H: [['Spain', 'es'], ['Cape Verde', 'cv'], ['Saudi Arabia', 'sa']],
  I: [['France', 'fr'], ['Senegal', 'sn'], ['Iraq', 'iq']],
  J: [['Argentina', 'ar'], ['Algeria', 'dz'], ['Austria', 'at']],
  K: [['Portugal', 'pt'], ['DR Congo', 'cd'], ['Uzbekistan', 'uz']],
  L: [['England', 'gb-eng'], ['Croatia', 'hr'], ['Ghana', 'gh']],
};

const team = (g, pos) => {
  const [name, code] = G[g][pos];
  return { id: `${g}${pos + 1}`, name, code, logo: `https://flagcdn.com/w80/${code}.png` };
};

// 32-team Round of 32 seeding (1st + 2nd of each group + 8 best 3rd-placed), in matchup order
const SEED = [
  team('A', 0), team('B', 1), team('C', 0), team('D', 1),
  team('E', 0), team('F', 1), team('G', 0), team('H', 1),
  team('I', 0), team('J', 1), team('K', 0), team('L', 1),
  team('B', 0), team('A', 1), team('D', 0), team('C', 1),
  team('F', 0), team('E', 1), team('H', 0), team('G', 1),
  team('J', 0), team('I', 1), team('L', 0), team('K', 1),
  team('A', 2), team('C', 2), team('B', 2), team('D', 2),
  team('E', 2), team('G', 2), team('F', 2), team('H', 2),
];

const ROUND_KEYS = ['r32', 'r16', 'qf', 'sf', 'final'];

function computeRounds(picks) {
  const rounds = [];
  let teams = SEED;
  for (let r = 0; r < 5; r++) {
    const matches = [];
    for (let i = 0; i < teams.length; i += 2) {
      matches.push([teams[i] || null, teams[i + 1] || null]);
    }
    rounds.push(matches);
    teams = matches.map((_, idx) => picks[`r${r}-${idx}`] || null);
  }
  return { rounds, champion: teams[0] || null };
}

export default function WorldCupPredict() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [picks, setPicks] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPicks(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (p) => {
    setPicks(p);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
  };

  const select = (r, m, t1) => {
    const key = `r${r}-${m}`;
    if (picks[key]?.id === t1.id) return;
    const next = { ...picks, [key]: t1 };
    // changing a pick invalidates all later rounds
    Object.keys(next).forEach((k) => {
      const round = parseInt(k.slice(1).split('-')[0], 10);
      if (round > r) delete next[k];
    });
    persist(next);
  };

  const reset = () => persist({});

  const { rounds, champion } = computeRounds(picks);

  const roundNames = {
    r32: t('predict.r32', { defaultValue: 'Round of 32' }),
    r16: t('predict.r16', { defaultValue: 'Round of 16' }),
    qf: t('predict.qf', { defaultValue: 'Quarter-finals' }),
    sf: t('predict.sf', { defaultValue: 'Semi-finals' }),
    final: t('predict.final', { defaultValue: 'Final' }),
  };
  const roundColors = ['#5B16E8', '#E10600', '#00B140', '#B4E600', '#FFC72C'];

  const totalPicks = 31; // 16+8+4+2+1
  const madePicks = Object.keys(picks).length;
  const progressPct = Math.round((madePicks / totalPicks) * 100);

  return (
    <div className="min-h-screen bg-[#070710] text-white pb-28">
      {/* Top accent bar */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-[#5B16E8]" />
        <div className="flex-1 bg-[#E10600]" />
        <div className="flex-1 bg-[#00B140]" />
        <div className="flex-1 bg-[#B4E600]" />
      </div>

      {/* Header */}
      <div className="px-5 pt-5">
        <button onClick={() => navigate('/world-cup')} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          {t('common.back', { defaultValue: 'Back' })}
        </button>

        {/* Question hero */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: 'linear-gradient(135deg, #20253a 0%, #2a3050 100%)' }}>
          <p className="text-emerald-400 text-[11px] font-black uppercase tracking-[0.15em]">{t('predict.fantasy', { defaultValue: 'Fantasy Predict' })}</p>
          <h1 className="text-2xl font-black mt-1 leading-tight">{t('predict.question', { defaultValue: 'Who will win the World Cup?' })}</h1>

          {/* Champion display */}
          <div className="mt-4 flex items-center gap-3 bg-black/20 rounded-xl p-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {champion ? (
                <img src={champion.logo} alt="" className="w-9 h-7 object-contain rounded-sm" />
              ) : (
                <span className="text-2xl">🏆</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white/40 text-[11px] uppercase tracking-wide">{t('predict.yourChampion', { defaultValue: 'Your champion' })}</p>
              <p className="text-lg font-black truncate">{champion ? champion.name : t('predict.tbd', { defaultValue: 'To be decided' })}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-white/40 mb-1.5">
              <span>{t('predict.progress', { defaultValue: 'Progress' })}</span>
              <span>{madePicks}/{totalPicks}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Champion celebration */}
      {champion && (
        <div className="px-5 mb-4">
          <div className="rounded-2xl p-4 flex items-center gap-3 border border-[#FFC72C]/30" style={{ background: 'linear-gradient(135deg, rgba(255,199,44,0.15), rgba(255,199,44,0.03))' }}>
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-[#FFC72C] text-xs font-bold uppercase tracking-wide">{t('predict.predictionComplete', { defaultValue: 'Prediction complete!' })}</p>
              <p className="text-sm text-white/80">{t('predict.championMsg', { team: champion.name, defaultValue: `You picked ${champion.name} to win it all.` })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rounds */}
      <div className="px-5 space-y-6">
        {rounds.map((matches, r) => {
          const playable = r === 0 || rounds[r].every((m) => m[0] && m[1]) || matches.some((m) => m[0] || m[1]);
          return (
            <div key={ROUND_KEYS[r]}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: roundColors[r] }} />
                <h2 className="text-sm font-black uppercase tracking-wide text-white/80">{roundNames[ROUND_KEYS[r]]}</h2>
                <span className="text-[11px] text-white/30 ml-auto">{matches.length} {matches.length === 1 ? t('predict.match', { defaultValue: 'match' }) : t('predict.matches', { defaultValue: 'matches' })}</span>
              </div>
              <div className="space-y-2.5">
                {matches.map((m, idx) => {
                  const key = `r${r}-${idx}`;
                  const picked = picks[key];
                  return (
                    <div key={key} className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d0d18]">
                      <div className="h-0.5" style={{ backgroundColor: roundColors[r] }} />
                      <TeamRow team={m[0]} selected={picked?.id === m[0]?.id} dim={picked && picked.id !== m[0]?.id} onPick={() => m[0] && m[1] && select(r, idx, m[0])} />
                      <div className="h-px bg-white/5 mx-3" />
                      <TeamRow team={m[1]} selected={picked?.id === m[1]?.id} dim={picked && picked.id !== m[1]?.id} onPick={() => m[0] && m[1] && select(r, idx, m[1])} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset */}
      {madePicks > 0 && (
        <div className="px-5 mt-8">
          <button onClick={reset} className="w-full py-3 rounded-xl border border-white/15 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors">
            {t('predict.reset', { defaultValue: 'Reset bracket' })}
          </button>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, selected, dim, onPick }) {
  if (!team) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 opacity-40">
        <div className="w-7 h-5 rounded-sm bg-white/10 shrink-0" />
        <span className="text-sm text-white/40">TBD</span>
      </div>
    );
  }
  return (
    <button
      onClick={onPick}
      className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
        selected ? 'bg-emerald-500/15' : dim ? 'opacity-40' : 'hover:bg-white/[0.04]'
      }`}
    >
      <img src={team.logo} alt="" className="w-7 h-5 object-contain rounded-sm shrink-0" loading="lazy" />
      <span className={`flex-1 text-sm truncate ${selected ? 'font-black text-white' : 'font-medium text-white/80'}`}>{team.name}</span>
      {selected && (
        <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        </span>
      )}
    </button>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'wc_predict_groups_v1';

// 12 groups — 4 teams each
const GROUPS = {
  A: [['Mexico', 'mx'], ['South Africa', 'za'], ['South Korea', 'kr'], ['Czech Republic', 'cz']],
  B: [['Canada', 'ca'], ['Bosnia & H.', 'ba'], ['Qatar', 'qa'], ['Switzerland', 'ch']],
  C: [['Brazil', 'br'], ['Morocco', 'ma'], ['Haiti', 'ht'], ['Scotland', 'gb-sct']],
  D: [['United States', 'us'], ['Paraguay', 'py'], ['Australia', 'au'], ['Türkiye', 'tr']],
  E: [['Germany', 'de'], ['Curaçao', 'cw'], ['Ivory Coast', 'ci'], ['Ecuador', 'ec']],
  F: [['Netherlands', 'nl'], ['Japan', 'jp'], ['Sweden', 'se'], ['Tunisia', 'tn']],
  G: [['Belgium', 'be'], ['Egypt', 'eg'], ['Iran', 'ir'], ['New Zealand', 'nz']],
  H: [['Spain', 'es'], ['Cape Verde', 'cv'], ['Saudi Arabia', 'sa'], ['Uruguay', 'uy']],
  I: [['France', 'fr'], ['Senegal', 'sn'], ['Iraq', 'iq'], ['Norway', 'no']],
  J: [['Argentina', 'ar'], ['Algeria', 'dz'], ['Austria', 'at'], ['Jordan', 'jo']],
  K: [['Portugal', 'pt'], ['DR Congo', 'cd'], ['Uzbekistan', 'uz'], ['Colombia', 'co']],
  L: [['England', 'gb-eng'], ['Croatia', 'hr'], ['Ghana', 'gh'], ['Panama', 'pa']],
};

const LETTERS = Object.keys(GROUPS);

const ACCENT = {
  A: '#FB7185', B: '#38BDF8', C: '#34D399', D: '#A78BFA',
  E: '#FBBF24', F: '#22D3EE', G: '#F472B6', H: '#818CF8',
  I: '#FB923C', J: '#2DD4BF', K: '#E879F9', L: '#A3E635',
};

function teamOf(letter, idx) {
  const [name, code] = GROUPS[letter][idx];
  return { id: `${letter}${idx}`, name, code, logo: `https://flagcdn.com/w80/${code}.png` };
}

export default function WorldCupPredict() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // picks: { [letter]: [teamId, teamId, ...] } in predicted finishing order
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

  const toggle = (letter, teamId) => {
    const cur = picks[letter] || [];
    let next;
    if (cur.includes(teamId)) {
      next = cur.filter((x) => x !== teamId);
    } else if (cur.length < 4) {
      next = [...cur, teamId];
    } else {
      return;
    }
    // when 3 are placed, the last remaining team takes 4th automatically
    if (next.length === 3) {
      const remaining = GROUPS[letter].map((_, i) => `${letter}${i}`).filter((id) => !next.includes(id));
      if (remaining.length === 1) next = [...next, remaining[0]];
    }
    persist({ ...picks, [letter]: next });
  };

  const reset = () => persist({});

  const isComplete = (letter) => (picks[letter]?.length || 0) === 4;
  const groupsDone = LETTERS.filter(isComplete).length;
  const progressPct = Math.round((groupsDone / LETTERS.length) * 100);

  return (
    <div className="min-h-screen bg-[#070710] text-white pb-28">
      {/* Top accent */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-[#5B16E8]" />
        <div className="flex-1 bg-[#E10600]" />
        <div className="flex-1 bg-[#00B140]" />
        <div className="flex-1 bg-[#B4E600]" />
      </div>

      <div className="px-5 pt-5">
        <button onClick={() => navigate('/world-cup')} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          {t('common.back', { defaultValue: 'Back' })}
        </button>

        {/* Hero */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, #20253a 0%, #2a3050 100%)' }}>
          <p className="text-emerald-400 text-[11px] font-black uppercase tracking-[0.15em]">{t('predict.fantasy', { defaultValue: 'Fantasy Predict' })}</p>
          <h1 className="text-2xl font-black mt-1 leading-tight">{t('predict.groupStageTitle', { defaultValue: 'Predict the group stage' })}</h1>
          <p className="text-white/50 text-sm mt-1.5">{t('predict.groupStageHint', { defaultValue: "Tap teams in the order you think they'll finish. Top 2 advance." })}</p>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-white/40 mb-1.5">
              <span>{t('predict.groupsDone', { defaultValue: 'Groups completed' })}</span>
              <span>{groupsDone}/{LETTERS.length}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Group cards */}
        <div className="space-y-4">
          {LETTERS.map((letter) => (
            <GroupCard
              key={letter}
              letter={letter}
              order={picks[letter] || []}
              complete={isComplete(letter)}
              onToggle={(id) => toggle(letter, id)}
              t={t}
            />
          ))}
        </div>

        {/* Locked knockout stage */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5 text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </div>
          <h3 className="font-bold text-white/80">{t('predict.knockoutLocked', { defaultValue: 'Knockout bracket' })}</h3>
          <p className="text-sm text-white/40 mt-1 max-w-xs mx-auto leading-relaxed">{t('predict.knockoutLockedDesc', { defaultValue: 'Unlocks after the group stage. First predict the groups — then pick who lifts the trophy. 🏆' })}</p>
        </div>

        {/* Reset */}
        {groupsDone > 0 && (
          <button onClick={reset} className="w-full mt-6 py-3 rounded-xl border border-white/15 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors">
            {t('predict.reset', { defaultValue: 'Reset predictions' })}
          </button>
        )}
      </div>
    </div>
  );
}

function GroupCard({ letter, order, complete, onToggle, t }) {
  const teams = GROUPS[letter].map((_, i) => teamOf(letter, i));
  const posOf = (id) => {
    const i = order.indexOf(id);
    return i === -1 ? null : i + 1;
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0d0d18] border border-white/[0.08]" style={{ borderLeft: `4px solid ${ACCENT[letter]}` }}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENT[letter] }}>
            <span className="text-sm font-black text-[#0d0d18]">{letter}</span>
          </div>
          <h3 className="font-bold text-sm tracking-wide text-white">{t('predict.group', { defaultValue: 'Group' })} {letter}</h3>
        </div>
        {complete && (
          <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </span>
        )}
      </div>

      <div className="divide-y divide-white/[0.04]">
        {teams.map((tm) => {
          const pos = posOf(tm.id);
          const qualifies = pos === 1 || pos === 2;
          return (
            <button
              key={tm.id}
              onClick={() => onToggle(tm.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${qualifies ? 'bg-emerald-500/[0.07]' : 'hover:bg-white/[0.04]'}`}
            >
              {/* Position circle */}
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                  pos == null
                    ? 'border-dashed border-white/20 text-white/30'
                    : qualifies
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white/10 border-white/10 text-white/60'
                }`}
              >
                {pos ?? '+'}
              </span>
              <img src={tm.logo} alt="" className="w-7 h-5 object-contain rounded-sm shrink-0" loading="lazy" />
              <span className={`flex-1 text-sm truncate ${pos ? 'font-bold text-white' : 'font-medium text-white/70'}`}>{tm.name}</span>
              {qualifies && (
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide shrink-0">{t('predict.qualifies', { defaultValue: 'Advances' })}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

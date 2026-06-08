import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import footballApi from '../../matches/api/footballApi';
import getWCHistory from '../data/wcHistory';

const POSITION_GROUPS = [
  { key: 'Goalkeeper', label: 'Goalkeepers' },
  { key: 'Defender', label: 'Defenders' },
  { key: 'Midfielder', label: 'Midfielders' },
  { key: 'Attacker', label: 'Attackers' },
];

export default function WCTeamDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Team identity can arrive via navigation state (from the group table)
  const stateTeam = location.state?.team || null;
  const [team, setTeam] = useState(stateTeam);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const history = getWCHistory(team?.name || stateTeam?.name);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Resolve a numeric team id (route id, else search by name)
        let teamId = /^\d+$/.test(id) ? Number(id) : null;
        if (!teamId && stateTeam?.name) {
          const found = await footballApi.searchTeams(stateTeam.name);
          teamId = found?.[0]?.id || null;
          if (alive && found?.[0]) {
            setTeam((prev) => ({ ...prev, logo: prev?.logo || found[0].logo }));
          }
        }
        if (!teamId) { if (alive) setLoading(false); return; }

        const squad = await footballApi.getSquad(teamId);
        const entry = Array.isArray(squad) ? squad[0] : squad;
        if (!alive) return;
        if (entry?.team) setTeam((prev) => ({ name: entry.team.name, logo: entry.team.logo, ...prev }));
        setPlayers(entry?.players || []);
      } catch {
        if (alive) setPlayers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const grouped = POSITION_GROUPS.map((g) => ({
    ...g,
    list: players.filter((p) => p.position === g.key),
  })).filter((g) => g.list.length > 0);

  const name = team?.name || stateTeam?.name || 'Team';
  const logo = team?.logo || stateTeam?.logo;

  return (
    <div className="min-h-screen bg-[#070710] text-white pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12122B] to-[#070710]" />
        <div className="flex h-1.5 relative z-10">
          <div className="flex-1 bg-[#5B16E8]" />
          <div className="flex-1 bg-[#E10600]" />
          <div className="flex-1 bg-[#00B140]" />
          <div className="flex-1 bg-[#B4E600]" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6">
          <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {t('common.back', { defaultValue: 'Back' })}
          </button>

          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt="" className="w-14 h-10 object-contain rounded-md shrink-0 shadow-lg" />
            ) : (
              <div className="w-14 h-10 rounded-md bg-white/10 shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-black truncate">{name}</h1>
              <p className="text-xs text-white/40 mt-0.5">
                {t('worldCup.nationalTeam', { defaultValue: 'National Team' })} · FIFA World Cup 26™
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* World Cup history */}
        <section>
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 px-1">
            {t('worldCup.historyTitle', { defaultValue: 'World Cup History' })}
          </h2>
          {history ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat value={history.appearances || 0} label={t('worldCup.appearances', { defaultValue: 'Appearances' })} />
                <Stat value={history.titles.length} label={t('worldCup.titles', { defaultValue: 'Titles' })} accent="#FFC72C" />
                <Stat value={history.runnerUp.length} label={t('worldCup.runnerUp', { defaultValue: 'Runner-up' })} />
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">
                  {t('worldCup.bestFinish', { defaultValue: 'Best finish' })}
                </p>
                <p className="text-sm font-semibold text-white">{history.best}</p>
              </div>

              {history.titles.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                    {t('worldCup.championYears', { defaultValue: 'Champion' })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {history.titles.map((y) => (
                      <span key={y} className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFC72C]/15 text-[#FFC72C]">
                        🏆 {y}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {history.runnerUp.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                    {t('worldCup.runnerUp', { defaultValue: 'Runner-up' })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {history.runnerUp.map((y) => (
                      <span key={y} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-white/60">
                        {y}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {history.note && (
                <p className="mt-4 text-xs text-white/50 leading-relaxed bg-white/[0.03] rounded-lg p-2.5">
                  💡 {history.note}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5 text-center">
              <p className="text-sm text-white/40">
                {t('worldCup.noHistory', { defaultValue: 'World Cup history not available.' })}
              </p>
            </div>
          )}
        </section>

        {/* Squad */}
        <section>
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 px-1">
            {t('worldCup.squad', { defaultValue: 'Squad' })}
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : grouped.length > 0 ? (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.key}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/35 mb-2 px-1">
                    {t(`worldCup.pos${g.key}`, { defaultValue: g.label })}
                  </p>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden divide-y divide-white/[0.04]">
                    {g.list.map((p) => (
                      <div key={p.id} className="flex items-center px-3 py-2.5 gap-3">
                        <span className="w-6 text-center text-sm font-black text-white/30 tabular-nums shrink-0">
                          {p.number ?? '–'}
                        </span>
                        {p.photo ? (
                          <img src={p.photo} alt="" className="w-9 h-9 rounded-full object-cover bg-white/10 shrink-0" loading="lazy" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                        )}
                        <span className="flex-1 text-sm font-medium text-white/90 truncate">{p.name}</span>
                        {p.age != null && (
                          <span className="text-xs text-white/35 shrink-0">{p.age} {t('worldCup.yrs', { defaultValue: 'yrs' })}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5 text-center">
              <p className="text-sm text-white/40">
                {t('worldCup.noSquad', { defaultValue: 'Squad list not available yet.' })}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ value, label, accent }) {
  return (
    <div>
      <p className="text-2xl font-black" style={accent ? { color: accent } : undefined}>{value}</p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

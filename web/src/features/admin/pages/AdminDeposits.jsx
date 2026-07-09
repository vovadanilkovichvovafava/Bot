import { useState, useEffect, Fragment } from 'react';
import { adminApi } from '../api';
import { ReplayModal } from '../components/VisitorSessions';

const SOURCE_COLORS = {
  keitaro: 'bg-purple-500/20 text-purple-400',
  keitaro_direct: 'bg-purple-500/20 text-purple-400',
  generic: 'bg-blue-500/20 text-blue-400',
  bookmaker_postback: 'bg-blue-500/20 text-blue-400',
  '1win': 'bg-green-500/20 text-green-400',
};

// Human description of each in-app banner (the "preview" of where it lives).
const BANNER_DESC = {
  pro_access_page: 'Paywall PRO (/pro-access) — botão de depósito',
  'pro_access_match-analysis': 'Paywall ao pedir análise de um jogo',
  bottom_nav_bet: 'Botão "Bet" na navegação inferior',
  promo_page: 'Funil de promoção (/promo)',
  match_bet_card: 'Carta de aposta na página do jogo',
  match_ad_get_bonus: 'CTA de bónus na página do jogo',
  home_bonus_banner: 'Banner de bónus na Home',
  home_featured_match: 'Jogo em destaque na Home',
  aichat_bet_card: 'Carta de aposta no chat de IA',
  aichat_ad_place_bet: 'Bloco de anúncio no chat de IA',
  aichat_limit_unlock: 'Modal de limite no chat de IA',
  support_promo_link: 'Link de promoção no suporte',
  support_admin_deposit: 'Botão de depósito enviado pelo admin',
  wc_recap: 'Resumo do Mundial (Home)',
  missed_win: 'Nudge "perdeste este palpite"',
};
const bannerLabel = (b) => (b ? (BANNER_DESC[b] || b) : null);

function fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}
function fmtDur(sec) {
  if (!sec || sec < 1) return '—';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [details, setDetails] = useState({}); // user_id -> detail | 'loading'
  const [replaySession, setReplaySession] = useState(null);

  useEffect(() => {
    adminApi.getDeposits(200)
      .then((d) => { setDeposits(d.deposits || []); setSummary(d.summary || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (dep) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(dep.id) ? next.delete(dep.id) : next.add(dep.id);
      return next;
    });
    if (dep.user_id && details[dep.user_id] === undefined) {
      setDetails((p) => ({ ...p, [dep.user_id]: 'loading' }));
      adminApi.getDepositUserDetail(dep.user_id)
        .then((d) => setDetails((p) => ({ ...p, [dep.user_id]: d })))
        .catch(() => setDetails((p) => ({ ...p, [dep.user_id]: null })));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Депозиты</h1>
        <p className="text-sm text-slate-400 mt-1">Кто реально задепал, сколько, с какого баннера, когда — и что делал до депозита. Нажми строку.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400">Всего депозитов</p>
          <p className="text-2xl font-bold mt-1 text-white">{summary.total ?? '—'}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400">Сумма</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{summary.total_amount != null ? `€${summary.total_amount}` : '—'}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400">За 24ч</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{summary.last_24h ?? '—'}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 text-xs">
              <th className="text-left px-4 py-3 font-medium">Время</th>
              <th className="text-left px-3 py-3 font-medium">Юзер</th>
              <th className="text-right px-3 py-3 font-medium">Сумма</th>
              <th className="text-center px-3 py-3 font-medium">Событие</th>
              <th className="text-center px-3 py-3 font-medium">Источник</th>
              <th className="text-left px-3 py-3 font-medium">Баннер</th>
              <th className="text-center px-3 py-3 font-medium">Страна</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Загрузка…</td></tr>
            ) : deposits.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Депозитов пока нет</td></tr>
            ) : deposits.map((d) => {
              const det = details[d.user_id];
              return (
                <Fragment key={d.id}>
                  <tr onClick={() => toggle(d)} className="hover:bg-slate-800/30 cursor-pointer">
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                      <span className="inline-block w-3 text-slate-500">{expanded.has(d.id) ? '▾' : '▸'}</span>{' '}
                      {fmtTime(d.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-xs text-slate-200">{d.user_id || '—'}</p>
                      {d.phone && <p className="text-[10px] text-slate-500">{d.phone}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-emerald-400">
                      {d.amount != null ? `${d.amount} ${d.currency || ''}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">{d.event || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[d.source] || 'bg-slate-700 text-slate-300'}`}>{d.source}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-slate-300 max-w-[200px] truncate" title={bannerLabel(d.banner) || ''}>
                      {d.banner || <span className="text-slate-600">— без баннера —</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400">{d.country || '—'}</td>
                  </tr>

                  {expanded.has(d.id) && (
                    <tr className="bg-slate-950/60">
                      <td colSpan="7" className="px-4 py-4">
                        {det === 'loading' || det === undefined ? (
                          <p className="text-xs text-slate-500">Загрузка детейла…</p>
                        ) : !det ? (
                          <p className="text-xs text-slate-500">Нет данных о поведении.</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Behaviour stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {[
                                { label: 'Время до депа', value: fmtDur(det.total_time_sec) },
                                { label: 'Сессий', value: det.sessions },
                                { label: 'Просмотров стр.', value: det.page_views },
                                { label: 'AI-запросов', value: det.ai_requests },
                                { label: 'Прогнозов', value: det.predictions },
                              ].map((s) => (
                                <div key={s.label} className="bg-slate-900 rounded-lg p-2.5 text-center border border-slate-800">
                                  <div className="text-base font-bold text-white">{s.value}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Banner journey — "preview" (description of each) */}
                              <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Путь по баннерам (что кликал)</p>
                                <div className="space-y-1.5">
                                  {det.banners?.length ? det.banners.map((b, i) => (
                                    <div key={i} className="flex items-start gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                                      <span className="text-[10px] text-slate-600 mt-0.5">{i + 1}.</span>
                                      <div className="min-w-0">
                                        <p className="text-xs font-mono text-slate-300 truncate">{b.banner} <span className="text-slate-600">×{b.count}</span></p>
                                        <p className="text-[10px] text-slate-500">{bannerLabel(b.banner)}</p>
                                      </div>
                                    </div>
                                  )) : <p className="text-xs text-slate-600">Баннеры не кликал.</p>}
                                </div>
                              </div>

                              {/* Pages visited */}
                              <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Страницы (что смотрел)</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {det.pages?.length ? det.pages.map((p, i) => (
                                    <span key={i} className="text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono">
                                      {p.page} <span className="text-slate-600">×{p.count}</span>
                                    </span>
                                  )) : <p className="text-xs text-slate-600">Нет данных.</p>}
                                </div>
                              </div>
                            </div>

                            {/* Watch session + ids */}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              {det.replay_session_id ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setReplaySession(det.replay_session_id); }}
                                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5"
                                >
                                  ▶ Смотреть сессию (replay)
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-600">Запись сессии недоступна</span>
                              )}
                              {d.click_id && <span className="text-[10px] text-slate-500 font-mono">click_id: <span className="text-slate-300 select-all">{d.click_id}</span></span>}
                              {d.transaction_id && <span className="text-[10px] text-slate-500 font-mono">txid: <span className="text-slate-300 select-all">{d.transaction_id}</span></span>}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {replaySession && <ReplayModal sessionId={replaySession} onClose={() => setReplaySession(null)} />}
    </div>
  );
}

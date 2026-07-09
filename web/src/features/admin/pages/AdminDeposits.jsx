import { useState, useEffect } from 'react';
import { adminApi } from '../api';

const SOURCE_COLORS = {
  keitaro: 'bg-purple-500/20 text-purple-400',
  keitaro_direct: 'bg-purple-500/20 text-purple-400',
  generic: 'bg-blue-500/20 text-blue-400',
  bookmaker_postback: 'bg-blue-500/20 text-blue-400',
  '1win': 'bg-green-500/20 text-green-400',
};

function fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDeposits(200)
      .then((d) => { setDeposits(d.deposits || []); setSummary(d.summary || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Депозиты</h1>
        <p className="text-sm text-slate-400 mt-1">Кто реально задепал, сколько, с какого баннера и когда.</p>
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
            ) : deposits.map((d) => (
              <tr key={d.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmtTime(d.created_at)}</td>
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
                <td className="px-3 py-2.5 text-xs font-mono text-slate-300 max-w-[200px] truncate">{d.banner || <span className="text-slate-600">— без баннера —</span>}</td>
                <td className="px-3 py-2.5 text-center text-xs text-slate-400">{d.country || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

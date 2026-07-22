/* Big-wins carousel — REAL recently-won picks with odds >= 5 (funnel C only).
   Falls back to a small curated set only if the backend has no wins yet, so
   the section is never empty. */
import { useState, useEffect } from 'react';
import { useAdvertiser } from '../../context/AdvertiserContext';
import { formatAmount } from '../../config/advertisers';
import { hasFeature } from '../../services/experiment';
import api from '../../api';

// Fallback (only when the DB has no real >=5 wins yet). Odds are all >= 5.
const FALLBACK = [
  { match: 'Cabo Verde vs Uruguai', market: 'Empate (X)', odds: 5.20, stake: 30, win: 156 },
  { match: 'Marrocos vs Croácia', market: 'Ambas marcam + Mais 3.5', odds: 6.50, stake: 25, win: 163 },
  { match: 'Panamá vs Portugal', market: 'Panamá handicap +1.5', odds: 5.80, stake: 20, win: 116 },
  { match: 'Sérvia vs Suíça', market: 'Resultado exato 2-1', odds: 8.00, stake: 20, win: 160 },
];

export default function WinProofs({ title = 'Ganhos reais dos utilizadores' }) {
  const { advertiser } = useAdvertiser();
  const [wins, setWins] = useState(null);
  const enabled = hasFeature('winsSlider'); // funnel C only

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api.getBigWins(5, 8)
      .then((d) => { if (!cancelled) setWins(d?.wins?.length ? d.wins : FALLBACK); })
      .catch(() => { if (!cancelled) setWins(FALLBACK); });
    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled) return null;

  const list = wins || FALLBACK;
  const cur = advertiser?.currency || '€';
  const money = (n) => formatAmount(n, cur, { decimals: 0 });

  return (
    <div>
      {title && <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">{title}</h3>}
      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
        {list.map((s, i) => (
          <div key={i} className="shrink-0 w-[230px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            {/* Slip header */}
            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(120deg,#0f2744,#1b3a5c)' }}>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">Boletim · IA</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-300">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                GANHO
              </span>
            </div>
            <div className="p-3">
              <p className="text-[12px] font-bold text-gray-900 truncate">{s.match}</p>
              <p className="text-[11px] text-gray-500 truncate mb-2">{s.market}</p>
              <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                <span>Odd <span className="font-bold text-gray-800">{Number(s.odds).toFixed(2)}</span></span>
                <span>Aposta <span className="font-bold text-gray-800">{money(s.stake)}</span></span>
              </div>
              <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-green-700">Retorno</span>
                <span className="text-base font-black text-green-600">{money(s.win)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Win-proof bet slips — curated marketing social proof (styled receipts). */
const SLIPS = [
  { match: 'Argentina vs Argélia', market: 'Argentina handicap -2.5', odds: 3.10, stake: 50, win: 155 },
  { match: 'Países Baixos vs Suécia', market: 'Mais de 4.5 golos', odds: 3.30, stake: 40, win: 132 },
  { match: 'Cabo Verde vs Uruguai', market: 'Empate (X)', odds: 4.20, stake: 25, win: 105 },
  { match: 'Marrocos vs Croácia', market: 'Ambas marcam + Mais 2.5', odds: 3.40, stake: 30, win: 102 },
];

export default function WinProofs({ title = 'Ganhos reais dos utilizadores' }) {
  return (
    <div>
      {title && <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">{title}</h3>}
      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
        {SLIPS.map((s, i) => (
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
                <span>Odd <span className="font-bold text-gray-800">{s.odds.toFixed(2)}</span></span>
                <span>Aposta <span className="font-bold text-gray-800">€{s.stake}</span></span>
              </div>
              <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-green-700">Retorno</span>
                <span className="text-base font-black text-green-600">€{s.win}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

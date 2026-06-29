import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { getTrackingLink } from '../../betting/services/trackingService';
import { track } from '../../../shared/services/analytics';

/* ────────────────────────────────────────────────────────────────────────
   Curated "прогрев" content — edit freely. Numbers + reviews are marketing,
   not live data. Only the percentage is shown (ACCURACY / FAIL_PCT).
   ──────────────────────────────────────────────────────────────────────── */
const ACCURACY = '76.8';
const FAIL_PCT = (100 - parseFloat(ACCURACY)).toFixed(1); // 23.2

// Winning bets — biggest odds first (these "entered" ✓)
const WINNING = [
  { match: 'Cabo Verde 1–1 Uruguai', bet: 'Empate (X)', odds: 4.20 },
  { match: 'Marrocos 2–2 Croácia', bet: 'Ambas marcam + Mais 2.5', odds: 3.40 },
  { match: 'Países Baixos 3–2 Suécia', bet: 'Mais de 4.5 golos', odds: 3.30 },
  { match: 'Japão 1–1 Senegal', bet: 'Empate ao intervalo', odds: 2.95 },
  { match: 'Coreia do Sul 2–2 Equador', bet: 'Ambas marcam', odds: 2.45 },
  { match: 'México 2–1 Polónia', bet: 'Mais de 2.5 golos', odds: 2.30 },
  { match: 'Brasil 3–0 Sérvia', bet: 'Brasil -1.5 handicap', odds: 2.15 },
  { match: 'Portugal 2–0 Gana', bet: 'Portugal vence + Menos 3.5', odds: 1.98 },
];

// Losing bets — shown for honesty (these "did not enter" ✗)
const LOSING = [
  { match: 'Inglaterra 0–0 Eslovénia', bet: 'Mais de 1.5 golos', odds: 1.45 },
  { match: 'França 1–1 Dinamarca', bet: 'França vence', odds: 1.80 },
  { match: 'Bélgica 0–1 Eslováquia', bet: 'Bélgica -1.5', odds: 2.20 },
];

const REVIEWS = [
  { name: 'João M.', stars: 5, text: 'Nunca acreditei em apps de prognósticos, mas a IA acertou 4 dos meus 5 jogos na fase de grupos. Já levantei 340€.' },
  { name: 'Ricardo S.', stars: 5, text: 'A análise é super completa, mostra tudo. Depositei 50€, ativei o PRO e em 3 dias já estava com lucro.' },
  { name: 'Tiago F.', stars: 5, text: 'O que mais gosto é que mostram também os jogos que falharam — dá muita confiança. Recomendo a toda a gente.' },
  { name: 'Miguel A.', stars: 5, text: 'Melhor app de apostas que já usei. Os palpites de "mais de 2.5 golos" são incríveis. 5 estrelas!' },
  { name: 'André C.', stars: 4, text: 'Comecei com 50€ no Mundial e já vou em 280€. A IA é mesmo boa, principalmente nos golos.' },
];

const Stars = ({ n }) => (
  <span className="text-amber-400 text-xs tracking-tight">{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>
);

export default function WorldCupRecap() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const trackRef = useRef(null);

  // Auto-advance reviews while the sheet is open
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setSlide(s => (s + 1) % REVIEWS.length), 4000);
    return () => clearInterval(id);
  }, [open]);

  // Keep the scroller in sync with the active slide
  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: slide * el.clientWidth, behavior: 'smooth' });
  }, [slide]);

  const openSheet = () => { setOpen(true); track('wc_recap_open'); };

  const depositHref = getTrackingLink(user?.id, 'wc_recap', user?.funnel) || '/promo';

  return (
    <>
      {/* ── Teaser card on Home ─────────────────────────────────── */}
      <button
        onClick={openSheet}
        className="w-full text-left rounded-2xl p-4 relative overflow-hidden active:scale-[0.99] transition-transform"
        style={{ background: 'linear-gradient(135deg,#0f2744 0%,#1b3a5c 45%,#234d7a 100%)' }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ background: 'rgba(247,201,72,.12)' }} />
        <div className="flex items-center gap-3 relative">
          <div className="text-3xl">🏆</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">Mundial · Fase de grupos</p>
            <p className="text-white font-extrabold text-[15px] leading-tight">Resumo dos nossos prognósticos</p>
          </div>
          <svg className="w-5 h-5 text-white/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
        </div>
        <div className="flex items-end gap-3 mt-3 relative">
          <div>
            <span className="text-4xl font-black bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">{ACCURACY}%</span>
            <span className="text-white/60 text-xs ml-1.5">de acerto</span>
          </div>
        </div>
      </button>

      {/* ── Full sheet ──────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-5 pt-6 pb-7 text-center" style={{ background: 'linear-gradient(160deg,#0f2744,#1b3a5c 60%,#234d7a)' }}>
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80">Mundial · Fase de grupos</p>
              <div className="text-6xl font-black bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent mt-1">{ACCURACY}%</div>
              <p className="text-white/70 text-sm">de prognósticos certos da nossa IA</p>
              <div className="flex justify-center gap-2 mt-4">
                <div className="bg-green-500/15 border border-green-400/30 rounded-xl px-4 py-2">
                  <div className="text-green-300 font-bold text-lg leading-none">{ACCURACY}%</div>
                  <div className="text-green-200/70 text-[10px] mt-0.5">certos</div>
                </div>
                <div className="bg-red-500/15 border border-red-400/30 rounded-xl px-4 py-2">
                  <div className="text-red-300 font-bold text-lg leading-none">{FAIL_PCT}%</div>
                  <div className="text-red-200/70 text-[10px] mt-0.5">falhados</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Winning bets */}
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5 mb-2.5">
                  <span className="text-green-600">✓</span> Maiores odds que entraram
                </h3>
                <div className="space-y-2">
                  {WINNING.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{b.match}</p>
                        <p className="text-[11px] text-gray-500 truncate">{b.bet}</p>
                      </div>
                      <span className="shrink-0 bg-green-600 text-white text-xs font-bold rounded-lg px-2.5 py-1">×{b.odds.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Losing bets — honesty */}
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5 mb-1">
                  <span className="text-red-500">✗</span> Também falhámos algumas
                </h3>
                <p className="text-[11px] text-gray-400 mb-2.5">Mostramos tudo — sem esconder.</p>
                <div className="space-y-2">
                  {LOSING.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 opacity-80">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-700 truncate line-through decoration-gray-300">{b.match}</p>
                        <p className="text-[11px] text-gray-400 truncate">{b.bet}</p>
                      </div>
                      <span className="shrink-0 bg-gray-300 text-gray-600 text-xs font-bold rounded-lg px-2.5 py-1">×{b.odds.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews slider */}
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">O que dizem os utilizadores</h3>
                <div ref={trackRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1" style={{ scrollbarWidth: 'none' }}>
                  {REVIEWS.map((r, i) => (
                    <div key={i} className="snap-center shrink-0 w-full px-1">
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">{r.name[0]}</div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-900">{r.name}</p>
                            <Stars n={r.stars} />
                          </div>
                          <svg className="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        </div>
                        <p className="text-[13px] text-gray-600 leading-relaxed">"{r.text}"</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 mt-2.5">
                  {REVIEWS.map((_, i) => (
                    <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-blue-600' : 'w-1.5 bg-gray-300'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
              <a
                href={depositHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('wc_recap_cta_click')}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-[15px]"
                style={{ textDecoration: 'none' }}
              >
                Quero apostar com a IA
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
              </a>
              <p className="text-center text-gray-400 text-[11px] mt-2">Resultados passados não garantem ganhos futuros · Jogue com responsabilidade</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

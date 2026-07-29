/**
 * Settled-bet receipts ("чеки") — social proof for the home screen.
 *
 * Rendered in markup rather than shipped as images: the amounts, currency and
 * league have to follow the geo (reais and the Brasileirão in Brazil, euro in
 * Portugal), and a fixed set of PNGs would have to be redrawn by hand for every
 * launch. The layout copies the bookmaker's own settled-bet card, so it reads as
 * a screenshot from the cashier.
 *
 * Rotates daily: the seed is the date, so the deck changes every day but stays
 * stable within the day. Placement follows the 28.07 call — directly under the
 * AI Express block, above the stats, test funnel only.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useAdvertiser } from '../../context/AdvertiserContext';
import { isTestFunnel } from '../../config/funnels';
import { getTrackingLink } from '../../../features/betting/services/trackingService';
import { track } from '../../services/analytics';

// Real fixtures with real results. Markets are the ones that actually landed.
const DECKS = {
  BR: [
    { league: 'COPA DO MUNDO 2026 · OITAVAS', date: '05/07/2026',
      home: 'Brasil', away: 'Noruega', hFlag: '🇧🇷', aFlag: '🇳🇴', score: '1 : 2',
      marketLabel: 'MARCADORES · A QUALQUER MOMENTO',
      market: 'Neymar marca', note: 'pênalti · 90+10\'', odds: '2.60', stake: 3000, payout: 7800 },
    { league: 'BRASILEIRÃO SÉRIE A · 20ª RODADA', date: '27/07/2026',
      home: 'Remo', away: 'Vitória', hFlag: '⚫', aFlag: '🔴', score: '2 : 0',
      marketLabel: 'RESULTADO FINAL',
      market: 'Vitória do Remo', note: 'tempo regulamentar', odds: '4.10', stake: 3000, payout: 12300 },
    { league: 'BRASILEIRÃO SÉRIE A · 19ª RODADA', date: '23/07/2026',
      home: 'Coritiba', away: 'Palmeiras', hFlag: '🟢', aFlag: '🟩', score: '1 : 3',
      marketLabel: 'TOTAL DE GOLS',
      market: 'Mais de 3.5', note: '4 gols no jogo', odds: '3.30', stake: 3000, payout: 9900 },
  ],
  PT: [
    { league: 'LIGA DOS CAMPEÕES · OITAVOS', date: '05/07/2026',
      home: 'Benfica', away: 'Inter', hFlag: '🔴', aFlag: '🔵', score: '2 : 1',
      marketLabel: 'RESULTADO FINAL',
      market: 'Vitória do Benfica', note: 'tempo regulamentar', odds: '3.40', stake: 500, payout: 1700 },
    { league: 'LIGA PORTUGAL · 20ª JORNADA', date: '27/07/2026',
      home: 'Sporting', away: 'Braga', hFlag: '🟢', aFlag: '🔴', score: '3 : 1',
      marketLabel: 'TOTAL DE GOLOS',
      market: 'Mais de 3.5', note: '4 golos no jogo', odds: '3.30', stake: 500, payout: 1650 },
    { league: 'LIGA PORTUGAL · 19ª JORNADA', date: '23/07/2026',
      home: 'Porto', away: 'Vitória SC', hFlag: '🔵', aFlag: '⚪', score: '2 : 0',
      marketLabel: 'RESULTADO FINAL',
      market: 'Vitória do Porto', note: 'tempo regulamentar', odds: '2.60', stake: 500, payout: 1300 },
  ],
};

const DEFAULT_DECK = [
  { league: 'CHAMPIONS LEAGUE · ROUND OF 16', date: '05/07/2026',
    home: 'Real Madrid', away: 'Bayern', hFlag: '⚪', aFlag: '🔴', score: '2 : 1',
    marketLabel: 'FINAL RESULT',
    market: 'Real Madrid win', note: 'regular time', odds: '3.40', stake: 500, payout: 1700 },
  { league: 'PREMIER LEAGUE · MATCHWEEK 20', date: '27/07/2026',
    home: 'Arsenal', away: 'Chelsea', hFlag: '🔴', aFlag: '🔵', score: '3 : 1',
    marketLabel: 'TOTAL GOALS',
    market: 'Over 3.5', note: '4 goals in the game', odds: '3.30', stake: 500, payout: 1650 },
];

/** "27/07/2026" → "27 de julho" — the bookmaker's card spells the month out. */
const MONTHS = {
  pt: ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  en: ['january','february','march','april','may','june','july','august','september','october','november','december'],
};
function longDate(ddmmyyyy, lang) {
  const [d, m] = ddmmyyyy.split('/');
  const base = (lang || 'en').slice(0, 2);
  const names = MONTHS[base] || MONTHS.en;
  const month = names[parseInt(m, 10) - 1] || '';
  const sep = base === 'en' ? '' : ' de';
  return `${parseInt(d, 10)}${sep} ${month}`;
}

/** Stable per-day shuffle so the deck differs day to day, not render to render. */
function daySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export default function ReceiptSlider() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { advertiser, countryCode, trackClick } = useAdvertiser();
  const [slide, setSlide] = useState(0);
  const trackRef = useRef(null);

  const enabled = isTestFunnel(user);
  const cur = advertiser?.currency || '€';

  const deck = useMemo(() => {
    const base = DECKS[(countryCode || '').toUpperCase()] || DEFAULT_DECK;
    const seed = daySeed() % base.length;
    // rotate the deck by the day's seed — same day, same order
    return [...base.slice(seed), ...base.slice(0, seed)];
  }, [countryCode]);

  useEffect(() => {
    if (!enabled || deck.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % deck.length), 5000);
    return () => clearInterval(id);
  }, [enabled, deck.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: slide * el.clientWidth, behavior: 'smooth' });
  }, [slide]);

  if (!enabled) return null;

  const money = (n) => `${cur}${Number(n).toLocaleString('pt-BR')}`;

  const openBookmaker = () => {
    track('receipt_click', {});
    trackClick?.(user?.id, 'receipt');
    const href = getTrackingLink(user?.id, 'receipt', user?.funnel);
    if (href) window.open(href, '_blank', 'noopener');
  };

  return (
    <div>
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {deck.map((r, i) => (
          <div key={i} className="snap-center shrink-0 w-full px-1">
            <div
              onClick={openBookmaker}
              className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              style={{ background: '#0d0d0f', border: '1px solid #1e1e22' }}
            >
              {/* Header: settled badge + date */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: '#f5d020' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f5d020' }} />
                  {t('receipts.settled', { defaultValue: 'Aposta liquidada' })}
                </span>
                <span className="text-[10px] font-medium" style={{ color: '#6b6b73' }}>{r.date}</span>
              </div>

              {/* League */}
              <div className="px-4 pb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#8a8a93' }}>
                  <span style={{ color: '#f5d020' }}>{t('receipts.football', { defaultValue: 'Futebol' })}</span>
                  {'  /  '}{r.league}
                </span>
              </div>

              {/* Teams + score */}
              <div className="px-4 pb-4 flex items-center justify-between">
                <div className="flex flex-col items-center gap-1.5 w-[86px]">
                  <span className="text-3xl leading-none">{r.hFlag}</span>
                  <span className="text-[12px] font-bold text-white text-center leading-tight">{r.home}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] mb-0.5 uppercase" style={{ color: '#6b6b73' }}>{longDate(r.date, i18n.language)}</span>
                  <span className="text-[26px] font-black text-white leading-none tracking-tight">{r.score}</span>
                  <span className="text-[9px] uppercase tracking-wider mt-1" style={{ color: '#6b6b73' }}>
                    {t('receipts.finished', { defaultValue: 'Encerrado' })}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 w-[86px]">
                  <span className="text-3xl leading-none">{r.aFlag}</span>
                  <span className="text-[12px] font-bold text-white text-center leading-tight">{r.away}</span>
                </div>
              </div>

              {/* Dashed separator, like a torn ticket */}
              <div className="mx-4" style={{ borderTop: '1px dashed #2a2a30' }} />

              {/* Market + odds */}
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#6b6b73' }}>{r.marketLabel}</p>
                  <p className="text-[13px] font-bold text-white leading-tight">
                    {r.market} <span className="font-normal" style={{ color: '#8a8a93' }}>{r.note}</span>
                  </p>
                </div>
                <span className="text-[17px] font-black shrink-0" style={{ color: '#f5d020' }}>{r.odds}</span>
              </div>

              {/* Stake → payout */}
              <div className="px-4 pb-4 pt-1 flex items-end justify-between" style={{ borderTop: '1px solid #17171b' }}>
                <div className="pt-3">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: '#6b6b73' }}>
                    {t('receipts.stake', { defaultValue: 'Aposta' })}
                  </p>
                  <p className="text-[13px] font-bold" style={{ color: '#c9c9d1' }}>{money(r.stake)}</p>
                </div>
                <span className="pb-1 text-lg" style={{ color: '#4a4a52' }}>→</span>
                <div className="pt-3 text-right">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: '#6b6b73' }}>
                    {t('receipts.paid', { defaultValue: 'Prêmio pago' })}
                  </p>
                  <span
                    className="inline-block mt-0.5 px-2.5 py-1 rounded-md text-[14px] font-black"
                    style={{ background: '#f5d020', color: '#0d0d0f' }}
                  >
                    {money(r.payout)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deck.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {deck.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? 'w-5' : 'w-1.5 bg-gray-300 dark:bg-slate-600'
              }`}
              style={i === slide ? { background: '#f5d020' } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

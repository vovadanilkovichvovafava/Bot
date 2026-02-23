import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import footballApi from '../../matches/api/footballApi';

const BANKROLL_PRESETS = [100, 300, 500];
const STAKE_PERCENT = 10;

export default function ProGuide() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const [smartBet, setSmartBet] = useState(null);
  const [bankroll, setBankroll] = useState(300);

  useEffect(() => {
    footballApi.getSmartBet().then(data => {
      if (data?.found) setSmartBet(data);
    }).catch(() => {});
  }, []);

  const odds = smartBet?.bet?.odds || 1.85;
  const stake = bankroll * STAKE_PERCENT / 100;
  const totalReturn = Math.round(stake * odds * 100) / 100;
  const profit = Math.round((totalReturn - stake) * 100) / 100;

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center -ml-1">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">PRO</span>
            <h1 className="text-base font-bold text-white">
              {t('proGuide.title', { defaultValue: 'Come guadagnare con l\'AI' })}
            </h1>
          </div>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-3 py-3 space-y-2.5 pb-6">

        {/* Section 1: Intro */}
        <div className="bg-white rounded-xl px-3 py-3 border border-gray-100">
          <h3 className="font-bold text-xs text-gray-900 mb-1.5">
            {t('proGuide.s1h', { defaultValue: 'Perch\u00e9 il 95% perde?' })}
          </h3>
          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
            {t('proGuide.s1', { defaultValue: 'La maggior parte degli scommettitori punta a caso, segue le emozioni e non ha un metodo.\n\nI professionisti fanno l\'opposto: analizzano i dati, cercano errori nelle quote e scommettono solo quando hanno un vantaggio matematico.\n\nCon l\'AI, anche tu puoi farlo.' })}
          </p>
        </div>

        {/* Section 2: What is a value bet */}
        <div className="bg-white rounded-xl px-3 py-3 border border-gray-100">
          <h3 className="font-bold text-xs text-gray-900 mb-1.5">
            {t('proGuide.s2h', { defaultValue: 'Cos\'è una Value Bet?' })}
          </h3>
          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
            {t('proGuide.s2', { defaultValue: 'Una value bet \u00e8 una scommessa dove la quota del bookmaker \u00e8 pi\u00f9 alta di quella reale.\n\nEsempio:\nLa probabilit\u00e0 reale di un evento \u00e8 60% (quota giusta: 1.67)\nMa il bookmaker offre quota 2.10\n\nQuesto significa che il bookmaker ha sbagliato. E tu guadagni dalla differenza.' })}
          </p>
          {/* Visual example */}
          <div className="mt-2 bg-gradient-to-r from-red-50 to-green-50 rounded-lg p-2.5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-[9px] text-red-500 font-medium">{t('proGuide.fairOdds', { defaultValue: 'Quota giusta' })}</p>
                <p className="text-red-600 font-black text-lg">1.67</p>
              </div>
              <div className="text-center px-3">
                <p className="text-[9px] text-gray-400 font-medium">VS</p>
                <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
              </div>
              <div className="text-center flex-1">
                <p className="text-[9px] text-emerald-500 font-medium">{t('proGuide.bookmakerOdds', { defaultValue: 'Quota bookmaker' })}</p>
                <p className="text-emerald-600 font-black text-lg">2.10</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-emerald-700 font-bold mt-1">
              {t('proGuide.edge', { defaultValue: '= Vantaggio per te (+25.7%)' })}
            </p>
          </div>
        </div>

        {/* Section 3: How AI finds errors */}
        <div className="bg-primary-50 rounded-xl px-3 py-3 border border-primary-200">
          <h3 className="font-bold text-xs text-primary-700 mb-1.5">
            {t('proGuide.s3h', { defaultValue: 'Come l\'AI trova gli errori' })}
          </h3>
          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
            {t('proGuide.s3', { defaultValue: 'L\'AI analizza migliaia di dati in tempo reale:\n\n\u2022 Forma delle ultime 15 partite\n\u2022 Statistiche H2H degli ultimi 5 anni\n\u2022 Gol medi, xG, corner, tiri in porta\n\u2022 Infortuni e squalifiche\n\u2022 Fattore casa/trasferta\n\u2022 Movimento delle quote\n\nQuando la probabilit\u00e0 calcolata dall\'AI \u00e8 significativamente diversa dalla quota del bookmaker \u2014 hai trovato un errore.' })}
          </p>
        </div>

        {/* Section 4: Strategy */}
        <div className="bg-white rounded-xl px-3 py-3 border border-gray-100">
          <h3 className="font-bold text-xs text-gray-900 mb-1.5">
            {t('proGuide.s4h', { defaultValue: 'La strategia PRO' })}
          </h3>
          <div className="space-y-2">
            {[
              { n: '1', text: t('proGuide.st1', { defaultValue: 'Scegli un bankroll fisso (es. 100\u20ac, 300\u20ac o 500\u20ac)' }) },
              { n: '2', text: t('proGuide.st2', { defaultValue: 'Punta sempre il 10% del bankroll su ogni value bet' }) },
              { n: '3', text: t('proGuide.st3', { defaultValue: 'Segui solo le scommesse dove l\'AI ha trovato un errore del bookmaker' }) },
              { n: '4', text: t('proGuide.st4', { defaultValue: 'Non inseguire le perdite \u2014 il vantaggio matematico lavora per te nel tempo' }) },
              { n: '5', text: t('proGuide.st5', { defaultValue: 'Reinvesti i profitti per far crescere il bankroll' }) },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-2">
                <div className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {step.n}
                </div>
                <p className="text-[11px] text-gray-700 leading-snug">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Math proof */}
        <div className="bg-white rounded-xl px-3 py-3 border border-gray-100">
          <h3 className="font-bold text-xs text-gray-900 mb-1.5">
            {t('proGuide.s5h', { defaultValue: 'La matematica funziona' })}
          </h3>
          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
            {t('proGuide.s5', { defaultValue: 'Con un bankroll di 300\u20ac e il 10% per scommessa:\n\nSe vinci 6 su 10 value bet a quota media 1.85:\n6 \u00d7 30\u20ac \u00d7 1.85 = 333\u20ac di vincite\n4 \u00d7 30\u20ac = 120\u20ac di perdite\n\nProfitto netto: +213\u20ac (+71% del bankroll)\n\nNon serve vincere sempre. Basta vincere pi\u00f9 di quanto il bookmaker si aspetta.' })}
          </p>
        </div>

        {/* ===== VALUE BET OF THE DAY ===== */}
        {smartBet?.found && smartBet.bet && (() => {
          const kickOff = smartBet.kick_off ? new Date(smartBet.kick_off) : null;
          const timeStr = kickOff ? kickOff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          return (
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

              <div className="relative p-4">
                {/* Header badge */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {t('proGuide.valueBetToday', { defaultValue: "Errore del bookmaker trovato" })}
                  </span>
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                {/* AI error badge */}
                <div className="flex justify-center mb-2">
                  <div className="bg-red-500/30 border border-red-400/50 rounded-lg px-3 py-1">
                    <p className="text-white text-[10px] font-bold text-center">
                      {t('proGuide.aiDetected', { defaultValue: "L'AI ha rilevato un errore nella quota" })}
                    </p>
                  </div>
                </div>

                {/* League */}
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  {smartBet.league?.logo && (
                    <img src={smartBet.league.logo} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-white/70 text-[10px] font-medium">{smartBet.league?.name}</span>
                  {timeStr && <span className="text-white/50 text-[10px]">• {timeStr}</span>}
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col items-center gap-1 w-24">
                    {smartBet.home?.logo && (
                      <img src={smartBet.home.logo} alt="" className="w-10 h-10 object-contain drop-shadow-lg" />
                    )}
                    <span className="text-white font-bold text-[11px] text-center leading-tight">{smartBet.home?.name}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-white/50 text-xs font-bold">VS</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 w-24">
                    {smartBet.away?.logo && (
                      <img src={smartBet.away.logo} alt="" className="w-10 h-10 object-contain drop-shadow-lg" />
                    )}
                    <span className="text-white font-bold text-[11px] text-center leading-tight">{smartBet.away?.name}</span>
                  </div>
                </div>

                {/* AI Recommendation card */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/60 font-medium">{t('proGuide.aiSuggests', { defaultValue: "L'AI consiglia" })}</span>
                      <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {smartBet.bet.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-base">{smartBet.bet.market}</span>
                    <span className="bg-yellow-400 text-gray-900 font-black text-lg px-3 py-0.5 rounded-lg shadow-lg">
                      {odds.toFixed(2)}
                    </span>
                  </div>
                  {smartBet.bet.reason && (
                    <p className="text-white/60 text-[10px] mt-1 leading-snug">{smartBet.bet.reason}</p>
                  )}
                </div>

                {/* Bankroll selector */}
                <div className="mb-3">
                  <p className="text-white/70 text-[10px] font-medium mb-1.5 text-center">
                    {t('proGuide.yourBankroll', { defaultValue: 'Il tuo bankroll' })}
                  </p>
                  <div className="flex gap-1.5 justify-center">
                    {BANKROLL_PRESETS.map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBankroll(amount)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          bankroll === amount
                            ? 'bg-white text-orange-600 shadow-lg scale-105'
                            : 'bg-white/15 text-white border border-white/20'
                        }`}
                      >
                        €{amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profit calculator */}
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/10">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-white/50 text-[9px] font-medium mb-0.5">
                        {t('proGuide.stakeCalc', { pct: STAKE_PERCENT, defaultValue: 'Puntata ({{pct}}%)' })}
                      </p>
                      <p className="text-white font-bold text-sm">€{stake}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[9px] font-medium mb-0.5">
                        {t('proGuide.returnCalc', { defaultValue: 'Vincita' })}
                      </p>
                      <p className="text-emerald-300 font-black text-lg">€{totalReturn}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[9px] font-medium mb-0.5">
                        {t('proGuide.profitCalc', { defaultValue: 'Profitto' })}
                      </p>
                      <p className="text-yellow-300 font-black text-lg">+€{profit}</p>
                    </div>
                  </div>
                </div>

                {/* CTA button — opens bookmaker */}
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-md opacity-50 animate-pulse" />
                  <button
                    onClick={() => {
                      if (advertiser?.link) {
                        if (user?.id) trackClick(user.id, 'pro_guide_value_bet');
                        window.open(advertiser.link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="relative w-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black py-3 rounded-xl text-sm shadow-xl flex items-center justify-center gap-2"
                  >
                    {t('proGuide.placeBet', { defaultValue: 'Scommetti ora sull\'errore' })}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                    </svg>
                  </button>
                </div>

                <p className="text-white/40 text-[9px] text-center mt-2">
                  {t('proGuide.disclaimer', { defaultValue: 'Scommetti responsabilmente. Solo fondi che puoi permetterti di perdere.' })}
                </p>
              </div>
            </div>
          );
        })()}

        {/* No smart bet fallback */}
        {(!smartBet?.found || !smartBet?.bet) && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-gray-500 text-xs">
              {t('proGuide.noValueBet', { defaultValue: 'Nessun errore del bookmaker trovato oggi. Torna pi\u00f9 tardi!' })}
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="mt-2 bg-primary-500 text-white font-semibold text-xs px-4 py-2 rounded-lg"
            >
              {t('proGuide.browseMatches', { defaultValue: 'Sfoglia i match' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

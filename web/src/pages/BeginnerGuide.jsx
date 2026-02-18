import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../context/AdvertiserContext';

const LESSONS = (t, advertiser) => [
  {
    id: 1,
    icon: '📖',
    color: 'from-primary-500 to-indigo-600',
    title: t('guide.l1Title', { defaultValue: 'Le basi delle scommesse' }),
    time: '2 min',
    sections: [
      {
        heading: t('guide.l1s1h', { defaultValue: "Cos'è una scommessa?" }),
        text: t('guide.l1s1', { defaultValue: "Una scommessa è un pronostico su un evento sportivo. Scegli un risultato, il bookmaker offre una quota. Se il tuo pronostico è corretto, vinci!" }),
      },
      {
        heading: t('guide.l1s2h', { defaultValue: 'Esempio pratico' }),
        card: true,
        home: 'Liverpool', away: 'Man City', odds: '2.10', stake: '10€',
        text: t('guide.l1s2', { defaultValue: "Scommetti 10€ sulla vittoria del Liverpool a quota 2.10\nSe vince: 10 × 2.10 = 21€ (profitto 11€)\nSe non vince: perdi 10€" }),
      },
      {
        heading: t('guide.l1s3h', { defaultValue: 'Esiti principali (1X2)' }),
        chips: [
          { label: '1', desc: t('guide.l1c1', { defaultValue: 'Vittoria prima squadra' }) },
          { label: 'X', desc: t('guide.l1c2', { defaultValue: 'Pareggio' }) },
          { label: '2', desc: t('guide.l1c3', { defaultValue: 'Vittoria seconda squadra' }) },
        ],
      },
      {
        heading: t('guide.l1s4h', { defaultValue: "Cos'è la quota?" }),
        text: t('guide.l1s4', { defaultValue: "La quota indica quanto puoi vincere e la probabilità dell'esito:\n\n1.30 = molto probabile (~77%)\n2.00 = 50/50\n5.00 = poco probabile (~20%)" }),
      },
    ],
  },
  {
    id: 2,
    icon: '🎲',
    color: 'from-purple-500 to-pink-500',
    title: t('guide.l2Title', { defaultValue: 'Tipi di scommesse' }),
    time: '2 min',
    sections: [
      {
        heading: t('guide.l2s1h', { defaultValue: 'Totale (Over/Under)' }),
        text: t('guide.l2s1', { defaultValue: "Over 2.5 = 3 o più gol nel match\nUnder 2.5 = 2 o meno gol\n\nUno dei tipi più popolari. L'AI spesso raccomanda i totali perché più prevedibili con le statistiche." }),
      },
      {
        heading: t('guide.l2s2h', { defaultValue: 'Handicap (Fora)' }),
        text: t('guide.l2s2', { defaultValue: "Handicap (-1) Liverpool:\nDeve vincere con 2+ gol di scarto\n2:0 → vinta | 1:0 → persa\n\nHandicap (+1.5) Man City:\nPuò perdere anche di 1 gol\n0:1 → vinta" }),
      },
      {
        heading: t('guide.l2s3h', { defaultValue: 'Entrambe segnano (BTTS)' }),
        text: t('guide.l2s3', { defaultValue: "Sì = entrambe le squadre segnano almeno 1 gol\nNo = almeno una squadra non segna\n\n2:1 → Sì vince\n2:0 → No vince" }),
      },
      {
        heading: t('guide.l2s4h', { defaultValue: 'Doppia chance' }),
        text: t('guide.l2s4', { defaultValue: "Copre 2 esiti su 3:\n1X = vittoria casa O pareggio\nX2 = pareggio O vittoria ospiti\n12 = vittoria casa O ospiti\n\nQuote più basse, ma più sicure. Ottimo per principianti!" }),
      },
      {
        heading: t('guide.l2s5h', { defaultValue: 'Accumulator (Multipla)' }),
        text: t('guide.l2s5', { defaultValue: "Più scommesse in una. Le quote si moltiplicano:\n1.80 × 1.85 = 3.33\n\nTutti i pronostici devono essere corretti! Se anche uno sbaglia, perdi tutto. Alto rischio, alta ricompensa." }),
      },
    ],
  },
  {
    id: 3,
    icon: '📐',
    color: 'from-green-500 to-emerald-600',
    title: t('guide.l3Title', { defaultValue: 'Come leggere le quote' }),
    time: '1 min',
    sections: [
      {
        heading: t('guide.l3s1h', { defaultValue: 'Formati delle quote' }),
        table: [
          [t('guide.l3f1', { defaultValue: 'Decimale' }), '2.50', '10 × 2.50 = 25€', t('guide.l3r1', { defaultValue: 'Europa' })],
          [t('guide.l3f2', { defaultValue: 'Frazionario' }), '3/2', '10 × (3/2) + 10 = 25€', t('guide.l3r2', { defaultValue: 'UK' })],
          [t('guide.l3f3', { defaultValue: 'Americano' }), '+150', '10 × (150/100) + 10 = 25€', t('guide.l3r3', { defaultValue: 'USA' })],
        ],
      },
    ],
  },
  {
    id: 4,
    icon: '💰',
    color: 'from-blue-500 to-cyan-500',
    title: t('guide.l4Title', { defaultValue: 'Bankroll management' }),
    time: '2 min',
    sections: [
      {
        heading: t('guide.l4s1h', { defaultValue: "Cos'è il bankroll?" }),
        text: t('guide.l4s1', { defaultValue: "Il bankroll è la somma che dedichi alle scommesse. NON sono i soldi per le spese quotidiane.\n\nRegola d'oro: scommetti solo quello che puoi permetterti di perdere." }),
      },
      {
        heading: t('guide.l4s2h', { defaultValue: 'La regola dell\'1-3%' }),
        text: t('guide.l4s2', { defaultValue: "Non scommettere mai più dell'1-3% del bankroll su una singola scommessa.\n\nBankroll: 100€\nSingola scommessa: 1-3€\n\nQuesto ti protegge anche con una serie di sconfitte." }),
      },
      {
        heading: t('guide.l4s3h', { defaultValue: 'Flat betting' }),
        text: t('guide.l4s3', { defaultValue: "Per i principianti: scommetti sempre la stessa somma.\n\nNon aumentare dopo una perdita!\nNon cercare di recuperare — è l'errore più comune." }),
      },
    ],
  },
  {
    id: 5,
    icon: '🔍',
    color: 'from-violet-500 to-purple-600',
    title: t('guide.l5Title', { defaultValue: 'Come analizzare un match' }),
    time: '2 min',
    sections: [
      {
        heading: t('guide.l5s1h', { defaultValue: 'Forma attuale' }),
        text: t('guide.l5s1', { defaultValue: "Guarda gli ultimi 5 risultati di ogni squadra.\nSerie di vittorie = buona forma\nSerie di sconfitte = cattiva forma" }),
      },
      {
        heading: t('guide.l5s2h', { defaultValue: 'Scontri diretti (H2H)' }),
        text: t('guide.l5s2', { defaultValue: "La storia dei match tra le due squadre.\nAlcune squadre sono storicamente scomode per altre.\nEs: 7 su 10 Liverpool vs City → Over 2.5" }),
      },
      {
        heading: t('guide.l5s3h', { defaultValue: 'Casa / Trasferta' }),
        text: t('guide.l5s3', { defaultValue: "Molte squadre sono più forti in casa.\nControlla le statistiche gol casa e trasferta." }),
      },
      {
        heading: t('guide.l5s4h', { defaultValue: 'Infortuni e formazioni' }),
        text: t('guide.l5s4', { defaultValue: "L'assenza di un giocatore chiave può cambiare tutto.\nSe manca l'attaccante principale → Under può essere una buona scelta." }),
      },
      {
        heading: t('guide.l5s5h', { defaultValue: "Come l'AI ti aiuta" }),
        highlight: true,
        text: t('guide.l5s5', { defaultValue: "L'AI analizza TUTTO questo automaticamente:\n• Forma delle ultime 10 partite\n• Statistiche H2H degli ultimi 5 anni\n• Gol medi, corner, cartellini\n• E ti dà un pronostico con livello di fiducia\n\nNon serve ore di analisi — l'AI lo fa in secondi." }),
      },
    ],
  },
  {
    id: 6,
    icon: '🏢',
    color: 'from-amber-500 to-orange-500',
    title: t('guide.l6Title', { defaultValue: 'Come scegliere un bookmaker' }),
    time: '1 min',
    sections: [
      {
        heading: t('guide.l6s1h', { defaultValue: 'Criteri importanti' }),
        chips: [
          { label: '🛡️', desc: t('guide.l6c1', { defaultValue: 'Licenza — protezione dei tuoi soldi' }) },
          { label: '⚡', desc: t('guide.l6c2', { defaultValue: 'Pagamenti veloci — minuti, non giorni' }) },
          { label: '🎁', desc: t('guide.l6c3', { defaultValue: 'Bonus di benvenuto' }) },
          { label: '📱', desc: t('guide.l6c4', { defaultValue: 'App mobile comoda' }) },
          { label: '🎯', desc: t('guide.l6c5', { defaultValue: 'Ampia linea di scommesse' }) },
          { label: '📊', desc: t('guide.l6c6', { defaultValue: 'Quote competitive' }) },
        ],
      },
      {
        heading: t('guide.l6s2h', { defaultValue: 'La nostra raccomandazione' }),
        highlight: true,
        text: t('guide.l6s2', { defaultValue: `Il nostro partner offre:\n✅ Licenza internazionale ufficiale\n✅ Pagamenti in 15 minuti\n✅ Bonus fino a ${advertiser?.bonusAmount || '1.500€'}\n✅ 900+ campionati di calcio\n✅ Supporto 24/7` }),
      },
    ],
  },
  {
    id: 7,
    icon: '🚀',
    color: 'from-teal-500 to-green-500',
    title: t('guide.l7Title', { defaultValue: 'La tua prima scommessa' }),
    time: '1 min',
    sections: [
      {
        heading: t('guide.l7s1h', { defaultValue: 'Passo dopo passo' }),
        steps: [
          t('guide.l7st1', { defaultValue: "Apri l'app e guarda le partite di oggi" }),
          t('guide.l7st2', { defaultValue: "Scegli un match che ti interessa" }),
          t('guide.l7st3', { defaultValue: "Guarda il pronostico AI con il livello di fiducia" }),
          t('guide.l7st4', { defaultValue: 'Chiedi all\'AI se hai domande: "Perché Over 2.5?"' }),
          t('guide.l7st5', { defaultValue: "Apri il bookmaker e cerca lo stesso match" }),
          t('guide.l7st6', { defaultValue: "Scegli l'esito consigliato dall'AI. Importo: 1-3% del bankroll!" }),
          t('guide.l7st7', { defaultValue: "Conferma la scommessa. Segui il risultato nell'app!" }),
        ],
      },
    ],
    isLast: true,
  },
];

export default function BeginnerGuide() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { advertiser } = useAdvertiser();
  const [currentLesson, setCurrentLesson] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const lessons = useMemo(() => LESSONS(t, advertiser), [t, advertiser]);
  const lesson = lessons[currentLesson];

  const next = () => { if (currentLesson < lessons.length - 1) setCurrentLesson(currentLesson + 1); };
  const prev = () => { if (currentLesson > 0) setCurrentLesson(currentLesson - 1); };

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
    setTouchStart(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center -ml-1">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-900">
            {t('guide.title', { defaultValue: 'Scuola di Scommesse' })}
          </h1>
          <span className="text-[10px] text-gray-400 font-medium">{currentLesson + 1}/{lessons.length}</span>
        </div>
        {/* Progress bar */}
        <div className="flex gap-0.5">
          {lessons.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all ${i <= currentLesson ? 'bg-primary-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Lesson Content */}
      <div
        className="px-3 py-2 space-y-2 pb-20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Lesson header card */}
        <div className={`bg-gradient-to-br ${lesson.color} rounded-xl p-3 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xl">{lesson.icon}</span>
            </div>
            <div>
              <p className="text-white/70 text-[10px] font-medium">
                {t('guide.lesson', { defaultValue: 'Lezione' })} {lesson.id}
              </p>
              <h2 className="text-sm font-bold leading-tight">{lesson.title}</h2>
              <p className="text-white/60 text-[10px]">{lesson.time}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {lesson.sections.map((sec, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2.5 ${sec.highlight ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-100'}`}
          >
            <h3 className={`font-bold text-xs mb-1.5 ${sec.highlight ? 'text-primary-700' : 'text-gray-900'}`}>
              {sec.heading}
            </h3>

            {/* Text content */}
            {sec.text && (
              <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{sec.text}</p>
            )}

            {/* Match card preview */}
            {sec.card && (
              <div className="bg-gray-50 rounded-lg p-2 mb-2 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-xs">{sec.home} vs {sec.away}</span>
                  <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{sec.odds}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{t('guide.stakeLabel', { defaultValue: 'Puntata' })}: {sec.stake}</p>
              </div>
            )}

            {/* Chips — compact inline */}
            {sec.chips && (
              <div className="flex flex-wrap gap-1.5">
                {sec.chips.map((chip, j) => (
                  <div key={j} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-xs shrink-0">{chip.label}</span>
                    <span className="text-[10px] text-gray-700 leading-tight">{chip.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            {sec.table && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1 px-1 text-gray-500 font-medium text-[10px]">{t('guide.format', { defaultValue: 'Formato' })}</th>
                      <th className="text-left py-1 px-1 text-gray-500 font-medium text-[10px]">{t('guide.example', { defaultValue: 'Esempio' })}</th>
                      <th className="text-left py-1 px-1 text-gray-500 font-medium text-[10px]">{t('guide.calc', { defaultValue: 'Calcolo (10€)' })}</th>
                      <th className="text-left py-1 px-1 text-gray-500 font-medium text-[10px]">{t('guide.where', { defaultValue: 'Dove' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.table.map((row, j) => (
                      <tr key={j} className="border-b border-gray-100 last:border-0">
                        {row.map((cell, k) => (
                          <td key={k} className="py-1 px-1 text-gray-700 text-[10px]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Step-by-step */}
            {sec.steps && (
              <div className="space-y-1.5">
                {sec.steps.map((stepText, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {j + 1}
                    </div>
                    <p className="text-[11px] text-gray-700 leading-snug">{stepText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Last lesson CTA */}
        {lesson.isLast && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 text-center text-white">
            <p className="text-sm font-bold mb-1">{t('guide.congrats', { defaultValue: 'Complimenti! Sei pronto!' })}</p>
            <p className="text-white/80 text-[11px] mb-2">{t('guide.congratsDesc', { defaultValue: 'Hai completato la scuola di scommesse. Ora prova il tuo primo pronostico AI!' })}</p>
            <button
              onClick={() => navigate('/matches')}
              className="w-full bg-white text-green-700 font-bold py-2.5 rounded-lg text-sm"
            >
              {t('guide.goPredict', { defaultValue: 'Vai ai pronostici' })}
            </button>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex gap-2 z-30">
        <button
          onClick={prev}
          disabled={currentLesson === 0}
          className={`w-12 h-10 rounded-lg flex items-center justify-center ${
            currentLesson === 0 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>
        <button
          onClick={currentLesson === lessons.length - 1 ? () => navigate('/') : next}
          className="flex-1 bg-primary-500 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 text-sm"
        >
          {currentLesson === lessons.length - 1
            ? t('guide.done', { defaultValue: 'Fine' })
            : t('guide.nextLesson', { defaultValue: 'Lezione successiva' })}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

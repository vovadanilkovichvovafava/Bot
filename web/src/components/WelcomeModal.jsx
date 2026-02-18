import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBottomNav } from '../context/BottomNavContext';

export default function WelcomeModal({ onClose, onGoToPromo }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { hideBottomNav, showBottomNav } = useBottomNav();

  useEffect(() => {
    hideBottomNav();
    return () => showBottomNav();
  }, [hideBottomNav, showBottomNav]);

  const TOTAL_STEPS = 5;

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl w-full max-w-sm max-h-[85dvh] overflow-y-auto shadow-2xl">
        {/* Progress bar */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-medium">{step + 1} / {TOTAL_STEPS}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {step === 0 && <Step1Welcome t={t} />}
        {step === 1 && <Step2Predictions t={t} />}
        {step === 2 && <Step3Chat t={t} />}
        {step === 3 && <Step4Features t={t} />}
        {step === 4 && <Step5Start t={t} onClose={onClose} onGoToPromo={onGoToPromo} />}

        {/* Actions */}
        {step < 4 && (
          <div className="px-6 pb-6">
            <button
              onClick={next}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              {step === 0
                ? t('onboarding.start', { defaultValue: 'Iniziamo!' })
                : t('onboarding.next', { defaultValue: 'Avanti' })}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Step 1 — Welcome */
function Step1Welcome({ t }) {
  return (
    <div className="px-6 pt-6 pb-4 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {t('onboarding.step1Title', { defaultValue: 'Benvenuto in AI Betting Bot!' })}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-5">
        {t('onboarding.step1Desc', { defaultValue: 'Il tuo assistente AI personale per il calcio. Analizziamo oltre 900 campionati per darti i pronostici più precisi.' })}
      </p>
      <div className="space-y-2.5">
        <FeatureChip icon="target" text={t('onboarding.feat1', { defaultValue: 'Pronostici AI — previsioni basate sui dati' })} />
        <FeatureChip icon="chat" text={t('onboarding.feat2', { defaultValue: 'Chat AI — chiedi qualsiasi cosa sulle partite' })} />
        <FeatureChip icon="chart" text={t('onboarding.feat3', { defaultValue: 'Statistiche — monitora i tuoi risultati' })} />
      </div>
    </div>
  );
}

/* Step 2 — AI Predictions */
function Step2Predictions({ t }) {
  return (
    <div className="px-6 pt-6 pb-4 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {t('onboarding.step2Title', { defaultValue: 'Pronostici AI gratuiti ogni giorno' })}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-5">
        {t('onboarding.step2Desc', { defaultValue: "Ogni giorno hai 3 richieste AI gratuite. Scegli una partita, l'AI analizza forma, statistiche, scontri diretti e ti dà la sua raccomandazione." })}
      </p>
      {/* Mini prediction preview */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Premier League</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">AI Prediction</span>
        </div>
        <p className="font-bold text-gray-900 text-sm mb-1">Liverpool vs Man City</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">AI Confidence: <span className="text-primary-600 font-bold">78%</span></span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500">Over 2.5 <span className="text-primary-600 font-bold">@ 1.85</span></span>
        </div>
      </div>
    </div>
  );
}

/* Step 3 — AI Chat */
function Step3Chat({ t }) {
  return (
    <div className="px-6 pt-6 pb-4 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {t('onboarding.step3Title', { defaultValue: 'Chat AI — il tuo analista personale' })}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-5">
        {t('onboarding.step3Desc', { defaultValue: 'Hai una domanda su una partita? Chiedi all\'AI! Risposte basate su dati reali, statistiche e analisi in tempo reale.' })}
      </p>
      {/* Chat preview */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-left space-y-3">
        <div className="flex justify-end">
          <div className="bg-primary-500 text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">
            {t('onboarding.chatExample1', { defaultValue: 'Chi vincerà stasera Real vs Barsa?' })}
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white text-gray-700 text-xs px-3 py-2 rounded-xl rounded-tl-sm border border-gray-200 max-w-[80%]">
            {t('onboarding.chatExample2', { defaultValue: 'Sulla base degli ultimi 5 match e della forma attuale...' })}
          </div>
        </div>
        <div className="flex gap-2 justify-center pt-1">
          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Migliori oggi</span>
          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Live ora</span>
          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Serie A</span>
        </div>
      </div>
    </div>
  );
}

/* Step 4 — All Features */
function Step4Features({ t }) {
  return (
    <div className="px-6 pt-6 pb-4 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-3">
        {t('onboarding.step4Title', { defaultValue: 'Ecco cosa puoi fare' })}
      </h2>
      <div className="text-left space-y-2 mb-4">
        <FreeFeature text={t('onboarding.free1', { defaultValue: '3 pronostici AI gratuiti al giorno' })} />
        <FreeFeature text={t('onboarding.free2', { defaultValue: 'Chat AI con domande gratuite al giorno' })} />
        <FreeFeature text={t('onboarding.free3', { defaultValue: 'Statistiche delle tue previsioni' })} />
        <FreeFeature text={t('onboarding.free4', { defaultValue: 'Calendario partite di 900+ campionati' })} />
        <div className="h-px bg-gray-100 my-2" />
        <ProFeature text={t('onboarding.pro1', { defaultValue: 'Pronostici illimitati — PRO' })} />
        <ProFeature text={t('onboarding.pro2', { defaultValue: 'Chat AI illimitata — PRO' })} />
        <ProFeature text={t('onboarding.pro3', { defaultValue: 'Value Bet Finder — PRO' })} />
        <ProFeature text={t('onboarding.pro4', { defaultValue: 'Bankroll Tracker — PRO' })} />
      </div>
      <p className="text-[11px] text-gray-400">
        {t('onboarding.proNote', { defaultValue: 'PRO si sblocca gratuitamente — scopri come nella pagina dedicata' })}
      </p>
    </div>
  );
}

/* Step 5 — Go! */
function Step5Start({ t, onClose, onGoToPromo }) {
  return (
    <div className="px-6 pt-6 pb-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {t('onboarding.step5Title', { defaultValue: 'Tutto pronto! Inizia ora' })}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-6">
        {t('onboarding.step5Desc', { defaultValue: 'Hai 3 richieste AI gratuite al giorno. Scegli una partita e prova il tuo primo pronostico AI!' })}
      </p>
      <button
        onClick={onClose}
        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 mb-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        </svg>
        {t('onboarding.goPredict', { defaultValue: 'Vai ai pronostici' })}
      </button>
      <button
        onClick={onGoToPromo}
        className="w-full text-primary-500 text-sm font-medium py-2"
      >
        {t('onboarding.discoverPro', { defaultValue: 'Scopri PRO (gratuito)' })}
      </button>
    </div>
  );
}

/* Helper components */
function FeatureChip({ icon, text }) {
  const icons = {
    target: <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
    chat: <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>,
    chart: <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>,
  };
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-left">
      {icons[icon]}
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}

function FreeFeature({ text }) {
  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}

function ProFeature({ text }) {
  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
      </svg>
      <span className="text-sm text-gray-400">{text}</span>
    </div>
  );
}

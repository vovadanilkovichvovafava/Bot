import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function WelcomeModal({ onClose, onGoToPromo }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  // Hide BottomNav while modal is open
  useEffect(() => {
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = 'none';
    return () => {
      if (nav) nav.style.display = '';
    };
  }, []);

  const steps = [
    {
      icon: '1',
      title: t('welcome.step1Title', { defaultValue: 'Registration complete!' }),
      description: t('welcome.step1Desc', { defaultValue: 'You now have access to free AI predictions. Try them out!' }),
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: '2',
      title: t('welcome.step2Title', { defaultValue: 'Want unlimited access?' }),
      description: t('welcome.step2Desc', { defaultValue: 'Register with our partner bookmaker through the link in the app and make a deposit to unlock PRO features.' }),
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: '3',
      title: t('welcome.step3Title', { defaultValue: 'How to get PRO' }),
      description: t('welcome.step3Desc', { defaultValue: '1. Tap the link in the app\n2. Register at the bookmaker\n3. Make any deposit\n4. PRO activates automatically!' }),
      color: 'from-purple-500 to-indigo-600',
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm max-h-[80dvh] overflow-y-auto shadow-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-primary-500' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center shadow-lg`}>
            <span className="text-white text-2xl font-bold">{currentStep.icon}</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">{currentStep.title}</h2>
          <p className="text-gray-500 text-sm whitespace-pre-line leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          {isLast ? (
            <>
              <button
                onClick={onGoToPromo}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30"
              >
                {t('welcome.goToPromo', { defaultValue: 'Get PRO now' })}
              </button>
              <button
                onClick={onClose}
                className="w-full text-gray-400 text-sm py-2"
              >
                {t('welcome.later', { defaultValue: 'Maybe later' })}
              </button>
            </>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              {t('welcome.next', { defaultValue: 'Next' })}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

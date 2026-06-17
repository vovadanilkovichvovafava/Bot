import { useState, useLayoutEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const SPOT_SELECTORS = [
  null,
  '[data-tour="best-bet"]',
  '[data-tour="nav-matches"]',
  '[data-tour="nav-ai-chat"]',
  '[data-tour="nav-bet"]',
  null,
];

export default function ProductTour({ onClose, onGoToPromo, onGoToExpress, hidePro, expressFirst }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const selector = SPOT_SELECTORS[step] || null;

  const steps = [
    {
      type: 'center',
      accent: 'from-green-500 to-emerald-600',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t('tour.introTitle', { defaultValue: 'Quick 30-second tour' }),
      desc: t('tour.introDesc', { defaultValue: "Let's show you the 4 things you need to start winning with AI." }),
    },
    {
      type: 'spot',
      title: t('tour.bestBetTitle', { defaultValue: "AI's Best Bet of the Day" }),
      desc: t('tour.bestBetDesc', { defaultValue: 'The single highest-confidence pick our AI found today. Tap it to see the full analysis.' }),
    },
    {
      type: 'spot',
      title: t('tour.matchesTitle', { defaultValue: 'All matches, 900+ leagues' }),
      desc: t('tour.matchesDesc', { defaultValue: 'Browse any match and tap it to get a free AI prediction with confidence %, H2H and stats.' }),
    },
    {
      type: 'spot',
      title: t('tour.aiChatTitle', { defaultValue: 'Ask the AI anything' }),
      desc: t('tour.aiChatDesc', { defaultValue: 'Try "best bets today" or "Real vs Barça prediction" — answers use real-time data.' }),
    },
    {
      type: 'spot',
      title: t('tour.betTitle', { defaultValue: 'Place your bet' }),
      desc: t('tour.betDesc', { defaultValue: 'When a pick looks good, tap here to bet it with the best odds — in one tap.' }),
    },
    {
      type: 'final',
      accent: 'from-green-500 to-teal-500',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ),
      title: t('tour.doneTitle', { defaultValue: "You're all set!" }),
      desc: hidePro
        ? t('tour.doneDescFree', { defaultValue: 'Pick a match and try your first AI prediction now.' })
        : t('tour.doneDesc', { defaultValue: 'You get 5 free AI predictions every day. Pick a match and try your first one!' }),
    },
  ];

  const lastStep = steps.length - 1;
  const current = steps[step];

  const measure = useCallback(() => {
    if (!selector) { setRect(null); return; }
    const el = document.querySelector(selector);
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
  }, [selector]);

  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    const el = document.querySelector(selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    measure();
    const id = setTimeout(measure, 380);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector, measure]);

  const next = () => { if (step < lastStep) setStep(step + 1); };
  const skip = () => onClose();

  const progress = `${step + 1} / ${steps.length}`;

  // ---- Centered card (intro / final) ----
  if (current.type === 'center' || current.type === 'final') {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={current.type === 'final' ? undefined : skip} />
        <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl px-6 pt-6 pb-6 text-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 font-medium">{progress}</span>
            {current.type !== 'final' && (
              <button onClick={skip} className="text-xs text-gray-400 font-medium">
                {t('tour.skip', { defaultValue: 'Skip' })}
              </button>
            )}
          </div>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${current.accent} flex items-center justify-center shadow-lg`}>
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{current.desc}</p>

          {current.type === 'final' ? (
            <>
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 mb-3"
              >
                {t('tour.start', { defaultValue: 'Start exploring' })}
              </button>
              {expressFirst ? (
                <button onClick={onGoToExpress} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 rounded-xl">
                  {t('tour.seeExpress', { defaultValue: 'See AI Express Bets' })}
                </button>
              ) : !hidePro && (
                <button onClick={onGoToPromo} className="w-full text-primary-500 text-sm font-medium py-2">
                  {t('tour.discoverPro', { defaultValue: 'Discover PRO (free)' })}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={next}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              {t('tour.next', { defaultValue: 'Next' })}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- Spotlight step ----
  const pad = 8;
  const gap = 14;        // distance between spotlight and tooltip
  const margin = 12;     // keep tooltip off the screen edge
  const hasRect = !!rect;
  const vh = window.innerHeight;
  // Available room on each side; pick the larger so the action button always fits.
  const spaceAbove = hasRect ? rect.top - pad - gap : 0;
  const spaceBelow = hasRect ? vh - (rect.bottom + pad + gap) : 0;
  const above = hasRect ? spaceAbove > spaceBelow : true;
  const maxH = hasRect ? Math.max(180, (above ? spaceAbove : spaceBelow) - margin) : undefined;

  return (
    <div className="fixed inset-0 z-[120]">
      {/* Dim layer (covers everything). Tap anywhere advances. */}
      <div className="absolute inset-0" onClick={next} style={{ background: hasRect ? 'transparent' : 'rgba(0,0,0,0.7)' }} />

      {/* Spotlight cutout via huge box-shadow */}
      {hasRect && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
            outline: '2px solid rgba(255,255,255,0.9)',
            outlineOffset: '2px',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute left-4 right-4 max-w-sm mx-auto"
        style={hasRect
          ? (above
              ? { bottom: vh - rect.top + pad + gap }
              : { top: rect.bottom + pad + gap })
          : { top: '50%', transform: 'translateY(-50%)' }}
      >
        <div className="bg-white rounded-2xl shadow-2xl px-5 pt-4 pb-4 flex flex-col" style={{ maxHeight: maxH }}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-xs text-gray-400 font-medium">{progress}</span>
            <button onClick={skip} className="text-xs text-gray-400 font-medium">
              {t('tour.skip', { defaultValue: 'Skip' })}
            </button>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1 shrink-0">{current.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4 min-h-0 overflow-y-auto">{current.desc}</p>
          <button
            onClick={next}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 shrink-0"
          >
            {step === lastStep - 1
              ? t('tour.finish', { defaultValue: 'Finish' })
              : t('tour.next', { defaultValue: 'Next' })}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Guided tour — walks a new user through the app with a spotlight.
 *
 * Replaces the old 5-slide deck, which told people about features in the
 * abstract while they stared at a modal. Vlad on 29.07: "сейчас этот онбординг
 * очень плох… если да, то всё красиво показать, выделяя светом и рассказывая
 * что и как" — so this dims the screen, cuts a hole around the real element and
 * explains it in place.
 *
 * Steps target live DOM nodes by `data-tour` attribute. A step whose target is
 * missing (feature hidden for this funnel, element off-screen) is skipped
 * silently rather than pointing at nothing.
 */
import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../../shared/services/analytics';

const PADDING = 8;      // breathing room around the highlighted element
const TIP_GAP = 14;     // distance between spotlight and tooltip

export default function GuidedTour({ steps, onFinish }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);

  // Only steps whose element actually exists on the page right now.
  const live = steps.filter((s) => document.querySelector(`[data-tour="${s.id}"]`));
  const step = live[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Wait for the smooth scroll to settle before measuring, otherwise the
    // spotlight lands where the element used to be.
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 320);
  }, [step]);

  useLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [measure]);

  useEffect(() => {
    // The page behind must not scroll while the tour drives the view.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const finish = (completed) => {
    track('tour_finished', { completed, step: index + 1, of: live.length });
    onFinish?.();
  };

  const next = () => {
    if (index < live.length - 1) {
      setIndex(index + 1);
    } else {
      finish(true);
    }
  };

  if (!step || !rect) return null;

  const hole = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
  // Place the tooltip below the spotlight, unless that would run off-screen.
  const below = hole.top + hole.height + TIP_GAP;
  const tipBelow = below + 150 < window.innerHeight;
  const isLast = index === live.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Dimmer with a hole: one element, no four-rectangle math, and the huge
          spread shadow covers the viewport at any size. */}
      <div
        className="absolute rounded-2xl pointer-events-none transition-all duration-300"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(2,6,23,0.82)',
          border: '2px solid rgba(59,130,246,0.9)',
        }}
      />

      {/* Click anywhere outside the tooltip advances the tour. */}
      <div className="absolute inset-0" onClick={next} />

      <div
        className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm"
        style={tipBelow ? { top: below } : { bottom: window.innerHeight - hole.top + TIP_GAP }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
              {index + 1} / {live.length}
            </span>
          </div>
          <p className="text-[15px] font-bold text-gray-900 dark:text-slate-100 leading-snug">
            {t(step.titleKey, { defaultValue: step.title })}
          </p>
          <p className="text-[13px] text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">
            {t(step.textKey, { defaultValue: step.text })}
          </p>

          <div className="flex items-center gap-2 mt-3.5">
            <button
              onClick={() => finish(false)}
              className="text-[13px] text-gray-400 dark:text-slate-500 px-2 py-2"
            >
              {t('tour.skip', { defaultValue: 'Skip' })}
            </button>
            <button
              onClick={next}
              className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              {isLast
                ? t('tour.done', { defaultValue: 'Got it' })
                : t('tour.next', { defaultValue: 'Next' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

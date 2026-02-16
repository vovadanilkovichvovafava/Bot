import { useEffect, useRef } from 'react';

/**
 * Hook that auto-scrolls focused inputs into view when mobile keyboard opens.
 * Works on iOS (visualViewport) and Android (resize event).
 *
 * Usage: const formRef = useKeyboardScroll();
 *        <form ref={formRef}>...</form>
 */
export default function useKeyboardScroll() {
  const formRef = useRef(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    // When an input gets focused, scroll it into view after keyboard animation
    const handleFocus = (e) => {
      const el = e.target;
      if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT')) return;

      // Delay to let keyboard open and viewport resize
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    form.addEventListener('focusin', handleFocus);

    // iOS visualViewport resize handler — adjusts scroll when keyboard appears
    let vpHandler = null;
    if (window.visualViewport) {
      vpHandler = () => {
        const active = document.activeElement;
        if (active && form.contains(active) &&
            (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            active.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }
      };
      window.visualViewport.addEventListener('resize', vpHandler);
    }

    return () => {
      form.removeEventListener('focusin', handleFocus);
      if (vpHandler && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', vpHandler);
      }
    };
  }, []);

  return formRef;
}

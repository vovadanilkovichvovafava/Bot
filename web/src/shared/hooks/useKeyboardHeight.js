import { useState, useEffect, useCallback } from 'react';

/**
 * Universal keyboard height hook.
 * Works on Android (visualViewport API) and iOS Safari (visualViewport + fallback).
 *
 * Returns:
 *  - keyboardOpen: boolean — is the keyboard visible
 *  - viewportHeight: number — actual visible height in px (excluding keyboard)
 *  - keyboardHeight: number — estimated keyboard height in px
 *
 * Also sets CSS custom property --viewport-height on :root for CSS usage.
 *
 * Usage:
 *   const { keyboardOpen, viewportHeight, keyboardHeight } = useKeyboardHeight();
 *   <div style={{ height: viewportHeight }}>...</div>
 */
export default function useKeyboardHeight() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    () => window.visualViewport?.height || window.innerHeight
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const fullHeight = window.innerHeight;
    const visibleHeight = vv.height;
    const kbHeight = Math.max(0, fullHeight - visibleHeight);
    const isOpen = kbHeight > fullHeight * 0.15; // keyboard > 15% of screen = open

    setViewportHeight(visibleHeight);
    setKeyboardHeight(kbHeight);
    setKeyboardOpen(isOpen);

    // Set CSS custom property for pure-CSS solutions
    document.documentElement.style.setProperty('--viewport-height', `${visibleHeight}px`);
    document.documentElement.style.setProperty('--keyboard-height', `${kbHeight}px`);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // Initial measurement
    update();

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    // iOS fallback: also listen for focusin/focusout for quicker detection
    const handleFocusIn = () => setTimeout(update, 300);
    const handleFocusOut = () => setTimeout(update, 100);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      // Reset CSS properties
      document.documentElement.style.removeProperty('--viewport-height');
      document.documentElement.style.removeProperty('--keyboard-height');
    };
  }, [update]);

  return { keyboardOpen, viewportHeight, keyboardHeight };
}

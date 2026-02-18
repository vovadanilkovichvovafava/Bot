import { createContext, useContext, useState, useCallback } from 'react';

const BottomNavContext = createContext(null);

/**
 * Manages BottomNav visibility via React state (not DOM manipulation).
 * Components call hideBottomNav() / showBottomNav() to toggle.
 * Multiple hiders are tracked with a counter — BottomNav shows only when all have released.
 */
export function BottomNavProvider({ children }) {
  const [hideCount, setHideCount] = useState(0);

  const hideBottomNav = useCallback(() => setHideCount(c => c + 1), []);
  const showBottomNav = useCallback(() => setHideCount(c => Math.max(0, c - 1)), []);

  return (
    <BottomNavContext.Provider value={{ visible: hideCount === 0, hideBottomNav, showBottomNav }}>
      {children}
    </BottomNavContext.Provider>
  );
}

export function useBottomNav() {
  const ctx = useContext(BottomNavContext);
  if (!ctx) {
    // Fallback for components rendered outside Layout (e.g., Login page)
    return { visible: true, hideBottomNav: () => {}, showBottomNav: () => {} };
  }
  return ctx;
}

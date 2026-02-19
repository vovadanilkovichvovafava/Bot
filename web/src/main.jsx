import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookmakerProvider } from './context/BookmakerContext';
import { AdvertiserProvider } from './context/AdvertiserContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

// Initialize i18n (auto-detects phone/browser language)
import './i18n';

// ONE-TIME forced cache clear after haiku model migration
// Runs once per device, clears stale AI caches + forces SW update, then never again
(function forceCacheClear() {
  const FLAG = 'force_cache_clear_v1';
  try {
    if (localStorage.getItem(FLAG)) return; // Already done
    // Clear stale AI response caches
    localStorage.removeItem('ai_chat_history');
    localStorage.removeItem('match_predictions_cache');
    // Set flag so this never runs again
    localStorage.setItem(FLAG, Date.now().toString());
    // Unregister SW so fresh version loads
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      }).then(() => {
        // Delete all SW caches
        if ('caches' in window) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
        }
      }).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
    return; // Stop execution — page will reload
  } catch {}
})();

// Fix: Chrome/Safari auto-translate modifies DOM (wraps text in <font> tags).
// When React tries to update/remove those nodes during re-render, it crashes with
// "Failed to execute 'removeChild'/'insertBefore' on 'Node'".
// This patch silently handles the mismatch instead of crashing the whole app.
if (typeof Node !== 'undefined') {
  const _removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      console.warn('[translate-fix] removeChild: node is not a child, skipping');
      return child;
    }
    return _removeChild.call(this, child);
  };
  const _insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, refNode) {
    if (refNode && refNode.parentNode !== this) {
      console.warn('[translate-fix] insertBefore: ref node is not a child, skipping');
      return newNode;
    }
    return _insertBefore.call(this, newNode, refNode);
  };
}

// Handle chunk load failures after deploy — auto-reload to get new assets
// This prevents blank screens that Yandex Metrica Webvisor would record as broken
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = sessionStorage.getItem('chunk-reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload) > 10000) {
    sessionStorage.setItem('chunk-reload', now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AdvertiserProvider>
            <BookmakerProvider>
              <App />
            </BookmakerProvider>
          </AdvertiserProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register Service Worker with auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Check for updates every 5 minutes
      setInterval(() => reg.update(), 5 * 60 * 1000);
    }).catch(() => {
      // SW registration failed — app works fine without it
    });

    // Listen for SW update message — reload page silently
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        // Reload only if page is not actively being used (no form focus)
        const activeElement = document.activeElement;
        const isUserTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        if (!isUserTyping) {
          window.location.reload();
        }
      }
    });
  });
}

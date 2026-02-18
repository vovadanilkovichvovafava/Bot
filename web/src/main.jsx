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

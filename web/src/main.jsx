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

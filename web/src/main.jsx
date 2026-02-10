import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookmakerProvider } from './context/BookmakerContext';
import { AdvertiserProvider } from './context/AdvertiserContext';
import App from './App';
import './index.css';

// Initialize i18n (auto-detects phone/browser language)
import './i18n';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdvertiserProvider>
          <BookmakerProvider>
            <App />
          </BookmakerProvider>
        </AdvertiserProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import FootballSpinner from './components/FootballSpinner';
import { saveTrackingParams } from './services/trackingService';
import { track } from './services/analytics';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import AIChat from './pages/AIChat';
import ProTools from './pages/ProTools';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import Favourites from './pages/Favourites';
import LeagueMatches from './pages/LeagueMatches';
import ValueFinder from './pages/ValueFinder';
import PredictionHistory from './pages/PredictionHistory';
import OddsConverter from './pages/OddsConverter';
import YourStats from './pages/YourStats';
import LiveMatchDetail from './pages/LiveMatchDetail';
import BookmakerPromo from './pages/BookmakerPromo';
import ProAccess from './pages/ProAccess';
import BeginnerGuide from './pages/BeginnerGuide';
import BankrollTracker from './pages/BankrollTracker';
import BetSlipBuilder from './pages/BetSlipBuilder';
import KellyCalculator from './pages/KellyCalculator';
import NotFound from './pages/NotFound';

function hasAccountFlag() {
  try { return localStorage.getItem('hasAccount') === 'true'; } catch { return false; }
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isAuthenticated) {
    return <Navigate to={hasAccountFlag() ? "/login" : "/register"} replace />;
  }
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function SplashScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800">
      <FootballSpinner size="lg" text="AI Betting Bot" light />
    </div>
  );
}

// Сохранить fbclid/utm из URL в sessionStorage ДО любых редиректов
// (при редиректе на /register или /login query string теряется)
(function persistTrackingParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    keys.forEach(key => {
      const val = params.get(key);
      if (val) sessionStorage.setItem(`tracking_${key}`, val);
    });
  } catch {}
})();

export default function App() {
  const { loading, user } = useAuth();
  const trackingSaved = useRef(false);
  const location = useLocation();
  const prevLocationRef = useRef(null);

  // Яндекс Метрика — SPA pageview tracking (defer:true в init, hit вручную)
  useEffect(() => {
    if (typeof window.ym === 'function') {
      const url = location.pathname + location.search;
      const referer = prevLocationRef.current
        ? prevLocationRef.current.pathname + prevLocationRef.current.search
        : document.referrer;
      window.ym(106847617, 'hit', url, {
        title: document.title,
        referer,
      });
    }
    prevLocationRef.current = location;

    // Our analytics — page views to DB
    track('page_view', { path: location.pathname });
  }, [location]);

  // Сохранить fbclid/utm параметры из URL при первом заходе
  useEffect(() => {
    if (user?.id && !trackingSaved.current) {
      trackingSaved.current = true;
      saveTrackingParams(user.id);
    }
  }, [user?.id]);

  if (loading) return <SplashScreen />;

  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="matches" element={<Matches />} />
        <Route path="ai-chat" element={<AIChat />} />
        <Route path="pro-tools" element={<ProTools />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/match/:id" element={
        <ProtectedRoute><MatchDetail /></ProtectedRoute>
      } />
      <Route path="/live/:id" element={
        <ProtectedRoute><LiveMatchDetail /></ProtectedRoute>
      } />
      <Route path="/premium" element={<Navigate to="/pro-access" replace />} />
      <Route path="/value-finder" element={
        <ProtectedRoute><ValueFinder /></ProtectedRoute>
      } />
      <Route path="/prediction-history" element={
        <ProtectedRoute><PredictionHistory /></ProtectedRoute>
      } />
      <Route path="/odds-converter" element={
        <ProtectedRoute><OddsConverter /></ProtectedRoute>
      } />
      <Route path="/your-stats" element={
        <ProtectedRoute><YourStats /></ProtectedRoute>
      } />
      <Route path="/league/:code" element={
        <ProtectedRoute><LeagueMatches /></ProtectedRoute>
      } />
      <Route path="/statistics" element={
        <ProtectedRoute><Statistics /></ProtectedRoute>
      } />
      <Route path="/favourites" element={
        <ProtectedRoute><Favourites /></ProtectedRoute>
      } />
      <Route path="/promo" element={
        <ProtectedRoute><BookmakerPromo /></ProtectedRoute>
      } />
      <Route path="/pro-access" element={
        <ProtectedRoute><ProAccess /></ProtectedRoute>
      } />
      <Route path="/guide" element={
        <ProtectedRoute><BeginnerGuide /></ProtectedRoute>
      } />
      <Route path="/bankroll-tracker" element={
        <ProtectedRoute><BankrollTracker /></ProtectedRoute>
      } />
      <Route path="/bet-slip-builder" element={
        <ProtectedRoute><BetSlipBuilder /></ProtectedRoute>
      } />
      <Route path="/kelly-calculator" element={
        <ProtectedRoute><KellyCalculator /></ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

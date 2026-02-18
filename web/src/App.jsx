import { useEffect, useRef, Component, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import FootballSpinner from './components/FootballSpinner';
import { saveTrackingParams } from './services/trackingService';
import Layout from './components/Layout';

// ErrorBoundary — catches React render crashes, shows fallback instead of white screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
          <div className="text-4xl mb-4">&#9888;&#65039;</div>
          <h1 className="text-white text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-6">The app encountered an error. Please reload the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
// Critical path — loaded eagerly
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

// Lazy-loaded pages — split into separate chunks
const Matches = lazy(() => import('./pages/Matches'));
const MatchDetail = lazy(() => import('./pages/MatchDetail'));
const AIChat = lazy(() => import('./pages/AIChat'));
const ProTools = lazy(() => import('./pages/ProTools'));
const Settings = lazy(() => import('./pages/Settings'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Favourites = lazy(() => import('./pages/Favourites'));
const LeagueMatches = lazy(() => import('./pages/LeagueMatches'));
const ValueFinder = lazy(() => import('./pages/ValueFinder'));
const PredictionHistory = lazy(() => import('./pages/PredictionHistory'));
const OddsConverter = lazy(() => import('./pages/OddsConverter'));
const YourStats = lazy(() => import('./pages/YourStats'));
const LiveMatchDetail = lazy(() => import('./pages/LiveMatchDetail'));
const BookmakerPromo = lazy(() => import('./pages/BookmakerPromo'));
const ProAccess = lazy(() => import('./pages/ProAccess'));
const BeginnerGuide = lazy(() => import('./pages/BeginnerGuide'));
const BankrollTracker = lazy(() => import('./pages/BankrollTracker'));
const BetSlipBuilder = lazy(() => import('./pages/BetSlipBuilder'));
const KellyCalculator = lazy(() => import('./pages/KellyCalculator'));
const NotFound = lazy(() => import('./pages/NotFound'));

function hasAccountFlag() {
  try { return localStorage.getItem('hasAccount') === 'true'; } catch { return false; }
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <SplashScreen />;
  if (!isAuthenticated) {
    // Прокидываем UTM/query string при редиректе на регу/логин
    const target = hasAccountFlag() ? "/login" : "/register";
    const search = loc.search || '';
    return <Navigate to={`${target}${search}`} replace />;
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

  // Яндекс Метрика — SPA pageview tracking
  useEffect(() => {
    if (typeof window.ym !== 'function') {
      prevLocationRef.current = location;
      return;
    }
    const url = location.pathname + location.search;
    const referer = prevLocationRef.current
      ? prevLocationRef.current.pathname + prevLocationRef.current.search
      : document.referrer;
    // Delay to let React render the new page DOM before Metrika scans it
    const timer = setTimeout(() => {
      window.ym(106847617, 'hit', url, {
        title: document.title,
        referer,
      });
    }, 150);
    prevLocationRef.current = location;
    return () => clearTimeout(timer);
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
    <ErrorBoundary>
      <Suspense fallback={<SplashScreen />}>
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
      </Suspense>
    </ErrorBoundary>
  );
}

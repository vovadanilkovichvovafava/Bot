import { useEffect, useRef, Component, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import FootballSpinner from './components/FootballSpinner';
import { saveTrackingParams } from './services/trackingService';
import { track } from './services/analytics';
import Layout from './components/Layout';

// ErrorBoundary — catches React render crashes, shows fallback instead of white screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Try to send error to analytics
    try {
      if (typeof window.ym === 'function') {
        window.ym(106847617, 'reachGoal', 'app_crash', {
          error: String(error),
          stack: errorInfo?.componentStack?.slice(0, 500),
        });
      }
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unknown error';
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] p-6 text-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-sm">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-4">The app encountered an error.</p>
            <p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2 mb-4 break-all font-mono">{errorMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl text-sm"
              >
                Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary-500 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                Reload
              </button>
            </div>
          </div>
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
    // Returning users → /login, новые с рекламы приходят на /register напрямую
    // Дефолт /login чтобы returning users с потерянным hasAccount не попадали на /register
    const target = "/login";
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

// Сохранить ВСЕ query params из URL в sessionStorage ДО любых редиректов
// (external_id, sub_id_1..15, fbclid, utm_* — всё что пришло из клоачной ссылки)
(function persistTrackingParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    for (const [key, val] of params.entries()) {
      if (val) sessionStorage.setItem(`tracking_${key}`, val);
    }
  } catch {}
})();

export default function App() {
  const { loading, user } = useAuth();
  const trackingSaved = useRef(false);
  const location = useLocation();
  const prevLocationRef = useRef(null);

  // SPA pageview tracking — наша аналитика + Яндекс Метрика
  useEffect(() => {
    // 1. Наша аналитика — ВСЕГДА отправляем page_view
    track('page_view');

    // 2. Яндекс Метрика — если подключена
    const url = location.pathname + location.search;
    const referer = prevLocationRef.current
      ? prevLocationRef.current.pathname + prevLocationRef.current.search
      : document.referrer;
    prevLocationRef.current = location;

    if (typeof window.ym === 'function') {
      // Delay to let React fully render the page DOM before Metrika snapshots it for webvisor
      const timer = setTimeout(() => {
        window.ym(106847617, 'hit', url, { title: document.title, referer });
      }, 500);
      return () => clearTimeout(timer);
    }
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

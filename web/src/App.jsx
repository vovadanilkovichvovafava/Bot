import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import FootballSpinner from './components/FootballSpinner';
import { saveTrackingParams } from './services/trackingService';
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
import Premium from './pages/Premium';
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

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isAuthenticated) {
    const hasAccount = localStorage.getItem('has_account');
    return <Navigate to={hasAccount ? '/login' : '/register'} replace />;
  }
  return children;
}

function SplashScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800">
      <FootballSpinner size="lg" text="AI Betting Bot" light />
    </div>
  );
}

export default function App() {
  const { loading, user } = useAuth();
  const trackingSaved = useRef(false);

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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
      <Route path="/premium" element={
        <ProtectedRoute><Premium /></ProtectedRoute>
      } />
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

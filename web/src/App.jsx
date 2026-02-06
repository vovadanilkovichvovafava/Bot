import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
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
import BeginnerGuide from './pages/BeginnerGuide';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function SplashScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800">
      <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
        <svg viewBox="0 0 40 40" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="20" cy="20" r="16"/>
          <circle cx="20" cy="20" r="5"/>
          <line x1="20" y1="4" x2="20" y2="12"/>
          <line x1="20" y1="28" x2="20" y2="36"/>
          <line x1="4" y1="20" x2="12" y2="20"/>
          <line x1="28" y1="20" x2="36" y2="20"/>
        </svg>
      </div>
      <h1 className="text-white text-2xl font-bold">AI Betting Bot</h1>
      <div className="mt-8 w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"/>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

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
      <Route path="/guide" element={
        <ProtectedRoute><BeginnerGuide /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

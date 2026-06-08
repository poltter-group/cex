import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TradingDashboard } from './components/TradingDashboard';
import { Home } from './components/Home';
import { Markets } from './components/Markets';
import { Auth } from './components/Auth';
import { CopyTrading } from './components/CopyTrading';
import { Square } from './components/Square';
import { Profile } from './components/Profile';
import { AdminPanel } from './components/AdminPanel';
import { Wallet } from './components/Wallet';
import { Support } from './components/Support';
import { useAuth } from './lib/auth-context';

import { AboutPage, FeesPage, TermsPage, PrivacyPage, RiskPage, ContactPage, AmlPage, CoinInfoPage } from './components/InfoPages';

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}


export default function App() {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [activeTradePair, setActiveTradePair] = useState<string>('BTC');
  const [squareTab, setSquareTab] = useState<'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG'>('COMMUNITY');

  const location = useLocation();
  const navigate = useNavigate();

  const setCurrentView = (v: string, payload?: any) => {
    switch (v) {
      case 'HOME': navigate('/'); break;
      case 'MARKETS': navigate('/markets', payload ? { state: { category: payload } } : undefined); break;
      case 'AUTH': navigate('/auth'); break;
      case 'SPOT': navigate('/trade'); break;
      case 'INFO': navigate(`/info/${payload?.pair || 'BTCUSDT'}`); break;
      case 'COPY_TRADING': navigate('/copy-trading'); break;
      case 'SQUARE': navigate('/square'); break;
      case 'PROFILE': navigate('/profile'); break;
      case 'ADMIN': navigate('/admin'); break;
      case 'WALLET': navigate('/wallet'); break;
      case 'SUPPORT': navigate('/support'); break;
      case 'ABOUT': navigate('/about'); break;
      case 'FEES': navigate('/fees'); break;
      case 'TERMS': navigate('/terms'); break;
      case 'PRIVACY': navigate('/privacy'); break;
      case 'RISK': navigate('/risk'); break;
      case 'CONTACT': navigate('/contact'); break;
      case 'AML': navigate('/aml'); break;
      default: navigate('/'); break;
    }
  };

  const currentView = location.pathname;

  return (
    <div className="h-[100dvh] w-full bg-dark-bg text-dark-text font-sans selection:bg-primary-500/30 overflow-hidden flex flex-col">
      <Routes>
        <Route path="/admin/*" element={<ProtectedAdminRoute><AdminPanel /></ProtectedAdminRoute>} />
        
        <Route path="/*" element={
          <div className="h-full w-full flex flex-col pt-14">
            <Layout 
              currentView={currentView} 
              setCurrentView={setCurrentView} 
              setAuthMode={setAuthMode}
              isSupportOpen={isSupportOpen}
              setIsSupportOpen={setIsSupportOpen}
              activeTradePair={activeTradePair}
              setActiveTradePair={setActiveTradePair}
              squareTab={squareTab}
              setSquareTab={setSquareTab}
            >
              <Routes>
                <Route path="/" element={<Home setCurrentView={setCurrentView as any} setAuthMode={setAuthMode} />} />
                <Route path="/markets" element={<Markets setCurrentView={(v: string) => { if (v === 'SQUARE') setSquareTab('COMMUNITY'); setCurrentView(v); }} />} />
                <Route path="/auth" element={<Auth mode={authMode} setMode={setAuthMode} setCurrentView={(v: string) => { if (v === 'SQUARE') setSquareTab('COMMUNITY'); setCurrentView(v); }} />} />
                <Route path="/trade" element={
                  <TradingDashboard 
                    setCurrentView={(v: string) => { if (v === 'SQUARE') setSquareTab('COMMUNITY'); setCurrentView(v); }} 
                    setAuthMode={setAuthMode} 
                    activeTradePair={activeTradePair}
                    setActiveTradePair={setActiveTradePair}
                  />
                } />
                <Route path="/copy-trading" element={<CopyTrading />} />
                <Route path="/square" element={<Square activeCategory={squareTab} setActiveCategory={setSquareTab} setCurrentView={setCurrentView} setAuthMode={setAuthMode} />} />
                <Route path="/profile" element={<Profile setCurrentView={setCurrentView} />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/wallet/*" element={<Wallet />} />
                <Route path="/support" element={<Support />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/info/:pair" element={<CoinInfoPage />} />
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/risk" element={<RiskPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/aml" element={<AmlPage />} />
              </Routes>
            </Layout>
          </div>
        } />
      </Routes>
    </div>
  );
}

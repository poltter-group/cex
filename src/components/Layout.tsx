import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircleQuestion } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Web3WalletModal } from './Web3WalletModal';

export function Layout({ 
  children,
  currentView,
  setCurrentView,
  setAuthMode,
  isSupportOpen,
  setIsSupportOpen,
  activeTradePair,
  setActiveTradePair,
  squareTab,
  setSquareTab
}: { 
  children: ReactNode;
  currentView: any;
  setCurrentView: (v: any) => void;
  setAuthMode: (m: 'LOGIN' | 'REGISTER') => void;
  isSupportOpen: boolean;
  setIsSupportOpen: (open: boolean) => void;
  activeTradePair?: string;
  setActiveTradePair?: (p: string) => void;
  squareTab?: any;
  setSquareTab?: (tab: any) => void;
}) {
  const location = useLocation();
  const { isWeb3ModalOpen, setWeb3ModalOpen } = useAuth();
  const isAppPage = ['/trade', '/wallet', '/copy-trading', '/square', '/profile', '/support'].includes(location.pathname) || location.pathname.startsWith('/wallet') || location.pathname.startsWith('/admin');
  const showFooter = !isAppPage;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-dark-bg">
        <TopBar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          setAuthMode={setAuthMode} 
          onOpenSupport={() => setIsSupportOpen(true)}
          activeTradePair={activeTradePair}
          setActiveTradePair={setActiveTradePair}
          squareTab={squareTab}
          setSquareTab={setSquareTab}
        />
      </div>
      
      <main className={`w-full h-full relative z-10 bg-dark-bg flex flex-col ${isAppPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={`flex flex-col flex-1 ${isAppPage ? 'h-full overflow-hidden' : 'min-h-full'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`w-full flex-1 flex flex-col ${isAppPage ? 'h-full overflow-hidden' : 'mb-16'}`}
            >
              {children}
            </motion.div>
          </AnimatePresence>
          {/* Footer at the bottom of the scrollable area */}
          {showFooter && <Footer setCurrentView={setCurrentView} />}
        </div>
      </main>

      <Web3WalletModal isOpen={isWeb3ModalOpen} onClose={() => setWeb3ModalOpen(false)} />
    </>
  );
}

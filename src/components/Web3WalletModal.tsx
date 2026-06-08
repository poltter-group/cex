import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

type WalletProvider = 'MetaMask' | 'Phantom';

const MetaMaskLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 318.6 318.6" className="w-8 h-8">
    <path fill="#e2761b" stroke="#e2761b" strokeLinecap="round" strokeLinejoin="round" d="m274.1 35.5-99.5 73.9L193 65.8z"/>
    <path d="m44.4 35.5 98.7 74.6-17.5-44.3zm193.9 171.3-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L50.1 263l56.7-15.6-26.5-40.6z" fill="#e4761b" stroke="#e4761b" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m103.6 138.2-15.8 23.9 56.3 2.5-2-60.5zm111.3 0-39-34.8-1.3 61.2 56.2-2.5zM106.8 247.4l33.8-16.5-29.2-22.8zm71.1-16.5 33.9 16.5-4.7-39.3z" fill="#e4761b" stroke="#e4761b" strokeLinecap="round" strokeLinejoin="round"/>
    <path fill="#d7c1b3" stroke="#d7c1b3" strokeLinecap="round" strokeLinejoin="round" d="m211.8 247.4-33.9-16.5 2.7 22.1-.3 9.3zm-105 0 31.5 14.9-.2-9.3 2.5-22.1z"/>
    <path fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" d="m138.8 193.5-28.2-8.3 19.9-9.1zm40.9 0 8.3-17.4 20 9.1z"/>
    <path fill="#cd6116" stroke="#cd6116" strokeLinecap="round" strokeLinejoin="round" d="m106.8 247.4 4.8-40.6-31.3.9zM207 206.8l4.8 40.6 26.5-39.7zm23.8-44.7-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1zm-120.2 23.1 20-9.1 8.2 17.4 5.3-28.9-56.3-2.5z"/>
    <path fill="#e4751f" stroke="#e4751f" strokeLinecap="round" strokeLinejoin="round" d="m87.8 162.1 23.6 46-.8-22.9zm120.3 23.1-1 22.9 23.7-46zm-64-20.6-5.3 28.9 6.6 34.1 1.5-44.9zm30.5 0-2.7 18 1.2 45 6.7-34.1z"/>
    <path d="m179.8 193.5-6.7 34.1 4.8 3.3 29.2-22.8 1-22.9zm-69.2-8.3.8 22.9 29.2 22.8 4.8-3.3-6.6-34.1z" fill="#f6851b" stroke="#f6851b" strokeLinecap="round" strokeLinejoin="round"/>
    <path fill="#c0ad9e" stroke="#c0ad9e" strokeLinecap="round" strokeLinejoin="round" d="m180.3 262.3.3-9.3-2.5-2.2h-37.7l-2.3 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9z"/>
    <path fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round" d="m177.9 230.9-4.8-3.3h-27.7l-4.8 3.3-2.5 22.1 2.3-2.2h37.7l2.5 2.2z"/>
    <path fill="#763d16" stroke="#763d16" strokeLinecap="round" strokeLinejoin="round" d="m278.3 114.2 8.5-40.8-12.7-37.9-96.2 71.4 37 31.3 52.3 15.3 11.6-13.5-5-3.6 8-7.3-6.2-4.8 8-6.1zM31.8 73.4l8.5 40.8-5.4 4 8 6.1-6.1 4.8 8 7.3-5 3.6 11.5 13.5 52.3-15.3 37-31.3-96.2-71.4z"/>
    <path d="m267.2 153.5-52.3-15.3 15.9 23.9-23.7 46 31.2-.4h46.5zm-163.6-15.3-52.3 15.3-17.4 54.2h46.4l31.1.4-23.6-46zm71 26.4 3.3-57.7 15.2-41.1h-67.5l15 41.1 3.5 57.7 1.2 18.2.1 44.8h27.7l.2-44.8z" fill="#f6851b" stroke="#f6851b" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PhantomLogo = () => (
  <svg viewBox="0 0 128 128" className="w-8 h-8">
    <circle cx="64" cy="64" r="64" fill="#AB9FF2" />
    <path d="M41.7 49.3c0-12 9.6-21.7 21.5-21.7s21.5 9.7 21.5 21.7v38c0 2.2-1.8 4-4.1 4h-1.5c-2 0-3.8-1.5-4.1-3.5L74 76c-.3-1.8-1.8-3.1-3.6-3.1s-3.3 1.3-3.6 3l-1.1 11.5c-.2 2.1-2.1 3.7-4.2 3.7h-.8c-2.1 0-3.9-1.6-4.2-3.7l-1-11.6c-.3-1.8-1.8-3.1-3.6-3.1s-3.3 1.3-3.6 3.1l-1 11.6c-.3 2.1-2 3.7-4.2 3.7H38c-2.2 0-4-1.8-4-4v-38z" fill="#fff"/>
  </svg>
);

export function Web3WalletModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { signInWithWeb3Address } = useAuth() as any;
  
  const [connectStep, setConnectStep] = useState<'SELECT_WALLET' | 'CONNECTING' | 'ERROR'>('SELECT_WALLET');
  const [selectedWallet, setSelectedWallet] = useState<WalletProvider | null>(null);
  const [errorText, setErrorText] = useState('');
  
  const WALLETS: { id: WalletProvider; name: string; icon: ReactNode; checkInstalled: () => boolean }[] = [
    { 
      id: 'MetaMask', 
      name: 'MetaMask', 
      icon: <MetaMaskLogo />,
      checkInstalled: () => typeof window !== 'undefined' && !!(window as any).ethereum
    },
    { 
      id: 'Phantom', 
      name: 'Phantom', 
      icon: <PhantomLogo />,
      checkInstalled: () => typeof window !== 'undefined' && !!(window as any).phantom?.solana
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setConnectStep('SELECT_WALLET');
      setSelectedWallet(null);
      setErrorText('');
    }
  }, [isOpen]);

  const handleWalletSelect = async (wallet: WalletProvider) => {
    setSelectedWallet(wallet);
    setConnectStep('CONNECTING');
    setErrorText('');

    const isInstalled = WALLETS.find(w => w.id === wallet)?.checkInstalled();

    if (isInstalled) {
      if (wallet === 'MetaMask') {
         try {
           await (window as any).ethereum.request({
             method: 'wallet_requestPermissions',
             params: [{ eth_accounts: {} }]
           });
           const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
           if (accounts && accounts[0]) {
             await signInWithWeb3Address(accounts[0], wallet);
             onClose();
             navigate('/trade');
             return;
           }
         } catch (err: any) {
           setErrorText(err.message || 'Connection rejected');
           setConnectStep('ERROR');
           return;
         }
      } else if (wallet === 'Phantom') {
         try {
           const resp = await (window as any).phantom.solana.connect();
           if (resp.publicKey) {
             await signInWithWeb3Address(resp.publicKey.toString(), wallet);
             onClose();
             navigate('/trade');
             return;
           }
         } catch (err: any) {
           setErrorText(err.message || 'Connection rejected');
           setConnectStep('ERROR');
           return;
         }
      }
    } else {
       setErrorText(`Please install the ${wallet} extension first.`);
       setConnectStep('ERROR');
    }
  };

  if (!isOpen) return null;

  const currentWallet = WALLETS.find(w => w.id === selectedWallet);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (connectStep !== 'CONNECTING') {
              onClose();
            }
          }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative bg-[#191A1E] rounded-[28px] w-full max-w-[360px] z-10 overflow-hidden shadow-2xl flex flex-col font-sans border border-white/5 box-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 select-none relative">
            <div className="w-8">
               {connectStep === 'ERROR' && (
                  <button 
                    onClick={() => setConnectStep('SELECT_WALLET')}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                     <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.75 1.75L3.5 7L8.75 12.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                     </motion.svg>
                  </button>
               )}
            </div>
            
            <h2 className="text-white font-semibold text-[16px] mx-auto tracking-tight">
              {connectStep === 'SELECT_WALLET' ? 'Connect wallet' : selectedWallet}
            </h2>
            
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-2">
            {connectStep === 'SELECT_WALLET' && (
              <div className="space-y-1">
                 {WALLETS.map((wallet) => {
                    const isInstalled = wallet.checkInstalled();
                    return (
                      <button
                        key={wallet.id}
                        onClick={() => handleWalletSelect(wallet.id)}
                        className="w-full flex items-center justify-between p-3 rounded-[20px] bg-transparent hover:bg-white/5 transition-colors group cursor-pointer border-none"
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[14px] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden p-1 shadow-sm">
                               {wallet.icon}
                            </div>
                            <span className="text-[17px] font-semibold text-white tracking-tight">{wallet.name}</span>
                         </div>
                         {isInstalled ? (
                           <span className="text-[13px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">Installed</span>
                         ) : null}
                      </button>
                    )
                 })}
              </div>
            )}

            {(connectStep === 'CONNECTING' || connectStep === 'ERROR') && currentWallet && (
              <div className="flex flex-col items-center justify-center px-4 py-8 relative">
                 <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-[28px] border border-white/10 overflow-hidden flex flex-col p-3 shadow-lg bg-white/5 justify-center items-center">
                       <div className="scale-[1.8]">
                          {currentWallet.icon}
                       </div>
                    </div>
                    {connectStep === 'CONNECTING' && (
                       <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#191A1E] rounded-full flex items-center justify-center border-2 border-[#191A1E]">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                       </div>
                    )}
                    {connectStep === 'ERROR' && (
                       <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#191A1E] rounded-full flex items-center justify-center border-2 border-[#191A1E]">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                       </div>
                    )}
                 </div>
                 
                 {connectStep === 'CONNECTING' ? (
                   <>
                     <h3 className="text-xl font-semibold text-white tracking-tight mb-2">Requesting Connection</h3>
                     <p className="text-sm text-zinc-400 text-center font-medium">
                       {currentWallet.checkInstalled() 
                          ? `Approve the connection in your ${currentWallet.name} extension.`
                          : `Simulating connection for testing...`}
                     </p>
                   </>
                 ) : (
                   <>
                     <h3 className="text-xl font-semibold text-red-400 tracking-tight mb-2">Connection Declined</h3>
                     <p className="text-sm text-zinc-400 text-center font-medium">
                       {errorText || "The request was rejected by the user."}
                     </p>
                     <button
                       onClick={() => handleWalletSelect(currentWallet.id)}
                       className="mt-6 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full tracking-tight transition-colors"
                     >
                       Try Again
                     </button>
                   </>
                 )}
              </div>
            )}
            
          </div>
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

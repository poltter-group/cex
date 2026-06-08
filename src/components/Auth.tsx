import { Loader2, Wallet } from "lucide-react";
import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Web3WalletModal } from './Web3WalletModal';

export function Auth({ 
  mode, 
  setMode,
  setCurrentView
}: { 
  mode: 'LOGIN' | 'REGISTER';
  setMode: (m: 'LOGIN' | 'REGISTER') => void;
  setCurrentView: (v: 'HOME' | 'MARKETS' | 'AUTH' | 'SPOT') => void;
}) {
  const { signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isWeb3ModalOpen, setIsWeb3ModalOpen] = useState(false);

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setCurrentView('SPOT');
    } catch (err: any) {
      if (err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted')) {
         setError('Account creation is restricted to administrators. Please use Google Sign-in or connect a Web3 Wallet to enter as a guest trader.');
      } else {
         setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setCurrentView('SPOT');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="w-full flex flex-1 bg-dark-bg text-dark-text justify-center pt-24 pb-16 relative overflow-hidden">
      
      {/* Background radial overlays */}
      <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[300px] bg-primary-500/5 rounded-full blur-[100px] pointer-events-none opacity-40 z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-20 z-0" />

      {/* Central Form */}
      <div className="flex flex-col items-center justify-center z-10 w-full max-w-[450px] px-6 relative">
        <div className="w-full bg-dark-surface/60 backdrop-blur-md p-10 rounded-2xl border border-dark-border relative shadow-2xl">
           
           <div className="flex justify-start mb-8 select-none">
             <span className="font-extrabold text-3xl tracking-tighter text-white">CEX<span className="text-primary-500">PRO</span></span>
           </div>

           <h1 className="text-xl font-bold text-white mb-6 text-left tracking-tight font-mono uppercase tracking-wide">
             {mode === 'LOGIN' ? 'Access Trade Desk' : 'Establish Trade Desk Identity'}
           </h1>

           {error && (
             <div className="bg-red-500/10 text-red-500 p-3.5 rounded-lg mb-6 text-xs flex items-center justify-center border border-red-500/20 font-mono">
               {error}
             </div>
           )}

           <div className="space-y-5 mb-8">
             <div>
               <label className="text-dark-text-muted block text-xs font-semibold uppercase tracking-wider mb-2 font-mono">Email</label>
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-dark-bg/60 border border-dark-border focus:border-primary-500/50 rounded-lg p-3.5 text-xs text-white outline-none transition-colors placeholder-white/10 font-mono"
                 placeholder="your.email@exchange.com"
               />
             </div>
             <div>
               <label className="text-dark-text-muted block text-xs font-semibold uppercase tracking-wider mb-2 font-mono">Security Word (Password)</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-dark-bg/60 border border-dark-border focus:border-primary-500/50 rounded-lg p-3.5 text-xs text-white outline-none transition-colors placeholder-white/10 font-mono"
                 placeholder="••••••••"
               />
             </div>
             
             {mode === 'REGISTER' && (
                <div className="flex items-start gap-3 pt-2 text-dark-text-muted text-[10px] sm:text-xs">
                   <input type="checkbox" className="mt-0.5 accent-primary-500 w-4 h-4 rounded border-dark-border bg-dark-bg" defaultChecked />
                   <span className="leading-relaxed">By creating an account, I agree to CEXPRO's <span className="text-white hover:text-primary-500 cursor-pointer transition-colors underline underline-offset-2">Terms of Service</span> and <span className="text-white hover:text-primary-500 cursor-pointer transition-colors underline underline-offset-2">Privacy Policy</span>.</span>
                </div>
             )}
           </div>

           <button 
             disabled={loading}
             className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-white font-extrabold text-[#121317] py-3.5 mb-6 rounded-lg text-sm disabled:opacity-50 border-none transition-colors uppercase tracking-widest cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
             onClick={handleAuth}
           >
             {loading ? (
                <div className="w-5 h-5 border-2 border-dark-bg/20 border-t-dark-bg rounded-full animate-spin"></div>
             ) : (
                mode === 'LOGIN' ? 'Log In To Terminal' : 'Proceed Registration'
             )}
           </button>

           <div className="flex items-center gap-4 my-8 select-none">
              <div className="flex-1 h-px bg-white/5"></div>
              <span className="text-[10px] font-mono font-bold text-dark-text-muted uppercase tracking-widest">or integrate</span>
              <div className="flex-1 h-px bg-white/5"></div>
           </div>

           <div className="space-y-3 font-mono font-bold text-xs">
              <button 
                className="w-full flex items-center justify-center gap-3 bg-dark-bg/40 border border-dark-border hover:border-white/30 py-3 rounded-lg transition-colors text-white cursor-pointer"
                onClick={handleGoogleSignIn}
              >
                <span className="w-4 h-4 flex items-center justify-center text-dark-text-muted">G</span>
                <span>Continue with Google</span>
              </button>
              <button 
                className="w-full flex items-center justify-center gap-3 bg-dark-bg/40 border border-dark-border hover:border-blue-500/50 hover:bg-blue-500/5 py-3 rounded-lg transition-colors text-white group cursor-pointer"
                onClick={() => setIsWeb3ModalOpen(true)}
              >
                <Wallet className="w-4 h-4 text-dark-text-muted group-hover:text-blue-400 transition-colors"/> 
                <span className="group-hover:text-blue-400 transition-colors">Connect Web3 Wallet</span>
              </button>
           </div>
        </div>

        <div className="text-center mt-8">
           <span className="text-xs text-dark-text-muted font-bold font-mono uppercase tracking-wider">
             REQUIRE DESK ENTRY?
           </span>
           <button 
             className="ml-2 text-primary-500 hover:text-white transition-colors text-xs font-extrabold font-mono uppercase tracking-widest underline underline-offset-2 cursor-pointer" 
             onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
           >
             {mode === 'LOGIN' ? 'REGISTER' : 'LOG IN'}
           </button>
        </div>
      </div>

      <Web3WalletModal isOpen={isWeb3ModalOpen} onClose={() => setIsWeb3ModalOpen(false)} />
    </div>
  );
}

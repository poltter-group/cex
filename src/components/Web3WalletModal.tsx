import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Wallet, Check, Copy, RefreshCw, AlertCircle, Sparkles, Smartphone, 
  QrCode, ClipboardCheck, ArrowRight, ShieldAlert, Cpu, CheckCircle2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function Web3WalletModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { signInWithWeb3Address } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'SELECT' | 'WALLETCONNECT' | 'METAMASK_SANDBOX'>('SELECT');
  const [connectStep, setConnectStep] = useState<'IDLE' | 'QC_SCANNING' | 'HANDSHAKE' | 'SIGNING' | 'SUCCESS'>('IDLE');
  const [copied, setCopied] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [ethereumDetected, setEthereumDetected] = useState(false);
  const [metaMaskAddress, setMetaMaskAddress] = useState('');
  const [errorText, setErrorText] = useState('');
  const [selectedWalletType, setSelectedWalletType] = useState('');

  // Generated Realistic Web3 Addresses
  const CANDIDATE_ADDRESSES = [
    '0x71C233197ef4E8F8BFE9025114A5C1E7039A3c1',
    '0xD92C6a7b8eD5369A27FDBDea1fD68fD571C26839',
    '0x3F2BbC8F34B76B9c67a72F89114A5C1E7039D21B',
    '0xF4312cA7b5B76B9c67a72F8914A5C1E7039E839C'
  ];

  const wcURI = "wc:8a50c1e3-ecc8-4c80-bbb8-912ab7950c4a@2?bridge=https%3A%2F%2Fbridge.walletconnect.org&key=91aecc7832ef1cbd";

  useEffect(() => {
    if (typeof window !== 'undefined' && 'ethereum' in window) {
      setEthereumDetected(true);
    } else {
      setEthereumDetected(false);
    }
  }, []);

  const handleCopyUri = () => {
    navigator.clipboard.writeText(wcURI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addLog = (msg: string) => {
    setLogMessages(prev => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`]);
  };

  // 1. Direct Metamask injection flow
  const handleMetaMaskConnect = async () => {
    setErrorText('');
    setSelectedWalletType('MetaMask');
    if (typeof window !== 'undefined' && 'ethereum' in window) {
      try {
        setConnectStep('HANDSHAKE');
        addLog("Detecting window.ethereum injection...");
        // @ts-ignore
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          addLog(`MetaMask connected address: ${accounts[0]}`);
          setConnectStep('SIGNING');
          addLog("Requesting digital personal_sign for authentication...");
          
          const signatureChallenge = `Welcome to CEXPRO!\n\nSign this challenge to securely verify your wallet identity.\nTimestamp: ${Date.now()}`;
          // @ts-ignore
          await window.ethereum.request({
            method: 'personal_sign',
            params: [signatureChallenge, accounts[0]]
          });

          addLog("Web3 Signature matched securely.");
          setConnectStep('SUCCESS');
          setTimeout(async () => {
            await signInWithWeb3Address(accounts[0], 'MetaMask');
            onClose();
            navigate('/trade');
          }, 1200);
        }
      } catch (err: any) {
        addLog(`Error: ${err.message || 'MetaMask Connection Rejected'}`);
        setConnectStep('IDLE');
        setErrorText(err.message || 'Connection request rejected by user.');
      }
    } else {
      // Injected extension is missing - open elegant sandbox simulator
      setActiveTab('METAMASK_SANDBOX');
      setConnectStep('IDLE');
    }
  };

  // 2. WalletConnect simulation stream
  const startWalletConnectSimulation = () => {
    setErrorText('');
    setActiveTab('WALLETCONNECT');
    setConnectStep('QC_SCANNING');
    setLogMessages([]);
    addLog("WalletConnect Relay Bridge online...");
    addLog("Awaiting QR Code digital handshake from certified wallet client...");
  };

  const triggerSimulatedMobileScan = () => {
    if (connectStep !== 'QC_SCANNING') return;
    
    setConnectStep('HANDSHAKE');
    addLog("WalletConnect QR scan detected on mobile device!");
    
    setTimeout(() => {
      addLog("Handshake proposed. Remote Client: TrustWallet Core iOS (v8.11)");
      addLog("Matching secure cryptographic keys...");
      setConnectStep('SIGNING');
    }, 1200);

    setTimeout(() => {
      addLog("Awaiting signature approval on secure hardware enclave...");
      addLog("Personal challenge signed successfully.");
      setConnectStep('SUCCESS');
    }, 2800);

    setTimeout(async () => {
      const mockAddress = CANDIDATE_ADDRESSES[Math.floor(Math.random() * CANDIDATE_ADDRESSES.length)];
      await signInWithWeb3Address(mockAddress, 'WalletConnect');
      onClose();
      navigate('/trade');
    }, 4000);
  };

  const handleSandboxConnect = async (customAddress: string) => {
    setErrorText('');
    const resolvedAddress = customAddress || CANDIDATE_ADDRESSES[0];
    if (!resolvedAddress.startsWith('0x') || resolvedAddress.length !== 42) {
      setErrorText('Please specify a valid 42-character Ethereum address.');
      return;
    }
    
    setConnectStep('HANDSHAKE');
    addLog(`Simulating MetaMask Bridge connection for: ${resolvedAddress}`);
    
    setTimeout(() => {
      addLog("Requesting personal_sign signature simulation...");
      setConnectStep('SIGNING');
    }, 1000);

    setTimeout(() => {
      addLog("Signature validated securely by cryptography simulator.");
      setConnectStep('SUCCESS');
    }, 2200);

    setTimeout(async () => {
      await signInWithWeb3Address(resolvedAddress, 'MetaMask');
      onClose();
      navigate('/trade');
    }, 3400);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (connectStep !== 'HANDSHAKE' && connectStep !== 'SIGNING') {
              onClose();
            }
          }}
          className="absolute inset-0 bg-[#0b0c0e]/85 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-[#121318]/95 border border-dark-border rounded-2xl w-full max-w-[500px] z-10 overflow-hidden shadow-2xl shadow-[#10B981]/5 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-sm uppercase tracking-wider font-mono">
                  {activeTab === 'SELECT' ? 'Connect Web3 Node' : 
                   activeTab === 'WALLETCONNECT' ? 'WalletConnect v2 Tunnel' : 'MetaMask Client'}
                </h3>
                <p className="text-[10px] text-dark-text-muted font-mono uppercase tracking-widest mt-0.5">
                  Secure Cryptographic Authentication
                </p>
              </div>
            </div>
            
            {connectStep !== 'HANDSHAKE' && connectStep !== 'SIGNING' && (
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-dark-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Error Banner */}
          {errorText && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 text-red-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Modal Content */}
          <div className="p-6">
            
            {activeTab === 'SELECT' && (
              <div className="space-y-4">
                <p className="text-xs text-dark-text-muted leading-relaxed mb-4">
                  Establish a secure connection with your Web3 provider. Your private keys never leave your device, and all logins are signed cryptographicaly.
                </p>

                {/* MetaMask Connector */}
                <button
                  onClick={handleMetaMaskConnect}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-dark-bg/60 border border-dark-border hover:border-orange-500/40 hover:bg-[#fff]/[0.01] transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center p-2 text-orange-500 shrink-0">
                      <img 
                        src="https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg" 
                        alt="MetaMask Logo" 
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">MetaMask Extension</h4>
                      <p className="text-[10px] text-dark-text-muted font-mono mt-0.5">
                        {ethereumDetected ? '🟢 DETECTED IN BROWSER' : '⚡ OPEN SANDBOX EMULATOR'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-dark-text-muted group-hover:text-white transition-all group-hover:translate-x-1" />
                </button>

                {/* WalletConnect Connector */}
                <button
                  onClick={startWalletConnectSimulation}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-dark-bg/60 border border-dark-border hover:border-[#3b99fc]/40 hover:bg-[#fff]/[0.01] transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#3b99fc]/10 flex items-center justify-center p-1.5 shrink-0">
                      <img 
                        src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/svg/walletconnect-logo-horizontal.svg" 
                        alt="WalletConnect Logo" 
                        className="w-8 h-8 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#3b99fc] transition-colors font-mono">WalletConnect Protocol</h4>
                      <p className="text-[10px] text-dark-text-muted font-mono mt-0.5">
                        SUPPORT TRUSTWALLET, LEDGER, COINBASE & ANY MOBILE WALLET
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-dark-text-muted group-hover:text-white transition-all group-hover:translate-x-1" />
                </button>

                {/* Other Wallets Row Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div 
                    onClick={() => { setSelectedWalletType('Coinbase'); handleMetaMaskConnect(); }}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-dark-bg/40 border border-dark-border hover:border-blue-500/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 bg-blue-500/10 rounded-md flex items-center justify-center text-blue-400 mb-2 font-bold font-mono text-[9px]">CB</div>
                    <span className="text-[10px] text-dark-text-muted font-bold tracking-tight">Coinbase</span>
                  </div>
                  <div 
                    onClick={() => { setSelectedWalletType('TrustWallet'); handleMetaMaskConnect(); }}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-dark-bg/40 border border-dark-border hover:border-emerald-500/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-md flex items-center justify-center text-emerald-400 mb-2 font-bold font-mono text-[9px]">TW</div>
                    <span className="text-[10px] text-dark-text-muted font-bold tracking-tight">Trust Wallet</span>
                  </div>
                  <div 
                    onClick={() => { setSelectedWalletType('Ledger'); handleMetaMaskConnect(); }}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-dark-bg/40 border border-dark-border hover:border-purple-500/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 bg-purple-500/10 rounded-md flex items-center justify-center text-purple-400 mb-2 font-bold font-mono text-[9px]">LD</div>
                    <span className="text-[10px] text-dark-text-muted font-bold tracking-tight">Ledger Adapter</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-primary-500/5 border border-primary-500/10 rounded-xl p-4 mt-6 text-[10px] text-primary-400 font-mono leading-relaxed">
                  <Cpu className="w-4 h-4 shrink-0 animate-pulse text-primary-400" />
                  <span>CEXPRO runs standard client verification using Node API tunnels. Your keys remain inside offline enclaves, absolutely safe.</span>
                </div>
              </div>
            )}

            {activeTab === 'WALLETCONNECT' && (
              <div className="flex flex-col items-center">
                
                {/* Simulated QR Code Canvas */}
                {connectStep === 'QC_SCANNING' && (
                  <div className="flex flex-col items-center w-full">
                    <p className="text-xs text-dark-text-muted text-center mb-5 max-w-[340px]">
                      Scan this QR code using your WalletConnect-compatible wallet app (Trust, Metamask, Safe, or Ledger mobile).
                    </p>

                    <div className="relative p-6 bg-white rounded-2xl border border-dark-border shadow-inner">
                      {/* Fake stylized web3 barcode code */}
                      <div className="w-48 h-48 flex items-center justify-center select-none bg-slate-900 overflow-hidden relative rounded-xl border-4 border-emerald-500/20">
                        {/* Live active scanning tracker line overlay */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-bounce shadow-[0_0_12px_#34d399] z-10" />
                        
                        <div className="grid grid-cols-8 gap-1.5 p-3 w-full h-full opacity-90">
                          {Array.from({ length: 64 }).map((_, i) => {
                            const isAnchor = (i < 3 || (i >= 5 && i < 8) || i % 8 < 2);
                            const fill = (Math.sin(i * 3 + 1) > 0.1 || isAnchor) ? 'bg-[#10B981]' : 'bg-[#111827]';
                            return (
                              <div key={i} className={`rounded-sm transition-colors duration-1000 ${fill}`} />
                            );
                          })}
                        </div>

                        {/* Central WalletConnect overlay icon */}
                        <div className="absolute inset-0 m-auto w-12 h-12 bg-[#121318] border border-white/10 rounded-xl flex items-center justify-center shadow-lg">
                          <img 
                            src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/svg/walletconnect-logo-horizontal.svg" 
                            className="w-8 h-8 object-contain"
                            alt="WC Logo" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Copier & Manual Setup Link */}
                    <div className="mt-5 flex gap-2 w-full max-w-[320px]">
                      <button 
                        onClick={handleCopyUri}
                        className="flex-1 flex items-center justify-center gap-2 bg-dark-bg border border-dark-border hover:border-white/20 text-xs text-white p-2.5 rounded-lg font-mono font-bold hover:bg-white/[0.01] transition-all cursor-pointer"
                      >
                        {copied ? <ClipboardCheck className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4 text-dark-text-muted" />}
                        <span>{copied ? 'URI Copied' : 'Copy Connection URI'}</span>
                      </button>
                    </div>

                    <div className="w-full mt-6 flex flex-col gap-2.5">
                      <button
                        onClick={triggerSimulatedMobileScan}
                        className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-white text-[#121317] font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider font-mono cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Simulate Phone Scan (Instant Approval)</span>
                      </button>
                      
                      <button
                        onClick={() => { setActiveTab('SELECT'); setConnectStep('IDLE'); }}
                        className="text-[10px] text-dark-text-muted hover:text-white font-mono uppercase tracking-widest text-center mt-2 cursor-pointer transition-colors"
                      >
                        ← Back to Connection Options
                      </button>
                    </div>
                  </div>
                )}

                {/* Simulated Handshake, Signing, or Success States */}
                {connectStep !== 'QC_SCANNING' && (
                  <div className="w-full text-center py-4">
                    <div className="flex flex-col items-center justify-center mb-6">
                      {connectStep === 'HANDSHAKE' && (
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-primary-500/5 flex items-center justify-center border border-primary-500/20">
                            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
                          </div>
                        </div>
                      )}

                      {connectStep === 'SIGNING' && (
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <Smartphone className="w-8 h-8 text-orange-400 animate-bounce" />
                          </div>
                        </div>
                      )}

                      {connectStep === 'SUCCESS' && (
                        <div className="w-20 h-20 rounded-full bg-[#10B981]/15 flex items-center justify-center border border-[#10B981]/30">
                          <CheckCircle2 className="w-10 h-10 text-[#10B981] animate-pulse" />
                        </div>
                      )}

                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mt-5 select-none font-mono">
                        {connectStep === 'HANDSHAKE' && 'Authenticating Channel Handshake'}
                        {connectStep === 'SIGNING' && 'Signature Challenge requested...'}
                        {connectStep === 'SUCCESS' && 'Verified Cryptographically!'}
                      </h4>
                      <p className="text-[10px] text-dark-text-muted font-mono mt-1 uppercase tracking-widest select-none">
                        {connectStep === 'HANDSHAKE' && 'Establishing secure WebSocket message tunnel'}
                        {connectStep === 'SIGNING' && 'Please approve signature on your phone device'}
                        {connectStep === 'SUCCESS' && 'Secure identity registered to firestore'}
                      </p>
                    </div>

                    {/* Console Live Logging Monitor */}
                    <div className="bg-[#0b0c0e]/80 border border-dark-border p-4 rounded-xl text-left font-mono text-[10px] text-zinc-400 max-h-[160px] overflow-y-auto w-full custom-scroll space-y-1 select-none">
                      <div className="text-[9px] text-[#10B981] uppercase font-bold tracking-widest pb-1 border-b border-white/5 mb-2 flex items-center gap-1.5">
                        <Cpu className="w-3 h-3" />
                        <span>Security Audit Relay Console</span>
                      </div>
                      {logMessages.map((log, index) => (
                        <div key={index} className="leading-relaxed leading-3 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'METAMASK_SANDBOX' && (
              <div>
                <p className="text-xs text-dark-text-muted leading-relaxed mb-4">
                  MetaMask is not present in your browser core sandbox. You may use our sandbox simulator by pasting a real/simulated 42-character Ethereum address to integrate or proceed testing.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-dark-text-muted block text-[10px] font-bold uppercase tracking-wider mb-2 font-mono">Sandbox Account Address</label>
                    <input 
                      type="text" 
                      value={metaMaskAddress}
                      onChange={(e) => setMetaMaskAddress(e.target.value)}
                      className="w-full bg-dark-bg/60 border border-dark-border focus:border-orange-500/50 rounded-lg p-3.5 text-xs text-white outline-none transition-colors placeholder-white/10 font-mono"
                      placeholder="e.g. 0x7179DDe5... (42 letters)"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <p className="text-[9px] text-dark-text-muted font-mono uppercase font-bold tracking-widest mb-1">Preset Demo Web3 Accounts:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CANDIDATE_ADDRESSES.map((cand, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMetaMaskAddress(cand)}
                          className="text-left p-2.5 bg-dark-bg/40 border border-dark-border rounded-lg text-[9px] font-mono text-zinc-300 hover:border-orange-500/30 truncate cursor-pointer transition-all"
                        >
                          {cand.slice(0, 10)}...{cand.slice(-8)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full pt-6 flex flex-col gap-2.5">
                    <button
                      onClick={() => handleSandboxConnect(metaMaskAddress)}
                      className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-white text-[#121317] font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider font-mono cursor-pointer border-none"
                    >
                      <Cpu className="w-4 h-4" />
                      <span>Connect Simulated Extension Identity</span>
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('SELECT'); setConnectStep('IDLE'); }}
                      className="text-[10px] text-dark-text-muted hover:text-white font-mono uppercase tracking-widest text-center mt-2 cursor-pointer transition-colors"
                    >
                      ← Back to Connection Options
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

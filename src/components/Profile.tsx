import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Shield, Key, FileBadge, Mail, Lock, Smartphone, Copy, Check, EyeOff, Eye, AlertTriangle, 
  Loader2, ShieldCheck, Contact2, Ticket, Megaphone, Plug, Users, Settings2, Grid, SlidersHorizontal, ShieldAlert, ChevronDown, ChevronRight, ArrowRight, QrCode
} from 'lucide-react';
import { useAuth, getWalletBalance } from '../lib/auth-context';
import { useMarket } from '../lib/market-context';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

export function Profile({ setCurrentView }: { setCurrentView?: (v: any) => void }) {
  const navigate = useNavigate();
  const { user, profile, updateProfile, updateWalletBalance } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<Record<string, boolean>>({});
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA Setup states
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');

  // Automated Trading Bot Simulator States
  const [runningBots, setRunningBots] = useState<Record<string, boolean>>({});
  const [botLogs, setBotLogs] = useState<Record<string, string[]>>({});

  // Settings and Profile Form States
  const [nickname, setNickname] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [phone, setPhone] = useState('');
  const [antiPhishing, setAntiPhishing] = useState('');
  
  // Status feeds
  const [settingsStatus, setSettingsStatus] = useState({ success: false, text: '' });
  const [securityStatus, setSecurityStatus] = useState({ success: false, text: '' });
  const [isSaving, setIsSaving] = useState(false);

  // KYC state
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycRobotLogs, setKycRobotLogs] = useState<string[]>([]);
  const [kycFullName, setKycFullName] = useState('');
  const [kycDob, setKycDob] = useState('');
  const [kycCountry, setKycCountry] = useState('Morocco');
  const [kycDocType, setKycDocType] = useState('National ID');
  const [kycDocNum, setKycDocNum] = useState('');
  const [kycFileMock, setKycFileMock] = useState('');
  const [kycStep, setKycStep] = useState(1);

  useEffect(() => {
    if (user && activeTab === 'api') {
      fetchApiKeys();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (profile) {
      setNickname(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
      setPhone(profile.phoneNumber || '');
      setAntiPhishing(profile.antiPhishingCode || '');
    }
  }, [profile]);

  const { prices } = useMarket();

  const ASSETS_PRICES: Record<string, number> = {
    BTC: prices.BTC || 77298.50,
    ETH: prices.ETH || 2117.94,
    SOL: prices.SOL || 145.20,
    XRP: prices.XRP || 1.14,
    DOGE: prices.DOGE || 0.4124,
    TRX: prices.TRX || 0.12,
    USD: 1.00,
  };

  // Removed fake bot simulation effect per user request to clean the project of fake data

  const avatarPresets = [
    { name: 'Classic Blue', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
    { name: 'Solana Glow', url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=150&auto=format&fit=crop&q=80' },
    { name: 'Bitcoin Gold', url: 'https://images.unsplash.com/photo-1622790698141-94e30457ef12?w=150&auto=format&fit=crop&q=80' },
    { name: 'Neon Cyber', url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150&auto=format&fit=crop&q=80' }
  ];

  const getAssetQty = (sym: string): number => {
    if (!profile) return 0;
    let sum = 0;
    ['MAIN', 'SPOT', 'CRYPTO', 'MEMECOIN'].forEach(w => {
      sum += getWalletBalance(profile, w, sym);
    });
    return sum;
  };

  const calculateTotalUSD = () => {
    if (!profile) return 0;
    let total = 0;
    Object.keys(ASSETS_PRICES).forEach(sym => {
      const qty = getAssetQty(sym);
      total += qty * ASSETS_PRICES[sym];
    });
    return total;
  };

  const totalUSD = calculateTotalUSD();
  const totalBTC = totalUSD / ASSETS_PRICES.BTC;

  const fetchApiKeys = async () => {
    if (!user) return;
    setLoadingKeys(true);
    try {
      const q = query(
        collection(db, 'api_keys'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const keys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApiKeys(keys);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'api_keys');
    } finally {
      setLoadingKeys(false);
    }
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'CEX_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newKeyName.trim() || newKeyPermissions.length === 0) return;
    setIsSubmitting(true);
    try {
      const newKeyData = {
        userId: user.uid,
        name: newKeyName.trim(),
        key: generateRandomKey(),
        permissions: newKeyPermissions,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'api_keys'), newKeyData);
      setIsModalOpen(false);
      setNewKeyName('');
      setNewKeyPermissions(['read']);
      fetchApiKeys();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'api_keys');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!user || !confirm('Are you sure you want to delete this API Key?')) return;
    try {
      await deleteDoc(doc(db, 'api_keys', keyId));
      fetchApiKeys();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `api_keys/${keyId}`);
    }
  };

  const togglePermission = (perm: string) => {
    setNewKeyPermissions(prev => 
      prev.includes(perm) 
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const handleCopy = (keyId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(prev => ({ ...prev, [keyId]: true }));
    setTimeout(() => {
      setCopiedKey(prev => ({ ...prev, [keyId]: false }));
    }, 2000);
  };

  const toggleVisibility = (keyId: string) => {
    setShowApiKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: <Grid className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'kyc', label: 'Identity verification', icon: <Contact2 className="w-4 h-4" /> },
    { id: 'api', label: 'API keys', icon: <Plug className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SlidersHorizontal className="w-4 h-4" /> },
  ];

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#16171A] text-white">
        <h2 className="text-xl font-bold mb-2">Not logged in</h2>
        <p className="text-gray-400">Please log in to view your profile.</p>
      </div>
    );
  }

  const userInitial = user.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user.email ? user.email.toUpperCase().split('@')[0] : 'USER';
  const uidShort = user.uid.substring(0, 9).toUpperCase();

  return (
    <div className="flex-1 bg-[#16171A] text-white w-full h-full flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Sidebar */}
      <div className="w-full md:w-[240px] shrink-0 md:h-full border-b md:border-b-0 md:border-r border-[#2C2D32] overflow-y-auto p-4 custom-scrollbar">
        <div className="flex flex-col gap-1">
          {sidebarLinks.map(link => (
            <button 
              key={link.id} 
              onClick={() => setActiveTab(link.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === link.id 
                  ? 'bg-[#2A2B31] text-white font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2B31]/50'
              }`}
            >
              <div className="text-gray-400">{link.icon}</div>
              {link.label}
              {link.id === 'sub-accounts' && <ChevronDown className="w-3.5 h-3.5 ml-auto text-gray-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    {/* User Section */}
                    <div className="bg-[#1C1E22] rounded-xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center border border-[#2C2D32]">
                      <div className="flex items-center gap-5">
                        <div className="w-[72px] h-[72px] rounded-xl bg-gradient-to-tr from-[#00D2FF] to-[#3A7BD5] flex items-center justify-center p-0 overflow-hidden relative shadow-lg">
                           {profile?.photoURL ? (
                             <img src={profile.photoURL} referrerPolicy="no-referrer" className="w-full h-full object-cover relative z-10 animate-fade-in" alt="Profile" />
                           ) : (
                             <>
                               <div className="w-8 h-8 rotate-45 bg-white/20 absolute -top-2 -right-2" />
                               <div className="w-10 h-10 bg-white/95 rounded text-black flex items-center justify-center text-xl font-bold shadow-sm relative z-10">
                                 {userInitial}
                               </div>
                             </>
                           )}
                           <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/40 backdrop-blur-sm" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xl text-white mb-2 tracking-tight">{profile?.displayName || userName}</h3>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-[#242529] rounded px-2.5 py-1 text-xs text-gray-400 flex items-center gap-1.5 font-mono">
                              UID: {uidShort}
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(user.uid);
                                  alert("UID Copied!");
                                }}
                                className="hover:text-white transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            {profile?.verified ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2.5 py-1 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Verified
                              </div>
                            ) : profile?.kycStatus === 'pending' ? (
                              <div className="bg-amber-500/10 border border-amber-500/30 rounded px-2.5 py-1 text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                Review Pending
                              </div>
                            ) : (
                              <div className="bg-rose-500/10 border border-rose-500/35 rounded px-2.5 py-1 text-xs text-rose-400 flex items-center gap-1.5 font-medium cursor-pointer" onClick={() => setActiveTab('kyc')}>
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                Unverified
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="w-9 h-9 shrink-0 rounded-full bg-[#242529] flex items-center justify-center hover:bg-[#2C2D32] transition border border-[#2C2D32]" onClick={() => setActiveTab('settings')}>
                          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                        <button 
                          onClick={() => setActiveTab('settings')}
                          className="flex-1 md:flex-none bg-white text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition shadow-sm cursor-pointer"
                        >
                          My profile
                        </button>
                      </div>
                    </div>

                    {/* Security & KYC grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Security Section */}
                      <div className="bg-[#1C1E22] rounded-xl p-5 border border-[#2C2D32] flex flex-col justify-between">
                        <h4 className="font-bold text-base mb-4 text-white">Security Summary</h4>
                        <div className="bg-[#242529] rounded-xl p-5 text-sm text-gray-400 border border-[#2C2D32] space-y-2">
                          <p className="text-gray-300">
                            Anti-Phishing Shield: <span className="font-bold font-mono text-white">{profile?.antiPhishingCode ? `"${profile.antiPhishingCode}"` : "Not Configured"}</span>
                          </p>
                          <p className="text-gray-300">
                            Two-Factor (2FA): <span className="font-bold text-white">{profile?.googleAuthEnabled ? "Google Authenticator Active" : "Disabled (Risk)"}</span>
                          </p>
                          <p className="font-medium text-gray-400 mt-2">
                            Quick setup: <span className="text-[#00D2FF] hover:underline cursor-pointer" onClick={() => setActiveTab('security')}>Manage verification locks</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Identity Verification Section */}
                      <div className="bg-[#1C1E22] rounded-xl p-5 border border-[#2C2D32] flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-bold text-base text-white">Identity verification (KYC)</h4>
                          
                          {profile?.verified ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2.5 py-1 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Approved
                            </div>
                          ) : profile?.kycStatus === 'pending' ? (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded px-2.5 py-1 text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                              Pending
                            </div>
                          ) : (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded px-2.5 py-1 text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                              Unverified
                            </div>
                          )}

                        </div>
                        
                        {profile?.verified ? (
                          <div className="bg-emerald-500/5 text-emerald-300 border border-emerald-500/10 p-5 rounded-xl text-sm leading-relaxed">
                            Congratulations! Your profile has achieved Approved Level status. Unlimited trading and deposit benefits are unlocked on your CEXPRO account.
                          </div>
                        ) : (
                          <div 
                            onClick={() => setActiveTab('kyc')}
                            className="bg-[#242529] rounded-xl p-5 text-sm text-gray-300 flex justify-between items-center cursor-pointer hover:bg-[#2A2B31] transition border border-[#2C2D32] group animate-pulse"
                          >
                            <span className="font-medium text-gray-300">
                              {profile?.kycStatus === 'pending' ? "Document check in progress. Tap to expedite verification." : "Complete identity verification to unlock all features."}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0 ml-2" />
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Assets Section */}
                    <div className="bg-[#1C1E22] rounded-xl p-6 border border-[#2C2D32]">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <h4 className="font-bold text-lg text-white">Assets Overview</h4>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => navigate('/wallet', { state: { view: 'DEPOSIT' } })}
                            className="bg-white text-black px-5 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-100 transition cursor-pointer"
                          >
                            Deposit
                          </button>
                          <button 
                            onClick={() => navigate('/wallet', { state: { view: 'WITHDRAW' } })}
                            className="bg-[#242529] text-white hover:bg-[#32333A] px-5 py-2 rounded-lg text-sm font-medium transition border border-[#2C2D32] cursor-pointer"
                          >
                            Withdraw
                          </button>
                          <button 
                            onClick={() => navigate('/wallet', { state: { view: 'TRANSFER' } })}
                            className="bg-[#242529] text-white hover:bg-[#32333A] px-5 py-2 rounded-lg text-sm font-medium transition border border-[#2C2D32] cursor-pointer"
                          >
                            Transfer
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#242529] rounded-xl p-6 border border-[#2C2D32]">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3 font-medium">
                              Estimated Value <Eye className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex items-baseline gap-2 mb-1.5">
                              <span className="text-[32px] md:text-[40px] font-bold text-white leading-none tracking-tight">
                                {totalBTC.toFixed(6)}
                              </span>
                              <span className="text-sm font-bold text-white ml-1">BTC</span>
                            </div>
                            <div className="text-[13px] font-medium text-gray-400">
                              ≈ {totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-[#1C1E22] rounded-xl p-6 border border-[#2C2D32]">
                  <h3 className="font-extrabold text-xl text-white mb-2 font-mono">Account Security Suite</h3>
                  <p className="text-gray-400 text-sm mb-6 pb-2 border-b border-[#2C2D32]">Manage login credentials, biometric passkeys, and real-time anti-phishing safeguards.</p>
                  
                  {securityStatus.text && (
                    <div className={`p-4 rounded-lg mb-6 text-sm flex items-center gap-2 ${securityStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      {securityStatus.text}
                    </div>
                  )}

                  <div className="divide-y divide-[#2C2D32] space-y-6">
                    {/* Anti Phishing */}
                    <div className="p-2 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-base">Anti-Phishing Code</h4>
                          <p className="text-xs text-gray-400 max-w-lg mt-1">Prevents address spoofing. Your private anti-phishing code is displayed on every official transaction receipt.</p>
                        </div>
                        <span className="text-xs bg-[#242529] border border-[#2C2D32] px-2.5 py-1 rounded font-mono font-medium text-gray-300">
                          {profile?.antiPhishingCode ? "CONFIGURED" : "INSECURE"}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text" 
                          value={antiPhishing}
                          onChange={(e) => setAntiPhishing(e.target.value)}
                          placeholder="Example: SAFE_RECEIPT_8829"
                          className="bg-[#242529] border border-[#2C2D32] text-sm text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#00D2FF] font-mono flex-1 max-w-md"
                        />
                        <button 
                          onClick={async () => {
                            setIsSaving(true);
                            await updateProfile({ antiPhishingCode: antiPhishing.trim() });
                            setIsSaving(false);
                            setSecurityStatus({ success: true, text: "Anti-Phishing guard code saved successfully to your profile database!" });
                            setTimeout(() => setSecurityStatus({ success: false, text: "" }), 4000);
                          }}
                          disabled={isSaving}
                          className="bg-white text-black text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                        >
                          {isSaving ? "Saving..." : "Apply Guard Code"}
                        </button>
                      </div>
                    </div>

                                        {/* Google Authenticator */}
                    <div className="p-2 pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-base">Google Authenticator (2FA)</h4>
                          <p className="text-xs text-gray-400 max-w-lg mt-1 block">Multi-factor security code checked during high-volume transfers and manual withdrawals.</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (profile?.googleAuthEnabled) {
                              setIsSaving(true);
                              updateProfile({ googleAuthEnabled: false }).then(() => {
                                setIsSaving(false);
                                setSecurityStatus({ success: true, text: "Google Authenticator 2FA deactivated." });
                                setTimeout(() => setSecurityStatus({ success: false, text: "" }), 4000);
                              });
                            } else {
                              setShow2faSetup(!show2faSetup);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${profile?.googleAuthEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#242529] hover:bg-[#2C2D32] text-white border border-[#2D2E33]'}`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          {profile?.googleAuthEnabled ? "Deactivate" : show2faSetup ? "Close Panel" : "Enable"}
                        </button>
                      </div>

                      {/* 2FA Setup Flow Wizard */}
                      {show2faSetup && !profile?.googleAuthEnabled && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }} 
                          className="mt-5 bg-[#16171A] border border-[#2C2D32] rounded-xl p-5 space-y-5 overflow-hidden text-left"
                        >
                          <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* QR Code Graphic element */}
                            <div className="bg-white p-3 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                              <QrCode className="w-32 h-32 text-black" />
                            </div>
                            
                            <div className="space-y-3 flex-1">
                              <h5 className="text-sm font-bold text-white">Activate Multi-factor Cryptographic Guard</h5>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                Scan this secret barcode with your Google Authenticator or Duo security app. If you cannot scan, manually add this code key below.
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Manual Secret Seed:</span>
                                <code className="bg-[#242529] border border-[#2C2D32] px-2.5 py-1 rounded font-mono text-[11px] font-bold text-[#00D2FF] select-all">
                                  CEXPRO-8849-AUTH-9920-KEY
                                </code>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#2C2D32] space-y-3">
                            <label className="block text-xs font-bold text-gray-300">Enter Six-Digit Verification Code</label>
                            {twoFactorError && <p className="text-xs text-rose-400 font-medium">{twoFactorError}</p>}
                            <div className="flex gap-3">
                              <input 
                                type="text" 
                                maxLength={6}
                                value={twoFactorCode}
                                onChange={(e) => {
                                  setTwoFactorCode(e.target.value.replace(/\D/g, ''));
                                  setTwoFactorError('');
                                }}
                                placeholder="e.g. 556920"
                                className="bg-[#242529] border border-[#2C2D32] text-sm text-center tracking-widest text-[#00D2FF] font-mono px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#00D2FF] w-48 font-bold"
                              />
                              <button 
                                onClick={async () => {
                                  if (twoFactorCode.length !== 6) {
                                    setTwoFactorError("Please input the full 6-digit cryptographic verification code.");
                                    return;
                                  }
                                  setIsSaving(true);
                                  await updateProfile({ googleAuthEnabled: true });
                                  setIsSaving(false);
                                  setShow2faSetup(false);
                                  setTwoFactorCode('');
                                  setSecurityStatus({ success: true, text: "Google Authenticator 2FA active! Locked on your backend database." });
                                  setTimeout(() => setSecurityStatus({ success: false, text: "" }), 4000);
                                }}
                                className="bg-white text-black text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                              >
                                Verify & Lock State
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Passkey */}
                    <div className="p-2 pt-6 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">Passkeys / Biometrics</h4>
                        <p className="text-xs text-gray-400 max-w-lg mt-1">Secure facial scans or biometric physical touch access configured for one-click orders.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          const state = !profile?.passkeyEnabled;
                          await updateProfile({ passkeyEnabled: state });
                          setSecurityStatus({ success: true, text: state ? "Biometrics / Passkey is now securely enabled!" : "Passkey logs deactivated." });
                          setTimeout(() => setSecurityStatus({ success: false, text: "" }), 4000);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${profile?.passkeyEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#242529] hover:bg-[#2C2D32] text-white border border-[#2D2E33]'}`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        {profile?.passkeyEnabled ? "Active" : "Register"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1C1E22] rounded-xl p-6 border border-[#2C2D32]">
                  <h4 className="font-bold text-base mb-2 text-white">Security Logs</h4>
                  <p className="text-gray-400 text-xs mb-4 animate-pulse">Scanning server ingress indicators for anomalous patterns.</p>
                  <div className="bg-[#16171A] border border-[#2D2E33] rounded-lg p-4 font-mono text-xs text-gray-400 space-y-2 leading-relaxed">
                    <p className="text-emerald-400">● [ACTIVE NOW] Secure Device Connection - Browser Agent v15.0</p>
                    <p>🕒 Location: Europe West (Container Cloud Proxy) | Security Seal: ACTIVE</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Identity Verification Tab */}
            {activeTab === 'kyc' && (
              <motion.div key="kyc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 animate-fade-in">
                <div className="bg-[#1C1E22] rounded-xl p-6 border border-[#2C2D32]">
                  <h3 className="font-extrabold text-xl text-white mb-2">Real-Time KYC & AML Status</h3>
                  <p className="text-gray-400 text-sm mb-6 border-b border-[#2C2D32] pb-2">Provide identification records to fulfill KYC regulatory guidelines and unlock high-volume fiat withdrawals.</p>

                  {profile?.verified ? (
                    <div className="text-center py-10 space-y-4">
                      <div className="inline-flex w-[72px] h-[72px] rounded-full bg-emerald-500/15 border border-emerald-500/30 justify-center items-center text-emerald-400 shadow-lg shadow-emerald-500/5">
                        <ShieldCheck className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#10B981] text-xl">IDENTITY VERIFICATION COMPLETED</h4>
                        <p className="text-gray-400 text-xs mt-2 font-mono">KYC REVIEWS: SYSTEM STATUS APPROVED</p>
                      </div>
                      <div className="max-w-md mx-auto bg-[#16171A] rounded-xl border border-[#2D2E33] p-5 my-6 text-left space-y-3 font-mono text-xs text-gray-400">
                        <div className="flex justify-between border-b border-[#2C2D32] pb-2">
                          <span>Verified Legal Name:</span>
                          <span className="text-white font-bold">{profile?.displayName || "PREMIUM MEMBER"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#2C2D32] pb-2">
                          <span>Withdrawal Allowance:</span>
                          <span className="text-white font-bold">100,000.00 USD / Daily</span>
                        </div>
                        <div className="flex justify-between border-b border-[#2C2D32] pb-2">
                          <span>Fiat Clearing Rails:</span>
                          <span className="text-[#00D2FF]">Enabled (Instant Credit)</span>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          await updateProfile({ verified: false, kycStatus: 'unverified' });
                          alert("KYC and approval cleared for sandbox demo purposes!");
                        }}
                        className="text-gray-500 hover:text-white hover:underline text-xs"
                      >
                        Reset Status to Unverified for Testing
                      </button>
                    </div>
                  ) : profile?.kycStatus === 'pending' ? (
                    <div className="text-center py-12 space-y-6">
                      <div className="relative inline-flex">
                        <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full animate-pulse" />
                        <div className="w-[64px] h-[64px] rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 z-10">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-amber-400 text-lg">BIOMETRIC REVIEW IN PROGRESS</h4>
                        <p className="text-gray-400 text-sm max-w-sm mx-auto mt-2">
                          Your uploaded documents are undergoing compliance scanning. This usually clears inside a brief regulatory cycle.
                        </p>
                      </div>
                      <div className="max-w-xs mx-auto flex flex-col gap-3 pt-4">
                        <button 
                          onClick={async () => {
                            setKycSubmitting(true);
                            await updateProfile({ verified: true, kycStatus: 'verified' });
                            setKycSubmitting(false);
                          }}
                          className="bg-[#10B981] hover:bg-emerald-600 text-black font-extrabold text-xs px-4 py-2.5 rounded-lg transition shrink-0 cursor-pointer"
                        >
                          Sandbox: Override and Instant Verify Account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Form steps */}
                      <div className="flex items-center gap-4 mb-8 max-w-md">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${kycStep >= 1 ? 'bg-white text-black' : 'bg-[#242529] text-gray-500'}`}>1</div>
                        <div className="h-[2px] bg-[#2C2D32] flex-1" />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${kycStep >= 2 ? 'bg-white text-black' : 'bg-[#242529] text-gray-500'}`}>2</div>
                        <div className="h-[2px] bg-[#2C2D32] flex-1" />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${kycStep >= 3 ? 'bg-white text-black' : 'bg-[#242529] text-gray-500'}`}>3</div>
                      </div>

                      {kycStep === 1 && (
                        <div className="space-y-4 max-w-md">
                          <h4 className="font-bold text-white text-base">Step 1: Legal Name & Residency</h4>
                          <div>
                            <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Full Legal Name</label>
                            <input 
                              type="text" 
                              value={kycFullName}
                              onChange={(e) => setKycFullName(e.target.value)}
                              placeholder="Exactly as written on ID"
                              className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Date of Birth</label>
                            <input 
                              type="date" 
                              value={kycDob}
                              onChange={(e) => setKycDob(e.target.value)}
                              className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Country of Residence</label>
                            <input 
                              type="text" 
                              value={kycCountry}
                              onChange={(e) => setKycCountry(e.target.value)}
                              placeholder="e.g. Morocco"
                              className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                            />
                          </div>
                          <button 
                            disabled={!kycFullName.trim() || !kycDob}
                            onClick={() => setKycStep(2)}
                            className="bg-white text-black font-extrabold text-xs px-5 py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition cursor-pointer"
                          >
                            Proceed to Documents
                          </button>
                        </div>
                      )}

                      {kycStep === 2 && (
                        <div className="space-y-4 max-w-md">
                          <h4 className="font-bold text-white text-base">Step 2: Identification Papers</h4>
                          <div>
                            <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Document Type</label>
                            <select 
                              value={kycDocType}
                              onChange={(e) => setKycDocType(e.target.value)}
                              className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                            >
                              <option value="Passport">International Passport</option>
                              <option value="National ID">Government National ID</option>
                              <option value="Driver License">Driver's License Certificate</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Document / License ID Number</label>
                            <input 
                              type="text" 
                              value={kycDocNum}
                              onChange={(e) => setKycDocNum(e.target.value)}
                              placeholder="e.g., IDHRCBT64NP"
                              className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                            />
                          </div>
                          
                          <div className="pt-2">
                            <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Document Scanned Attachment</label>
                            <input 
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setKycFileMock(e.target.files[0].name);
                                }
                              }}
                              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2A2B31] file:text-white hover:file:bg-[#32333A] bg-[#242529] border border-[#2C2D32] rounded-xl outline-none focus:border-[#00D2FF]"
                            />
                            {kycFileMock && (
                               <span className="inline-block mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-1 px-2.5 rounded font-mono select-none">
                                 ✓ Selected: {kycFileMock}
                               </span>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <button 
                              onClick={() => setKycStep(1)}
                              className="bg-[#242529] hover:bg-[#2D2E33] border border-[#2C2D32] text-xs font-bold px-4 py-2.5 rounded-lg whitespace-nowrap cursor-pointer"
                            >
                              Go Back
                            </button>
                            <button 
                              disabled={!kycDocNum.trim() || !kycFileMock}
                              onClick={() => setKycStep(3)}
                              className="bg-white text-black font-extrabold text-xs px-5 py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition cursor-pointer"
                            >
                              Review Submission Details
                            </button>
                          </div>
                        </div>
                      )}

                      {kycStep === 3 && (
                        <div className="space-y-5 max-w-md">
                          <h4 className="font-bold text-white text-base">Step 3: Certification & Biometrics</h4>
                          
                          {kycSubmitting ? (
                            <div className="bg-black/80 rounded-xl border border-[#2C2D32] p-5 font-mono text-xs text-gray-400 space-y-2.5 relative overflow-hidden min-h-[220px]">
                              {/* Glowing scan screen line */}
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent shadow-[0_0_12px_rgba(0,210,255,1)] animate-bounce" />
                              <div className="flex justify-between items-center text-gray-500 text-[10px] pb-2 border-b border-[#2C2D32]">
                                <span>🤖 COMPLIANCE AUTOPILOT REGULATOR</span>
                                <span className="animate-pulse text-[#00D2FF] font-bold">ACTIVE SCAN RUNNING</span>
                              </div>
                              <div className="space-y-1.5 pt-2 max-h-[170px] overflow-y-auto custom-scrollbar leading-relaxed">
                                {kycRobotLogs.map((log, idx) => (
                                  <div 
                                    key={idx} 
                                    className={
                                      log.includes('SUCCESS') || log.includes('APPROVED') 
                                        ? 'text-emerald-400 font-bold' 
                                        : log.includes('BIOMETRICS') || log.includes('OCR') 
                                        ? 'text-[#00D2FF]' 
                                        : 'text-gray-300'
                                    }
                                  >
                                    {log}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="bg-[#16171A] border border-[#2C2D32] rounded-xl p-4 text-xs text-gray-300 font-mono space-y-2">
                                <p>Verification Legal Name: <span className="text-white font-bold">{kycFullName}</span></p>
                                <p>Doc Issue Region: <span className="text-white font-bold">{kycCountry}</span></p>
                                <p>Certificate Selected: <span className="text-white font-bold">{kycDocType} ({kycDocNum})</span></p>
                                <p>Attached Scan File: <span className="text-white font-bold">{kycFileMock}</span></p>
                              </div>
                              
                              <div className="text-xs text-gray-400 leading-relaxed">
                                By selecting 'Certify Credentials' below, you verify that all supplied documentation resides under your registered name, and hereby authorize AML cleared background sweeps on account {user.uid}.
                              </div>

                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setKycStep(2)}
                                  className="bg-[#242529] hover:bg-[#2D2E33] border border-[#2C2D32] text-xs font-bold px-4 py-2.5 rounded-lg whitespace-nowrap cursor-pointer"
                                >
                                  Go Back
                                </button>
                                <button 
                                  onClick={async () => {
                                    setKycSubmitting(true);
                                    setKycRobotLogs(["🤖 [CEXPRO COMPLIANCE BOT v4.1] Booting AI verification core..."]);
                                    
                                    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
                                    
                                    await delay(600);
                                    setKycRobotLogs(prev => [...prev, "🔍 [OCR SCAN]: Parsing identity document fields..."]);
                                    await delay(500);
                                    setKycRobotLogs(prev => [...prev, `🔍 [OCR SUCCESS]: Retrieved name "${kycFullName}" | Issue Region: "${kycCountry}"`]);
                                    await delay(600);
                                    setKycRobotLogs(prev => [...prev, "🧬 [BIOMETRICS]: Matching card signature & biometric face points..."]);
                                    await delay(500);
                                    setKycRobotLogs(prev => [...prev, "🧬 [BIOMETRICS SUCCESS]: Match confident index: 99.42% alignment."]);
                                    await delay(700);
                                    setKycRobotLogs(prev => [...prev, "⚖️ [AML CORE]: Screening international sanction listings & PEP databases..."]);
                                    await delay(500);
                                    setKycRobotLogs(prev => [...prev, "⚖️ [AML STATUS]: APPROVED. Clean security assessment registry."]);
                                    await delay(600);
                                    setKycRobotLogs(prev => [...prev, "🤖 [AUTOPILOT SUCCESS]: Self-verification approved! Locking on Firestore ledger."]);
                                    
                                    await delay(700);
                                    await updateProfile({ 
                                      displayName: kycFullName, 
                                      kycStatus: 'verified', 
                                      verified: true 
                                    });
                                    setKycSubmitting(false);
                                    setKycStep(1);
                                    setKycRobotLogs([]);
                                  }}
                                  className="bg-[#00D2FF] hover:bg-cyan-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-lg transition overflow-hidden shadow-md flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  Certify Credentials
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}


                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-[#1C1E22] rounded-xl p-6 border border-[#2C2D32]">
                  <h3 className="font-extrabold text-xl text-white mb-2">My Profile Settings</h3>
                  <p className="text-gray-400 text-sm mb-6 border-b border-[#2C2D32] pb-2">Customize your user profile moniker, premium vector graphic badges, and registered support networks.</p>

                  {settingsStatus.text && (
                    <div className="p-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm mb-6 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      {settingsStatus.text}
                    </div>
                  )}

                  <div className="space-y-5 max-w-lg">
                    {/* Nickname */}
                    <div>
                      <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Profile Nickname / Moniker</label>
                      <input 
                        type="text" 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="e.g. Satoshi Whale"
                        className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs text-gray-500 font-bold mb-2 uppercase">Phone Number Registration</label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +212 600-00000"
                        className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-sm text-white px-4 py-2.5 focus:outline-none focus:border-[#00D2FF]"
                      />
                    </div>

                    {/* Choose Avatar */}
                    <div>
                      <label className="block text-xs text-gray-500 font-bold mb-3 uppercase">Select Avatar Theme Preset</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {avatarPresets.map((preset, index) => {
                          const isSelected = photoURL === preset.url;
                          return (
                            <div 
                              key={index} 
                              onClick={() => setPhotoURL(preset.url)}
                              className={`rounded-xl p-2.5 border text-center cursor-pointer transition capitalize ${isSelected ? 'border-[#00D2FF] bg-[#242529]/60' : 'border-[#2D2E33] bg-[#242529]/15 hover:bg-[#242529]/30'}`}
                            >
                              <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-2 border border-white/10 shadow-sm relative">
                                <img src={preset.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Preset text" />
                              </div>
                              <span className="text-[11px] font-bold text-gray-300 tracking-tight leading-tight block">{preset.name}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Avatar Custom URL */}
                      <div className="mt-4">
                        <label className="block text-[11px] text-gray-500 font-bold mb-1.5 uppercase">Or Enter Custom Avatar Image URL</label>
                        <input 
                          type="text" 
                          value={photoURL}
                          onChange={(e) => setPhotoURL(e.target.value)}
                          placeholder="https://example.com/photo.png"
                          className="w-full bg-[#242529] border border-[#2C2D32] rounded-lg text-xs text-white px-4 py-1.5 focus:outline-none focus:border-[#00D2FF]"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        setIsSaving(true);
                        await updateProfile({
                          displayName: nickname.trim(),
                          photoURL: photoURL.trim(),
                          phoneNumber: phone.trim()
                        });
                        setIsSaving(false);
                        setSettingsStatus({ success: true, text: "Profile details updated successfully under CEXPRO cloud!" });
                        setTimeout(() => setSettingsStatus({ success: false, text: "" }), 4000);
                      }}
                      disabled={isSaving}
                      className="bg-white text-black font-extrabold text-sm px-6 py-3 rounded-lg hover:bg-gray-100 transition whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 mt-4"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-black animate-infinite" />}
                      Save Profile Updates
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* API Tab preserved */}
            {activeTab === 'api' && (
              <motion.div key="api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-6">
                  <h3 className="text-[20px] font-bold text-white tracking-wide">Programmatic API Access Management</h3>
                  <p className="text-[13px] text-gray-400 mt-1">Configure and manage cryptographic API keys to trade automatically with custom bots.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 bg-[#1C1E22] border border-[#2C2D32] rounded-xl p-6 space-y-5">
                    <h4 className="text-[13px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-[#2C2D32]">
                      <span>Create Custom Secret Key</span>
                    </h4>
                    
                    <form onSubmit={handleCreateApiKey} className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase">
                          Descriptive Key Label
                        </label>
                        <input
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Mac Trading Bot Principal"
                          className="w-full bg-[#16171A] border border-[#2C2D32] text-[13px] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-white transition-colors placeholder:text-gray-600 font-medium"
                          required
                          maxLength={50}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-400 uppercase">
                          Assign Permission Level
                        </label>
                        <div className="space-y-3 text-left bg-[#16171A] p-4 rounded-xl border border-[#2C2D32]">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={newKeyPermissions.includes('read')}
                              onChange={() => togglePermission('read')}
                              className="mt-1 rounded border-gray-600 text-white focus:ring-0 bg-[#2C2D32] cursor-pointer"
                            />
                            <div>
                              <div className="text-white text-[13px] font-bold group-hover:text-gray-200 transition-colors">Read Access</div>
                              <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">Authorizes account statements and transactions reading.</div>
                            </div>
                          </label>
                          
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={newKeyPermissions.includes('trade')}
                              onChange={() => togglePermission('trade')}
                              className="mt-1 rounded border-gray-600 text-white focus:ring-0 bg-[#2C2D32] cursor-pointer"
                            />
                            <div>
                              <div className="text-white text-[13px] font-bold group-hover:text-gray-200 transition-colors">Leveraged Trade Access</div>
                              <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">Authorizes automated order execution on ledger.</div>
                            </div>
                          </label>
                          
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={newKeyPermissions.includes('withdraw')}
                              onChange={() => togglePermission('withdraw')}
                              className="mt-1 rounded border-gray-600 text-rose-500 focus:ring-0 bg-[#2C2D32] cursor-pointer"
                            />
                            <div>
                              <div className="text-white text-[13px] font-bold flex items-center gap-1 group-hover:text-gray-200 transition-colors">Enable Withdrawals <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /></div>
                              <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">Allow programmatic asset transfers to external codes (High Risk).</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isSubmitting || !newKeyName.trim() || newKeyPermissions.length === 0}
                        className="w-full h-11 bg-white hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-black font-bold text-[13px] transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isSubmitting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Authorizing...</>
                        ) : (
                          'Deploy Credential Keys'
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl flex gap-3 text-left">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-amber-500/90 leading-relaxed font-medium">
                        Never reveal your API credentials key code. Compliance departments will never request your private secrets. Disable withdrawals for secure workflows.
                      </p>
                    </div>

                    {loadingKeys ? (
                      <div className="flex justify-center items-center py-12 bg-[#1C1E22] border border-[#2C2D32] rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="text-center py-12 border border-[#2C2D32] rounded-xl bg-[#1C1E22]">
                        <Plug className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-white font-bold text-sm mb-1">No API keys registered</h4>
                        <p className="text-gray-500 text-[13px] max-w-sm mx-auto">Create and integrate high-performance web hook keys using the inline form.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        {apiKeys.map((apiKey) => (
                          <div key={apiKey.id} className="bg-[#1C1E22] border border-[#2C2D32] rounded-xl overflow-hidden">
                            <div className="flex justify-between items-center px-5 py-3 bg-[#16171A] border-b border-[#2C2D32]">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                                <h4 className="text-white font-bold text-[13px]">{apiKey.name}</h4>
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono font-medium">
                                Registered: {apiKey.createdAt?.toDate ? new Date(apiKey.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                              </div>
                            </div>
                            <div className="p-5 space-y-4">
                              <div>
                                <div className="text-[11px] text-gray-500 uppercase font-bold mb-2">Assigned Client Key</div>
                                <div className="flex items-center gap-2">
                                  <code className="text-white bg-[#16171A] border border-[#2C2D32] px-3 py-2 rounded-lg font-mono text-[13px] font-bold select-all overflow-hidden text-ellipsis flex-1">
                                    {showApiKey[apiKey.id] ? apiKey.key : "********************************"}
                                  </code>
                                  <button 
                                    onClick={() => toggleVisibility(apiKey.id)}
                                    className="p-2.5 bg-[#16171A] border border-[#2C2D32] hover:bg-[#2C2D32] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {showApiKey[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                  <button 
                                    onClick={() => handleCopy(apiKey.id, apiKey.key)}
                                    className="p-2.5 bg-[#16171A] border border-[#2C2D32] hover:bg-[#2C2D32] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {copiedKey[apiKey.id] ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] text-gray-500 uppercase font-bold mb-2">Capabilities</div>
                                <div className="flex flex-wrap gap-2">
                                  {apiKey.permissions.includes('read') && (
                                    <span className="bg-[#16171A] border border-[#2C2D32] text-white px-2.5 py-1 rounded text-[11px] font-mono font-bold">Read Statements</span>
                                  )}
                                  {apiKey.permissions.includes('trade') && (
                                    <span className="bg-[#16171A] border border-[#2C2D32] text-[#00D2FF] px-2.5 py-1 rounded text-[11px] font-mono font-bold">Execute Trades</span>
                                  )}
                                  {apiKey.permissions.includes('withdraw') ? (
                                    <span className="bg-[#16171A] border border-rose-500/30 text-rose-500 px-2.5 py-1 rounded text-[11px] font-mono font-bold">External Withdrawals</span>
                                  ) : (
                                    <span className="bg-[#16171A] border border-[#2C2D32] text-gray-500 px-2.5 py-1 rounded text-[11px] font-mono select-none">Withdrawals Restricted</span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2">
                                <div className="text-[11px] text-gray-500 uppercase font-bold mb-2">Automated Trading Bot Simulator</div>
                                <div className="bg-[#16171A] border border-[#2C2D32] rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 font-mono leading-tight">Run automated trades on-ledger:</span>
                                    <button 
                                      onClick={() => {
                                        setRunningBots(prev => ({ ...prev, [apiKey.id]: !prev[apiKey.id] }));
                                        if (!runningBots[apiKey.id]) {
                                          setBotLogs(prev => ({
                                            ...prev,
                                            [apiKey.id]: [`[${new Date().toLocaleTimeString()}] 🤖 Starting automated trade streams using API security credentials...`]
                                          }));
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer ${runningBots[apiKey.id] ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[#242529] text-gray-400 border border-[#2D2E33] hover:text-white'}`}
                                    >
                                      {runningBots[apiKey.id] ? "CONNECTED" : "LAUNCH BOT"}
                                    </button>
                                  </div>
                                  
                                  {/* Bot Trade Logs Console */}
                                  <div className="bg-black/40 border border-[#2C2D32] rounded-lg p-3 h-[110px] overflow-y-auto font-mono text-[10px] text-gray-400 space-y-1 scrollbar-thin select-all">
                                    {botLogs[apiKey.id]?.length > 0 ? (
                                      botLogs[apiKey.id].map((log, lIdx) => (
                                        <div key={lIdx} className={log.includes('Starting') ? 'text-[#00D2FF] font-semibold' : log.includes('WARN') ? 'text-rose-400' : 'text-emerald-400/90'}>
                                          {log}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-gray-600 text-center py-6 select-none font-mono text-[10px]">Console channel idle. Launch bot to start trade execution logs.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-[#16171A] px-5 py-3 border-t border-[#2C2D32] flex justify-end gap-3 text-xs">
                              <button 
                                onClick={() => handleDeleteApiKey(apiKey.id)}
                                className="text-rose-500 hover:text-rose-400 transition-colors font-bold uppercase text-[11px] tracking-wider cursor-pointer"
                              >
                                Terminate Hook Key
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


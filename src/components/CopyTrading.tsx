import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, ShieldCheck, ChevronRight, CheckCircle2, 
  HelpCircle, Settings, X, PlusCircle, AlertCircle, Loader2, StopCircle,
  Search, SlidersHorizontal, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getWalletBalance } from '../lib/auth-context';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

interface Trader {
  id?: string;
  name: string;
  tag: string;
  roi: number;
  followers: number;
  pnl: string;
  winRate: string;
  avatarInitials: string;
}

const DEFAULT_TRADERS: Trader[] = [];

interface CopiedPosition {
  id: string;
  traderName: string;
  investmentAmount: number;
  mode: 'FIXED' | 'RATIO';
  tp: number;
  sl: number;
  initialRoy: number;
  currentRoy: number;
  pnlUSD: number;
  stakedAt: number;
}

export function CopyTrading() {
  const { profile, updateBalance, updateWalletBalance, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'MY_COPIES'>('DISCOVER');
  
  // State for traders list, allowing additions
  const [traders, setTraders] = useState<Trader[]>(DEFAULT_TRADERS);

  // Saved active copied copy positions
  const [copiedPositions, setCopiedPositions] = useState<CopiedPosition[]>([]);
  
  // Copy Modal controls
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [copyAmount, setCopyAmount] = useState<string>('200');
  const [copyMode, setCopyMode] = useState<'FIXED' | 'RATIO'>('FIXED');
  const [takeProfit, setTakeProfit] = useState<string>('60');
  const [stopLoss, setStopLoss] = useState<string>('30');
  const [modalLoading, setModalLoading] = useState(false);

  // Become a Lead Trader controls
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadTag, setLeadTag] = useState('Low Risk');
  const [leadTargetROI, setLeadTargetROI] = useState('50');

  const [notification, setNotification] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);

  // Filtering & Sorting State
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'ROI' | 'WIN_RATE' | 'FOLLOWERS'>('ROI');
  const [hideFull, setHideFull] = useState<boolean>(false);

  // Filter and sort the public lead traders
  const filteredTraders = traders
    .filter(trader => {
      const isFull = trader.followers >= 300; // Simulated full capacity at 300
      if (hideFull && isFull) return false;
      
      const matchTag = selectedTagFilter === 'All' || trader.tag.toLowerCase().trim() === selectedTagFilter.toLowerCase().trim();
      const matchSearch = trader.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          trader.tag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTag && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'ROI') {
        return b.roi - a.roi;
      } else if (sortBy === 'FOLLOWERS') {
        return b.followers - a.followers;
      } else if (sortBy === 'WIN_RATE') {
        const rateA = parseFloat(a.winRate.replace('%', '')) || 0;
        const rateB = parseFloat(b.winRate.replace('%', '')) || 0;
        return rateB - rateA;
      }
      return 0;
    });

  useEffect(() => {
    // Listen to custom copy traders created by users globally
    const qTraders = query(collection(db, 'custom_traders'));
    const unsubTraders = onSnapshot(qTraders, (snapshot) => {
      const dbTraders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trader));
      setTraders([...dbTraders, ...DEFAULT_TRADERS]);
    }, (error) => {
      console.warn("Permission issue or Firestore connection error loading custom traders. Falling back to default list.", error);
      setTraders(DEFAULT_TRADERS);
    });

    return () => unsubTraders();
  }, []);

  useEffect(() => {
    if (!user) {
      setCopiedPositions([]);
      return;
    }
    
    // Listen to user's copy positions
    const qPos = query(collection(db, 'copied_positions'), where('userId', '==', user.uid));
    const unsubPos = onSnapshot(qPos, (snapshot) => {
      const positions = snapshot.docs.map(doc => {
        const data = doc.data();
        const stakedTimeDesc = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
        const minsPassed = (Date.now() - stakedTimeDesc) / 60000;
        return {
          id: doc.id,
          traderName: data.traderName,
          investmentAmount: data.investmentAmount,
          mode: data.mode,
          tp: data.tp,
          sl: data.sl,
          initialRoy: data.initialRoy,
          currentRoy: data.currentRoy || 0, 
          pnlUSD: data.pnlUSD || 0,
          stakedAt: stakedTimeDesc
        };
      });
      setCopiedPositions(positions);
    });

    return () => unsubPos();
  }, [user]);

  // Initiate a new copy portfolio link
  const handleInitiateCopy = async () => {
    setNotification(null);
    if (!user || !profile) {
      setNotification({ type: 'err', msg: 'Please log in or register your account in order to access Copy Trading.' });
      return;
    }

    const value = parseFloat(copyAmount);
    if (isNaN(value) || value <= 0) {
      setNotification({ type: 'err', msg: 'Please enter a valid allocation sizing.' });
      return;
    }

    //@ts-ignore
    const availableUSD = getWalletBalance(profile, 'SPOT', 'USD');
    if (value > availableUSD) {
      setNotification({ type: 'err', msg: `Insufficient USD funds available in Spot wallet. Available: $${availableUSD.toLocaleString()}` });
      return;
    }

    if (!selectedTrader) return;

    setModalLoading(true);
    try {
      // Deduct the investment amount from their actual profile wallet USD
      //@ts-ignore
      await updateWalletBalance('SPOT', 'USD', -value);

      await addDoc(collection(db, 'copied_positions'), {
        userId: user.uid,
        traderName: selectedTrader.name,
        investmentAmount: value,
        mode: copyMode,
        tp: parseInt(takeProfit) || 60,
        sl: parseInt(stopLoss) || 30,
        initialRoy: selectedTrader.roi,
        createdAt: serverTimestamp()
      });

      setNotification({ type: 'success', msg: `Authorized connection! Replicating ${selectedTrader.name} trades using $${value.toLocaleString()} USD balance allocation.` });
      setSelectedTrader(null);
      setActiveTab('MY_COPIES');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'copied_positions');
      setNotification({ type: 'err', msg: e.message || 'Verification check error.' });
    } finally {
      setModalLoading(false);
    }
  };

  // Stop mimicking trader and return principal with gains
  const handleStopCopying = async (copyId: string) => {
    setNotification(null);
    if (!user || !profile) return;

    const targetPos = copiedPositions.find(p => p.id === copyId);
    if (!targetPos) return;

    try {
      // Calculate total repatriated cash: original + accrued dollar PNL
      const totalPayout = targetPos.investmentAmount + targetPos.pnlUSD;

      // Add back to spot USD profile wallet balance!
      //@ts-ignore
      await updateWalletBalance('SPOT', 'USD', totalPayout);

      await deleteDoc(doc(db, 'copied_positions', copyId));

      setNotification({ type: 'success', msg: `Stopped mimicking ${targetPos.traderName}. Returned $${totalPayout.toFixed(2)} USD (consisting of your $${targetPos.investmentAmount} USD principal and copy returns) safely to your Spot wallet balance.` });
    } catch (e: any) {
      setNotification({ type: 'err', msg: e.message || 'Repatriation error.' });
    }
  };

  // Create your own lead trader profile
  const handleBecomeLead = async () => {
    setNotification(null);
    if (!user) {
      setNotification({ type: 'err', msg: 'Authentication required to create a trader profile.' });
      return;
    }
    if (!leadName.trim()) {
      setNotification({ type: 'err', msg: 'Please provide a descriptive Lead Trader alias name.' });
      return;
    }

    setModalLoading(true);
    try {
      const nextTrader = {
        userId: user.uid,
        name: leadName.trim().replace(/\s+/g, '_'),
        tag: leadTag,
        roi: parseFloat(leadTargetROI) || 15.5,
        followers: 0,
        pnl: "+$0",
        winRate: "100%",
        avatarInitials: leadName.charAt(0).toUpperCase()
      };

      await addDoc(collection(db, 'custom_traders'), nextTrader);

      setNotification({ type: 'success', msg: `Congratulations! Your Lead Trader profile "${nextTrader.name}" is now live on our global Leaderboards feed.` });
      setIsLeadModalOpen(false);
      setLeadName('');
    } catch (e: any) {
      setNotification({ type: 'err', msg: e.message || 'Lead setup error.' });
    } finally {
      setModalLoading(false);
    }
  };

  // Statistical calculations
  const totalInvestedUSD = copiedPositions.reduce((acc, curr) => acc + curr.investmentAmount, 0);
  const totalPnLUSD = copiedPositions.reduce((acc, curr) => acc + curr.pnlUSD, 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 p-6 overflow-y-auto bg-dark-bg w-full custom-scroll"
    >
      <div className="w-full space-y-6">

        {/* Account Summary Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-dark-border/40 select-none">
          <div className="flex items-center gap-10 md:gap-16">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#848E9C] border-b border-dashed border-[#848E9C]/60 cursor-pointer hover:text-white transition-colors">Total assets (USDT)</span>
                <Eye className="w-[15px] h-[15px] text-[#848E9C] cursor-pointer hover:text-white transition-colors" />
              </div>
              <div className="text-xl font-bold text-white tracking-widest mt-1">--</div>
            </div>
            <div className="space-y-1">
              <div className="text-[13px] text-[#848E9C]">Avl. balance (USDT)</div>
              <div className="text-xl font-bold text-white tracking-widest mt-1">--</div>
            </div>
            <div className="space-y-1 border-l border-transparent md:border-transparent">
              <div className="text-[13px] text-[#848E9C] border-b border-dashed border-[#848E9C]/60 cursor-pointer hover:text-white transition-colors inline-block">Est. net profit (USDT)</div>
              <div className="text-xl font-bold text-white tracking-widest mt-1">--</div>
            </div>
          </div>
          <button onClick={() => navigate('/auth')} className="mt-4 md:mt-0 bg-white hover:bg-gray-100 text-black font-semibold py-2.5 px-6 rounded text-sm transition-colors cursor-pointer shrink-0">
            Log in to check profit
          </button>
        </div>
        
        {/* Global Notifications Panel */}
        {notification && (
          <div className={`p-4 rounded text-xs animate-fadeIn flex items-center justify-between border ${
            notification.type === 'success' 
              ? 'bg-buy/10 border-buy/20 text-[#10B981]' 
              : 'bg-sell/10 border-sell/20 text-[#F43F5E]'
          }`}>
            <span className="font-semibold leading-relaxed">{notification.msg}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-dark-text-muted hover:text-white ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'MY_COPIES' ? (
          /* MY ACTIVE COPIED TRADES VIEW */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">My Active Copy Positions({copiedPositions.length})</h2>
              <button 
                onClick={() => setActiveTab('DISCOVER')}
                className="text-primary-500 text-xs font-bold hover:text-white transition-all uppercase"
              >
                Back to Leaderboard Feed
              </button>
            </div>

            {copiedPositions.length === 0 ? (
              <div className="p-12 text-center text-xs text-dark-text-muted bg-dark-bg/20 border border-dashed border-dark-border rounded-xl max-w-xl mx-auto space-y-3 select-none">
                <AlertCircle className="w-8 h-8 text-dark-text-muted mx-auto" />
                <p>No active mirror allocations configured. Explore the leadership feed below to replicate successful systems.</p>
                <button 
                  onClick={() => setActiveTab('DISCOVER')}
                  className="bg-primary-500 hover:bg-primary-600 text-black font-extrabold text-xs px-5 py-2 rounded transition-colors cursor-pointer"
                >
                  Discover Leads
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {copiedPositions.map((pos) => (
                  <div key={pos.id} className="bg-dark-surface border border-dark-border hover:border-primary-500/30 rounded-xl p-5 flex flex-col justify-between h-64 relative overflow-hidden transition-all group">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-500/10 border-2 border-[#1E2329] flex items-center justify-center text-white text-xs font-bold">
                            {pos.traderName.charAt(0)}
                          </div>
                          <span className="text-xs font-black text-white">{pos.traderName}</span>
                        </div>
                        <span className="text-[9px] bg-dark-bg text-dark-text-muted border border-dark-border px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          Mode: {pos.mode}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-dark-border/40 mb-4 text-xs">
                        <div>
                          <span className="text-[10px] text-dark-text-muted block font-semibold">Staked capital:</span>
                          <span className="font-extrabold font-mono text-white">${pos.investmentAmount.toLocaleString()} USD</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-dark-text-muted block font-semibold">Repetition Gain/Loss:</span>
                          <span className={`font-mono font-black text-xs ${pos.pnlUSD >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                            {pos.pnlUSD >= 0 ? `+$${pos.pnlUSD.toFixed(2)}` : `-$${Math.abs(pos.pnlUSD).toFixed(2)}`} ({pos.currentRoy >= 0 ? `+${pos.currentRoy}%` : `${pos.currentRoy}%`})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-dark-text-muted">
                      <div>
                        <span>TP:</span> <span className="text-white font-mono font-bold">{pos.tp}%</span> |  
                        <span> SL:</span> <span className="text-white font-mono font-bold">-{pos.sl}%</span>
                      </div>
                      <button
                        onClick={() => handleStopCopying(pos.id)}
                        className="text-xs font-black text-[#F43F5E] hover:bg-sell/10 border border-sell/10 hover:border-sell/30 px-3.5 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Cancel Copy</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* LEADERBOARD EXPLORATION VIEWS */
          <div className="space-y-4">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none mt-2">
              <h2 className="text-2xl font-bold text-white">All traders</h2>
              
              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-muted" />
                <input
                  type="text"
                  placeholder="Search traders"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border border-dark-border focus:border-primary-500 rounded-md pl-9 pr-4 py-2 text-sm text-white outline-none transition"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dark-text-muted hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none text-sm border-b border-transparent md:border-b-0 pb-2">
              <div className="flex flex-wrap items-center gap-6 text-[#848E9C]">
                <button className="flex items-center gap-1 hover:text-white transition-colors">
                  <span className="text-[#10B981]">30D</span>
                  <span className="text-[10px]">▼</span>
                </button>
                
                {(['ROI', 'Profits', "Copiers' profits", 'AUM', 'Number of copiers']).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      if (option === 'ROI') setSortBy('ROI');
                      else if (option === 'Number of copiers') setSortBy('FOLLOWERS');
                    }}
                    className={`flex items-center gap-1 transition-colors cursor-pointer ${
                      (sortBy === 'ROI' && option === 'ROI') || (sortBy === 'FOLLOWERS' && option === 'Number of copiers')
                        ? 'text-white' 
                        : 'hover:text-white'
                    }`}
                  >
                    {option}
                    <span className="text-[10px]">⇅</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 text-[#848E9C]">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <input 
                    type="checkbox" 
                    checked={hideFull}
                    onChange={(e) => setHideFull(e.target.checked)}
                    className="rounded border-dark-border bg-transparent text-primary-500 focus:ring-primary-500/20 form-checkbox w-4 h-4 cursor-pointer" 
                  />
                  <span>Hide full</span>
                </label>
                <button className="w-8 h-8 flex items-center justify-center rounded-full border border-dark-border hover:border-[#848E9C] text-white transition-colors text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {filteredTraders.length === 0 ? (
              <div className="p-12 text-center text-xs text-dark-text-muted bg-[#12161A] border border-dashed border-dark-border rounded max-w-xl mx-auto space-y-3 select-none my-6">
                <AlertCircle className="w-8 h-8 text-dark-text-muted mx-auto" />
                <p>No lead traders match your search criteria or selected filters.</p>
                <button 
                  onClick={() => {
                    setSelectedTagFilter('All');
                    setSearchQuery('');
                    setSortBy('ROI');
                  }}
                  className="bg-primary-500 hover:bg-primary-600 text-black font-extrabold text-xs px-5 py-2 rounded transition-colors cursor-pointer"
                >
                  Reset Active Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredTraders.map((trader, i) => (
                  <div 
                    key={i} 
                    className="bg-dark-surface border border-dark-border hover:border-primary-500/50 rounded-xl p-5 transition-all group relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Glowing ambient decorative backdrops */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary-500/10 transition-colors pointer-events-none"></div>

                    <div>
                      <div className="flex items-center gap-3 mb-6 relative z-10 select-none">
                        <div className="w-12 h-12 rounded-lg border border-dark-border flex items-center justify-center text-white font-bold bg-dark-bg text-lg relative overflow-hidden">
                          {trader.avatarInitials}
                        </div>
                        <div>
                          <h3 className="text-white font-extrabold text-[15px] truncate max-w-[120px]" title={trader.name}>{trader.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-dark-text-muted">
                            <span>@{(trader.name.replace(/\s+/g, '').toUpperCase() + "00").substring(0,6)}...</span>
                            <span className="flex items-center text-white/50"><Users className="w-3 h-3 mr-1" /> {trader.followers}/300</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mb-5 select-none relative z-10">
                        <div className="flex flex-col">
                          <p className="text-[11px] text-dark-text-muted font-bold uppercase mb-1">ROI</p>
                          <p className={`text-2xl font-bold tracking-tight leading-none mb-1 shadow-sm ${trader.roi >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                            {trader.roi >= 0 ? '+' : ''}{(trader.roi).toFixed(2)}%
                          </p>
                          <p className="text-[11px] text-dark-text-muted">
                            Profits <span className={trader.pnl.startsWith('+') ? 'text-[#10B981]' : 'text-[#F43F5E]'}>{trader.pnl}</span>
                          </p>
                        </div>
                        
                        {/* Area graph sparklines matched to screenshot theme */}
                        <div className="w-24 h-12 flex items-end gap-[1.5px] opacity-80 mb-2">
                           {[...Array(12)].map((_, j) => (
                              <div key={j} className={`flex-1 ${trader.roi >= 0 ? 'bg-[#10B981]' : 'bg-[#F43F5E]'} rounded-t-sm transition-all duration-300`} style={{ height: `${Math.max(10, Math.sin(j * 0.8 + i) * 40 + 50)}%`, opacity: 0.1 + (j/12)*0.9 }}></div>
                           ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-6 select-none relative z-10">
                        <div>
                          <p className="text-[10px] text-dark-text-muted mb-1 font-bold">Copiers profits</p>
                          <p className={`text-[13px] font-semibold ${trader.roi >= 0 ? 'text-white' : 'text-white'}`}>-$4.83</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dark-text-muted mb-1 font-bold">AUM</p>
                          <p className="text-[13px] text-white font-semibold">${(1041.6 * (i + 1)).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dark-text-muted mb-1 font-bold">Win rate</p>
                          <p className="text-[13px] text-white font-semibold">{trader.winRate}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!user) {
                          navigate('/auth');
                        } else if (trader.followers < 300) {
                          setSelectedTrader(trader);
                          setCopyAmount('200');
                        }
                      }}
                      className={`w-full text-sm font-bold py-2.5 rounded-lg transition-colors relative z-10 cursor-pointer select-none ${
                        trader.followers >= 300 
                          ? 'bg-transparent text-white border border-dark-border hover:bg-dark-bg' 
                          : 'bg-[#f2f4f7] hover:bg-[#e2e5eA] text-black'
                      }`}
                    >
                      {trader.followers >= 300 ? '🔥 View' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* RENDER MODAL : DEFINE COPY CONFIGURATION */}
      <AnimatePresence>
        {selectedTrader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-surface border border-dark-border rounded w-full max-w-lg p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-dark-border/60">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-primary-500/10 rounded-full text-primary-500">
                    <Settings className="w-5 h-5 animate-spin-slow" />
                  </span>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Configure Mirror Setup: {selectedTrader.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedTrader(null)}
                  className="text-dark-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                
                {/* Investment size */}
                <div>
                  <div className="flex justify-between text-xs text-dark-text-muted mb-1.5">
                    <span>Investment Sizing in USD</span>
                    <span>Available: ${getWalletBalance(profile, 'SPOT', 'USD').toLocaleString() || '0.00'} USD</span>
                  </div>
                  <div className="flex items-center bg-dark-bg border border-dark-border rounded px-3 py-2.5 focus-within:border-primary-500">
                    <input
                      type="number"
                      value={copyAmount}
                      onChange={(e) => setCopyAmount(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none font-mono"
                    />
                    <span className="text-xs font-bold text-dark-text-muted ml-2">USD</span>
                  </div>
                </div>

                {/* SL & TP fields */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-dark-text-muted mb-1 block">Take-Profit Threshold (%)</label>
                    <input
                      type="number"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white outline-none font-mono focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-dark-text-muted mb-1 block">Stop-Loss Margin Limit (%)</label>
                    <input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white outline-none font-mono focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Sizing modes selection */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    onClick={() => setCopyMode('FIXED')}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      copyMode === 'FIXED' 
                        ? 'bg-primary-500/10 border-primary-500 text-primary-500 font-bold' 
                        : 'bg-dark-bg border-dark-border text-dark-text-muted hover:text-white'
                    }`}
                  >
                    Fixed Amount per Trade
                  </button>
                  <button
                    onClick={() => setCopyMode('RATIO')}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      copyMode === 'RATIO' 
                        ? 'bg-primary-500/10 border-primary-500 text-primary-500 font-bold' 
                        : 'bg-dark-bg border-dark-border text-dark-text-muted hover:text-white'
                    }`}
                  >
                    Proportional Ratio Sizing
                  </button>
                </div>

                <div className="p-3 bg-dark-bg border border-dark-border rounded flex items-start gap-2 select-none">
                  <AlertCircle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-dark-text-muted leading-relaxed">
                    By confirming, CEXPRO automatically initializes locks and monitors the leader's active actions, executing trades directly using your allocated capital.
                  </p>
                </div>

                <button
                  onClick={handleInitiateCopy}
                  disabled={modalLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-dark-border text-black font-black py-3 rounded uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer  shadow-primary-500/10"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Copy Allocation'}
                </button>

              </div>
            </motion.div>
          </div>
        )}

        {/* BECOME A LEAD TRADER MODAL */}
        {isLeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-surface border border-dark-border rounded-xl w-full max-w-md p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-dark-border/60">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-primary-500/10 rounded-full text-primary-500">
                    <PlusCircle className="w-5 h-5" />
                  </span>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Become a Lead Trader</h3>
                </div>
                <button 
                  onClick={() => setIsLeadModalOpen(false)}
                  className="text-dark-text-muted hover:text-white transition-colors cursor-pointer opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-dark-text-muted mb-1 block">Lead Trader Alias Moniker</label>
                  <input
                    type="text"
                    placeholder="e.g. Master_Arbitrage0"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border focus:border-primary-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted mb-1 block">Select Profile Expertise Label</label>
                  <select
                    value={leadTag}
                    onChange={(e) => setLeadTag(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border focus:border-primary-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="Low Risk">Low Risk (Conservative Gains)</option>
                    <option value="High Frequency">High Frequency (Aggressive Scalper)</option>
                    <option value="Swing Trader">Swing Trader (Medium-term Horizons)</option>
                    <option value="Consistent">Consistent Arbitrage</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted mb-1 block">Estimated Target ROI Margin (%)</label>
                  <input
                    type="number"
                    placeholder="e.g. 75"
                    value={leadTargetROI}
                    onChange={(e) => setLeadTargetROI(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border focus:border-primary-500 rounded px-3 py-2.5 text-sm text-white outline-none font-mono"
                  />
                </div>

                <div className="p-3 bg-dark-bg border border-dark-border rounded select-none">
                  <p className="text-[10px] text-dark-text-muted leading-relaxed">
                    By launching your public profile, thousands of global users will replicate your orders. You will secure up to 10% of their net profits. Keep a secure, high win rate!
                  </p>
                </div>

                <button
                  onClick={handleBecomeLead}
                  disabled={modalLoading || !user}
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-dark-border text-black font-black py-3 rounded uppercase text-xs tracking-wider transition-all cursor-pointer select-none"
                >
                  {!user ? 'Log In To Access' : 'Launch Public Profile'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

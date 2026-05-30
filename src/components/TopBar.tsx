import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, Settings, Bell, Search, Hexagon, User, LogOut, ChevronDown, ChevronRight,
  Coins, LineChart, BookOpen, GraduationCap, Gift, Shield, HeadphonesIcon, Settings as SettingsIcon,
  Users, Newspaper, FileText, RefreshCw
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MORE_ITEMS: any[] = [];

const SQUARE_ITEMS = [
  {
    icon: <Users className="w-4 h-4 text-[#10B981]" />,
    name: "Community Feed",
    desc: "Connect and replicate qualified certified experts",
    bg: "bg-[#10B981]/10",
    tab: "COMMUNITY" as const
  },
  {
    icon: <Newspaper className="w-4 h-4 text-teal-400" />,
    name: "Latest News",
    desc: "Global media and macro volatility alerts",
    bg: "bg-teal-500/10",
    tab: "NEWS" as const
  },
  {
    icon: <FileText className="w-4 h-4 text-[#F43F5E]" />,
    name: "Cexpro Blog",
    desc: "In-depth trading setups and strategic analyses",
    bg: "bg-[#F43F5E]/10",
    tab: "BLOG" as const
  }
];

const TRADE_ITEMS = [
  {
    icon: <Coins className="w-4 h-4 text-primary-500" />,
    name: "Crypto",
    desc: "Trade BTC, ETH, SOL and primary crypto assets",
    defaultPair: "BTC",
    bg: "bg-primary-500/10",
    action: (setCurrentView: any, setActiveTradePair: any) => {
      setActiveTradePair?.("BTC");
      setCurrentView("SPOT");
    }
  },
  {
    icon: <LineChart className="w-4 h-4 text-[#10B981]" />,
    name: "Forex Spot (XAUUSD etc)",
    desc: "Trade raw metals like Gold/Silver forex spot",
    defaultPair: "XAUUSD",
    bg: "bg-emerald-500/10",
    action: (setCurrentView: any, setActiveTradePair: any) => {
      setActiveTradePair?.("XAUUSD");
      setCurrentView("SPOT");
    }
  },
  {
    icon: <Gift className="w-4 h-4 text-orange-400 animate-pulse" />,
    name: "Memecoin",
    desc: "Trade leading community memetic coins on leverage",
    defaultPair: "DOGE",
    bg: "bg-orange-500/10",
    action: (setCurrentView: any, setActiveTradePair: any) => {
      setActiveTradePair?.("DOGE");
      setCurrentView("SPOT");
    }
  }
];

export function TopBar({
  currentView,
  setCurrentView,
  setAuthMode,
  onOpenSupport,
  activeTradePair,
  setActiveTradePair,
  squareTab,
  setSquareTab
}: {
  currentView: string;
  setCurrentView: (v: any) => void;
  setAuthMode: (m: 'LOGIN' | 'REGISTER') => void;
  onOpenSupport?: () => void;
  activeTradePair?: string;
  setActiveTradePair?: (p: string) => void;
  squareTab?: any;
  setSquareTab?: (tab: any) => void;
}) {
  const { user, logout, profile } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [isSquareOpen, setIsSquareOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tradeDropdownRef = useRef<HTMLDivElement>(null);
  const squareDropdownRef = useRef<HTMLDivElement>(null);

  // Fully Interactive Search and Notification features
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  interface NotificationType {
    id: string | number;
    title: string;
    desc: string;
    time: string;
    view: string;
    pair?: string;
    unread: boolean;
  }

  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  // Listen to Firestore real-time notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const defaultAlerts = [
      {
        id: 'welcome',
        title: "🚀 Welcome Bonus Active!",
        desc: "Trade your first 5 spot pairs to unlock premium trading fee discounts.",
        time: "Just now",
        view: "SPOT",
        unread: false
      },
      {
        id: 'btc',
        title: "📈 BTC Weekly Peak",
        desc: "Bitcoin touched $77,030.00 (+0.28%). Fast executions available.",
        time: "1 hour ago",
        view: "SPOT",
        pair: "BTC",
        unread: false
      }
    ];

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          let formattedTime = 'Just now';
          if (data.createdAt) {
            const date = data.createdAt.toDate();
            formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          return {
            id: docSnap.id,
            title: data.title || 'System Alert',
            desc: data.message || '',
            time: formattedTime,
            view: data.type === 'QUEST' || data.type === 'REWARD' ? 'SPOT' : 'SPOT',
            unread: !data.read
          };
        });
        
        // Show live ones, or fall back to default welcome alerts if empty
        const finalNotifs = fetched.length > 0 ? fetched : defaultAlerts;
        setNotifications(finalNotifs);
        setUnreadCount(finalNotifs.filter(n => n.unread).length);
      }, (error) => {
        console.warn("Permission issue or setup error loading notifications:", error);
        setNotifications(defaultAlerts);
        setUnreadCount(0);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Notifications listener attachment failure:", e);
      setNotifications(defaultAlerts);
    }
  }, [user]);

  const handleDismissAll = async () => {
    if (!user) return;
    try {
      const unreads = notifications.filter(n => n.unread);
      for (const n of unreads) {
        if (typeof n.id === 'string' && n.id !== 'welcome' && n.id !== 'btc') {
          await updateDoc(doc(db, 'notifications', n.id), {
            read: true
          });
        }
      }
    } catch (e) {
      console.error("Dismiss all notifications failed:", e);
    }
  };

  const handleMarkAsRead = async (id: string | number) => {
    if (!user) return;
    if (typeof id === 'string' && id !== 'welcome' && id !== 'btc') {
      try {
        await updateDoc(doc(db, 'notifications', id), {
          read: true
        });
      } catch (e) {
        console.error("Marking single notification read failed:", e);
      }
    }
  };

  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  const SEARCH_ITEMS = [
    { name: "BTC / USDT", category: "Trade Forex Spot", keywords: "btc bitcoin usdt", view: "SPOT", pair: "BTC" },
    { name: "ETH / USDT", category: "Trade Forex Spot", keywords: "eth ethereum usdt", view: "SPOT", pair: "ETH" },
    { name: "SOL / USDT", category: "Trade Forex Spot", keywords: "sol solana usdt", view: "SPOT", pair: "SOL" },
    { name: "XAU / USD (Gold Forex Spot)", category: "Trade Forex Spot", keywords: "gold metal xau xauusd spot forex spot", view: "SPOT", pair: "XAUUSD" },
    { name: "My Secure Wallet Dashboard", category: "Wallet", keywords: "wallet balance assets deposit withdraw transfer swap convert logs history desk", view: "WALLET" },
    { name: "API & Security Identity Profiler", category: "Profile", keywords: "profile keys safety api configure limit password security settings 2fa credentials", view: "PROFILE" },
    { name: "Cexpro Community Square Forums", category: "Square", keywords: "square forum posts community news academy blockchain blog feed article expert", view: "SQUARE" },
    { name: "Live Chat Help Support", category: "Support", keywords: "help direct manual dispatcher ticket queries support team real conversation desk", view: "SUPPORT" },
  ];

  const filteredSearchItems = SEARCH_ITEMS.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.keywords.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (tradeDropdownRef.current && !tradeDropdownRef.current.contains(event.target as Node)) {
        setIsTradeOpen(false);
      }
      if (squareDropdownRef.current && !squareDropdownRef.current.contains(event.target as Node)) {
        setIsSquareOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, tradeDropdownRef, squareDropdownRef, searchDropdownRef, notificationsDropdownRef]);

  return (
    <header className="h-14 border-b border-dark-border bg-dark-surface flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-6">
        <div 
          className="flex items-center gap-2 text-primary-500 cursor-pointer"
          onClick={() => setCurrentView('HOME')}
        >
          <Hexagon className="w-6 h-6 fill-current" />
          <span className="font-bold text-lg tracking-tight text-white">CEX<span className="text-primary-500">PRO</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-dark-text-muted h-full py-2">
          {/* 2. Markets Tab */}
          <button
            onClick={() => setCurrentView('MARKETS')}
            className={`px-4 py-2 rounded transition-all ${currentView === '/markets' || currentView === 'MARKETS' ? 'bg-dark-surface-alt text-white font-semibold' : 'hover:bg-white/5 hover:text-white'}`}
          >
            Markets
          </button>

          {/* 3. Trade Navigation Tab (Direct Button) */}
          <button
            onClick={() => setCurrentView('SPOT')}
            className={`px-4 py-2 rounded transition-all ${currentView === '/trade' || currentView === 'SPOT' ? 'bg-dark-surface-alt text-white font-semibold' : 'hover:bg-white/5 hover:text-white'}`}
          >
            Trade
          </button>

          {/* 4. Copy Trading Navigation Tab */}
          <button
            onClick={() => setCurrentView('COPY_TRADING')}
            className={`px-4 py-2 rounded transition-all ${currentView === '/copy-trading' || currentView === 'COPY_TRADING' ? 'bg-dark-surface-alt text-white font-semibold' : 'hover:bg-white/5 hover:text-white'}`}
          >
            Copy Trading
          </button>

          {/* 5. Square Navigation Tab */}
          <button
            onClick={() => {
              setSquareTab?.('COMMUNITY');
              setCurrentView('SQUARE');
            }}
            className={`px-4 py-2 rounded transition-all ${currentView === '/square' || currentView === 'SQUARE' ? 'bg-dark-surface-alt text-white font-semibold' : 'hover:bg-white/5 hover:text-white'}`}
          >
            Square
          </button>

          {/* Admin Desk Navigation Tab (Sleek action panel route) */}
          {profile && profile.role === 'admin' && (
            <button
              onClick={() => setCurrentView('ADMIN')}
              className={`px-4 py-2 rounded transition-all flex items-center gap-1.5 focus:outline-none ${currentView === 'ADMIN' ? 'bg-primary-500 text-black font-bold' : 'text-primary-500 hover:bg-primary-500/10 font-bold border border-primary-500/30'}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
            </button>
          )}
          
        </nav>
      </div>

      <div className="flex items-center gap-4 text-dark-text-muted">
        {/* Search Popover Desk */}
        <div className="relative" ref={searchDropdownRef}>
          <button 
            className={`p-2 rounded hover:bg-white/5 transition-all cursor-pointer relative flex items-center justify-center ${isSearchOpen ? 'text-primary-500 bg-white/5' : 'hover:text-white'}`}
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              setIsNotificationsOpen(false);
            }}
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-96 bg-[#161619] border border-dark-border rounded-xl p-3 z-50 text-left"
              >
                <div className="flex items-center gap-2 border-b border-dark-border/60 pb-2 mb-2">
                  <Search className="w-4 h-4 text-primary-500 shrink-0" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search hot pairs, desks, or utilities..."
                    className="w-full bg-transparent text-xs text-white outline-none placeholder-dark-text-muted font-mono"
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-dark-text-muted hover:text-white font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto custom-scroll space-y-1">
                  {filteredSearchItems.length > 0 ? (
                    filteredSearchItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (item.view === 'SPOT' && item.pair) {
                            setActiveTradePair?.(item.pair);
                          }
                          setCurrentView(item.view);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="p-2 rounded hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-primary-500 transition-colors">{item.name}</p>
                          <span className="text-[9px] font-mono uppercase font-semibold text-dark-text-muted">{item.category}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-dark-text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-dark-text-muted font-mono">
                      No matches found for "{searchQuery}"
                      <div className="mt-3 pt-3 border-t border-dark-border/35 text-left">
                        <p className="text-[10px] text-white/40 mb-1.5 uppercase font-bold tracking-widest">Suggested Desks:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SEARCH_ITEMS.slice(0, 4).map((hot, hidx) => (
                            <span
                              key={hidx}
                              onClick={() => {
                                if (hot.view === 'SPOT' && hot.pair) {
                                  setActiveTradePair?.(hot.pair);
                                }
                                setCurrentView(hot.view);
                                setIsSearchOpen(false);
                              }}
                              className="text-[10px] font-mono font-semibold bg-white/5 border border-dark-border hover:border-white px-2 py-0.5 rounded cursor-pointer transition-all text-white"
                            >
                              {hot.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Alerts and Notifications Desk Popover */}
        <div className="relative" ref={notificationsDropdownRef}>
          <button 
            className={`p-2 rounded hover:bg-white/5 transition-all cursor-pointer relative flex items-center justify-center ${isNotificationsOpen ? 'text-primary-500 bg-white/5' : 'hover:text-white'}`}
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsSearchOpen(false);
            }}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-dark-surface animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-96 bg-[#161619] border border-dark-border rounded-xl p-3.5 z-50 text-left text-xs"
              >
                <div className="flex items-center justify-between border-b border-dark-border/60 pb-2 mb-2">
                  <h4 className="font-extrabold text-[#10B981] uppercase tracking-wider text-[11px]">System Alerts Desk</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleDismissAll}
                      className="text-[10px] font-bold text-primary-500 hover:text-primary-400 font-mono uppercase bg-primary-500/10 hover:bg-primary-500/20 px-2.5 py-0.5 rounded"
                    >
                      Dismiss All ({unreadCount})
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto custom-scroll space-y-1.5">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          // Mark as read in Firestore
                          if (n.unread) {
                            handleMarkAsRead(n.id);
                          }
                          // Redirect
                          if (n.view === 'SPOT' && n.pair) {
                            setActiveTradePair?.(n.pair);
                          }
                          setCurrentView(n.view);
                          setIsNotificationsOpen(false);
                        }}
                        className={`p-2.5 rounded border transition-all cursor-pointer text-left relative group ${n.unread ? 'bg-white/[0.02] border-dark-border hover:border-emerald-500/30' : 'opacity-65 border-transparent hover:bg-white/5'}`}
                      >
                        {n.unread && (
                          <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        )}
                        <h5 className="font-extrabold text-white text-[11px] mb-0.5 select-none">{n.title}</h5>
                        <p className="text-[10px] text-dark-text-muted leading-relaxed mb-1.5 select-none">{n.desc}</p>
                        <span className="text-[8px] font-mono text-dark-text-muted">{n.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-dark-text-muted font-mono text-[11px] select-none">
                      All caught up! No novel alerts.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          className="hover:text-white transition-colors animate-none"
          onClick={() => setCurrentView('WALLET')}
          title="Wallet"
        >
          <Wallet className="w-5 h-5 mx-1" />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium mr-2 ml-2">
          {!user ? (
            <>
              <button 
                className="hover:text-white transition-colors border border-transparent px-4 py-1.5 rounded font-bold"
                onClick={() => { setAuthMode('LOGIN'); setCurrentView('AUTH'); }}
              >
                Log In
              </button>
              <button 
                className="bg-primary-500 hover:bg-white text-black font-bold px-4 py-1.5 rounded transition-colors cursor-pointer border-none"
                onClick={() => { setAuthMode('REGISTER'); setCurrentView('AUTH'); }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <button 
                className={`w-8 h-8 flex items-center justify-center rounded bg-dark-surface hover:bg-dark-border text-white transition-colors ${currentView === 'PROFILE' ? 'border border-primary-500' : 'border border-transparent'}`}
                onClick={() => setCurrentView('PROFILE')}
                title="User Profile"
              >
                <User className="w-4 h-4" />
              </button>
              <button 
                className="w-8 h-8 flex items-center justify-center rounded bg-dark-surface hover:bg-dark-border text-white transition-colors border border-transparent"
                onClick={async () => { await logout(); setCurrentView('HOME'); }}
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

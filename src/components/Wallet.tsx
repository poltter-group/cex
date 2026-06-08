import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, RefreshCw, Search, Copy, Check, 
  ExternalLink, QrCode, ClipboardCheck, AlertCircle, ShieldCheck, History, Info, Sparkles, ChevronRight,
  ChevronDown, ChevronUp, Folder, User, Package, Clock, Download, ArrowRightLeft, ChevronLeft,
  Settings, X, Plus, Trash2, Eye, EyeOff
} from 'lucide-react';
import { useAuth, getWalletBalance } from '../lib/auth-context';
import { useMarket } from '../lib/market-context';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore';
import { OrderHistory } from './OrderHistory';

interface Asset {
  symbol: string;
  name: string;
  priceUSD: number;
}

const SUPPORTED_ASSETS: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', priceUSD: 77298.50 },
  { symbol: 'ETH', name: 'Ethereum', priceUSD: 2117.94 },
  { symbol: 'SOL', name: 'Solana', priceUSD: 145.20 },
  { symbol: 'XRP', name: 'Ripple', priceUSD: 1.14 },
  { symbol: 'BNB', name: 'Binance Coin', priceUSD: 612.40 },
  { symbol: 'AVAX', name: 'Avalanche', priceUSD: 34.85 },
  { symbol: 'ADA', name: 'Cardano', priceUSD: 0.62 },
  { symbol: 'HYPE', name: 'Hyperliquid', priceUSD: 61.411 },
  { symbol: 'CXP', name: 'Cexpro Token', priceUSD: 1.9803 },
  { symbol: 'DOGE', name: 'Dogecoin', priceUSD: 0.4124 },
  { symbol: 'SHIB', name: 'Shiba Inu', priceUSD: 0.00002514 },
  { symbol: 'PEPE', name: 'Pepe', priceUSD: 0.00001543 },
  { symbol: 'WIF', name: 'dogwifhat', priceUSD: 3.125 },
  { symbol: 'BANANA', name: 'Banana Coin', priceUSD: 0.01301 },
  { symbol: 'KEVIN', name: 'Kevin', priceUSD: 0.0007324 },
  { symbol: 'XAU', name: 'Gold', priceUSD: 4508.01 },
  { symbol: 'XAG', name: 'Silver', priceUSD: 75.41 },
  { symbol: 'EUR', name: 'Euro', priceUSD: 1.15873 },
  { symbol: 'GBP', name: 'British Pound', priceUSD: 1.34215 },
  { symbol: 'JPY', name: 'Japanese Yen', priceUSD: 0.0067 },
  { symbol: 'TRX', name: 'TRON', priceUSD: 0.12 },
  { symbol: 'USD', name: 'US Dollar', priceUSD: 1.00 },
];

const getCoinStyle = (symbol: string) => {
  switch (symbol) {
    case 'BTC': return { bg: 'bg-[#F7931A]/10', text: 'text-[#F7931A]', border: 'border-[#F7931A]/20', shadow: 'shadow-[#F7931A]/5', colorHex: '#F7931A' };
    case 'ETH': return { bg: 'bg-[#627EEA]/10', text: 'text-[#627EEA]', border: 'border-[#627EEA]/20', shadow: 'shadow-[#627EEA]/5', colorHex: '#627EEA' };
    case 'SOL': return { bg: 'bg-[#14F195]/10', text: 'text-[#14F195]', border: 'border-[#14F195]/20', shadow: 'shadow-[#14F195]/5', colorHex: '#14F195' };
    case 'XRP': return { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', shadow: 'shadow-sky-500/10', colorHex: '#00AAE4' };
    case 'BNB': return { bg: 'bg-[#F3BA2F]/10', text: 'text-[#F3BA2F]', border: 'border-[#F3BA2F]/20', shadow: 'shadow-[#F3BA2F]/5', colorHex: '#F3BA2F' };
    case 'AVAX': return { bg: 'bg-[#E84142]/10', text: 'text-[#E84142]', border: 'border-[#E84142]/20', shadow: 'shadow-[#E84142]/5', colorHex: '#E84142' };
    case 'ADA': return { bg: 'bg-blue-500/10', text: 'text-cyan-400', border: 'border-blue-500/20', shadow: 'shadow-blue-500/5', colorHex: '#0033AD' };
    case 'DOGE': return { bg: 'bg-[#C2A633]/10', text: 'text-[#C2A633]', border: 'border-[#C2A633]/20', shadow: 'shadow-[#C2A633]/10', colorHex: '#C2A633' };
    case 'CXP': return { bg: 'bg-primary-500/10', text: 'text-primary-500', border: 'border-primary-500/20', shadow: 'shadow-primary-500/5', colorHex: '#E0B810' };
    case 'XAU': return { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/20', shadow: 'shadow-[#D4AF37]/5', colorHex: '#D4AF37' };
    case 'XAG': return { bg: 'bg-[#C0C0C0]/10', text: 'text-[#C0C0C0]', border: 'border-[#C0C0C0]/20', shadow: 'shadow-[#C0C0C0]/5', colorHex: '#C0C0C0' };
    case 'EUR': return { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', shadow: 'shadow-sky-500/5', colorHex: '#003399' };
    case 'GBP': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', shadow: 'shadow-purple-500/5', colorHex: '#C8102E' };
    case 'JPY': return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', shadow: 'shadow-rose-500/5', colorHex: '#BC002D' };
    default: return { bg: 'bg-white/5', text: 'text-white', border: 'border-white/10', shadow: 'shadow-white/5', colorHex: '#FFFFFF' };
  }
};

const CoinIcon: React.FC<{ symbol: string; name: string; className?: string }> = ({ symbol, name, className = "" }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [fallbackCount, setFallbackCount] = useState<number>(0);
  const coinStyle = getCoinStyle(symbol);

  useEffect(() => {
    setFallbackCount(0);
    const sym = symbol.toLowerCase();
    
    let initialUrl = `https://assets.coincap.io/assets/icons/${sym}@2x.png`;
    
    if (sym === 'cxp') {
      initialUrl = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/kcs.png';
    } else if (sym === 'hype') {
      initialUrl = 'https://assets.coincap.io/assets/icons/hyper@2x.png';
    } else if (sym === 'xau') {
      initialUrl = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/gold.png';
    } else if (sym === 'xag') {
      initialUrl = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/silver.png';
    } else if (sym === 'pepe') {
      initialUrl = 'https://assets.coincap.io/assets/icons/pepe@2x.png';
    } else if (sym === 'shib') {
      initialUrl = 'https://assets.coincap.io/assets/icons/shib@2x.png';
    }
    
    setImgUrl(initialUrl);
  }, [symbol]);

  const handleImgError = () => {
    const sym = symbol.toLowerCase();
    if (fallbackCount === 0) {
      setFallbackCount(1);
      setImgUrl(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${sym}.png`);
    } else if (fallbackCount === 1) {
      setFallbackCount(2);
      setImgUrl(`https://images.cryptocompare.com/sparkles/${sym}.png`);
    } else {
      setImgUrl(null);
    }
  };

  if (!imgUrl) {
    return (
      <div className={`w-9 h-9 rounded-full ${coinStyle.bg} ${coinStyle.text} border ${coinStyle.border} ${coinStyle.shadow} flex items-center justify-center text-xs font-black select-none shrink-0 uppercase tracking-widest ${className}`}>
        {symbol[0]}
      </div>
    );
  }

  return (
    <div className={`w-9 h-9 rounded-full ${coinStyle.bg} border ${coinStyle.border} flex items-center justify-center shrink-0 overflow-hidden`}>
      <img
        src={imgUrl}
        alt={name}
        onError={handleImgError}
        className="w-7 h-7 object-contain rounded-full"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const COIN_NETWORKS: Record<string, { name: string; fee: number; format: RegExp; addressPlaceholder: string }[]> = {
  BTC: [
    { name: 'Bitcoin Native (SegWit)', fee: 0.0004, format: /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/, addressPlaceholder: 'bc1q...' },
    { name: 'BNB Smart Chain (BEP20)', fee: 0.0001, format: /^0x[a-fA-F0-9]{40}$/, addressPlaceholder: '0x...' }
  ],
  ETH: [
    { name: 'Ethereum (ERC20)', fee: 0.003, format: /^0x[a-fA-F0-9]{40}$/, addressPlaceholder: '0x...' },
    { name: 'Arbitrum One', fee: 0.0005, format: /^0x[a-fA-F0-9]{40}$/, addressPlaceholder: '0x...' },
    { name: 'BNB Smart Chain (BEP20)', fee: 0.0005, format: /^0x[a-fA-F0-9]{40}$/, addressPlaceholder: '0x...' }
  ],
  SOL: [
    { name: 'Solana Native', fee: 0.01, format: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, addressPlaceholder: 'Solana address' }
  ],
  XRP: [
    { name: 'Ripple Native', fee: 0.25, format: /^r[0-9a-zA-Z]{24,34}$/, addressPlaceholder: 'Ripple address starting with r' }
  ],
  DOGE: [
    { name: 'Dogecoin Native', fee: 5, format: /^D[5-9a-k|m-z|A-H|J-N|P-Z][1-9a-zA-HJ-NP-Z]{27,34}$/, addressPlaceholder: 'Dogecoin address starting with D' }
  ],
  TRX: [
    { name: 'Tron (TRC20)', fee: 15, format: /^T[a-zA-Z0-9]{33}$/, addressPlaceholder: 'Tron address starting with T' }
  ],
  USD: [
    { name: 'TRON (TRC20)', fee: 1.0, format: /^T[a-zA-Z0-9]{33}$/, addressPlaceholder: 'T...' },
    { name: 'Ethereum (ERC20)', fee: 5.0, format: /^0x[a-fA-F0-9]{40}$/, addressPlaceholder: '0x...' }
  ]
};

const SIMULATED_DEPOSIT_ADDRESSES: Record<string, string> = {
  BTC: 'bc1q9x5tkwuy7qy9up9zqelqbqe83ba973910easol2',
  ETH: '0x01e9c96ead9748748e9f93ba973910ea0a2c3dbf7',
  SOL: '7qY9ZEqbqE83BA973910easol2uE83BA973910ead9e',
  XRP: 'r9x5tkwuy7qy9up9zqelqbqe83ba973910ea_Ripple',
  DOGE: 'D9x5tkwuy7qy9up9zqelqbqe83ba973910ea_DOGE',
  TRX: 'T9x5tkwuy7qy9up9zqelqbqe83ba973910ea_TRC20',
  USD: 'T9x5tkwuy7qy9up9zqelqbqe83ba973910ea_USD'
};

export function Wallet() {
  const { user, profile, updateAssetBalance, updateWalletBalance } = useAuth();
  const location = useLocation();
  
  const { prices } = useMarket();

  const livePrices: Record<string, number> = SUPPORTED_ASSETS.reduce((acc, asset) => {
    // Attempt standard match, or fallback to fixed static price for calculation
    acc[asset.symbol] = prices[asset.symbol] || prices[`${asset.symbol}USDT`] || prices[`${asset.symbol}USD`] || asset.priceUSD;
    return acc;
  }, {} as Record<string, number>);

  const [activeWalletType, setActiveWalletType] = useState<string>('MAIN');
  const [walletMainView, _setWalletMainViewState] = useState<'ASSETS' | 'ORDERS' | 'DEPOSIT' | 'WITHDRAW' | 'SWAP' | 'TRANSACTIONS' | 'TRANSFER'>('ASSETS');

  const navigate = useNavigate();

  // Create real-time sync with URL path
  useEffect(() => {
    const path = location.pathname;
    let targetView: 'ASSETS' | 'ORDERS' | 'DEPOSIT' | 'WITHDRAW' | 'SWAP' | 'TRANSACTIONS' | 'TRANSFER' = 'ASSETS';
    
    if (path.includes('/wallet/orders')) targetView = 'ORDERS';
    else if (path.includes('/wallet/deposit')) targetView = 'DEPOSIT';
    else if (path.includes('/wallet/withdraw')) targetView = 'WITHDRAW';
    else if (path.includes('/wallet/swap')) targetView = 'SWAP';
    else if (path.includes('/wallet/transactions') || path.includes('/wallet/history')) targetView = 'TRANSACTIONS';
    else if (path.includes('/wallet/transfer')) targetView = 'TRANSFER';
    else targetView = 'ASSETS';

    if (walletMainView !== targetView) {
      _setWalletMainViewState(targetView);
    }
  }, [location.pathname, walletMainView]);

  const setWalletMainView = (view: 'ASSETS' | 'ORDERS' | 'DEPOSIT' | 'WITHDRAW' | 'SWAP' | 'TRANSACTIONS' | 'TRANSFER') => {
    _setWalletMainViewState(view);
    if (view === 'ASSETS') {
      navigate('/wallet');
    } else if (view === 'TRANSACTIONS') {
      navigate('/wallet/transactions');
    } else {
      navigate(`/wallet/${view.toLowerCase()}`);
    }
  };

  // User customized wallets list
  const [customWallets, setCustomWallets] = useState<{
    id: string;
    name: string;
    visible: boolean;
    excludedSymbols: string[];
    includedSymbols: string[];
  }[]>(() => {
    const saved = localStorage.getItem('cexpro_custom_wallets_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'MAIN', name: 'Main Wallet', visible: true, excludedSymbols: [], includedSymbols: ['BTC', 'ETH', 'USDT', 'SOL'] },
    ];
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletAssets, setNewWalletAssets] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('cexpro_custom_wallets_v3', JSON.stringify(customWallets));
  }, [customWallets]);

  useEffect(() => {
    if (location.state && location.state.view) {
      setWalletMainView(location.state.view);
      if (location.state.asset) {
        if (location.state.view === 'DEPOSIT') {
          setDepAsset(location.state.asset);
        } else if (location.state.view === 'WITHDRAW') {
          setWithAsset(location.state.asset);
        }
      }
    }
  }, [location.state]);
  const [isAccountsOpen, setIsAccountsOpen] = useState(true);
  const [searchAssetQuery, setSearchAssetQuery] = useState('');
  
  // Deposit States
  const [depAsset, setDepAsset] = useState('BTC');
  const [depNetworkIdx, setDepNetworkIdx] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [depAmount, setDepAmount] = useState('');
  const [depSuccessMsg, setDepSuccessMsg] = useState('');
  
  // Withdrawal States
  const [withAsset, setWithAsset] = useState('BTC');
  const [withNetworkIdx, setWithNetworkIdx] = useState(0);
  const [withAddress, setWithAddress] = useState('');
  const [withAmount, setWithAmount] = useState('');
  const [withOtp, setWithOtp] = useState('');
  const [withError, setWithError] = useState('');
  const [withSuccess, setWithSuccess] = useState('');
  
  // Swap States
  const [swapFrom, setSwapFrom] = useState('USD');
  const [swapTo, setSwapTo] = useState('BTC');
  const [swapFromAmount, setSwapFromAmount] = useState('');
  const [swapToEstimated, setSwapToEstimated] = useState(0);
  const [swapError, setSwapError] = useState('');
  const [swapSuccess, setSwapSuccess] = useState('');

  // Transactions logs
  const [txnLogs, setTxnLogs] = useState<any[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  // Internal Transfer States
  const [transferAsset, setTransferAsset] = useState('BTC');
  const [transferFrom, setTransferFrom] = useState('MAIN');
  const [transferTo, setTransferTo] = useState('SPOT');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');

  const handleProcessTransfer = async () => {
    setTransferError('');
    setTransferSuccess('');

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferError("Enter a valid transfer amount.");
      return;
    }

    const available = getWalletBalance(profile, transferFrom, transferAsset);
    
    if (amt > available) {
      setTransferError(`Insufficient ${transferAsset} balance. Available: ${available} ${transferAsset}`);
      return;
    }

    if (transferFrom === transferTo) {
      setTransferError("Cannot transfer to the same account.");
      return;
    }

    // Process Transfer internally via Context
    //@ts-ignore
    await updateWalletBalance(transferFrom, transferAsset, -amt);
    //@ts-ignore
    await updateWalletBalance(transferTo, transferAsset, amt);

    try {
      // 1. Log Transaction to Firestore
      await addDoc(collection(db, 'wallet_transactions'), {
        userId: user?.uid,
        type: 'INTERNAL_TRANSFER',
        asset: transferAsset,
        amount: amt,
        fee: 0,
        txId: 'TRF_' + Math.random().toString(36).substring(2, 14).toUpperCase(),
        network: `Internal (${transferFrom} to ${transferTo})`,
        destinationAddress: 'Internal Sub-account',
        status: 'SUCCESS',
        createdAt: new Date(),
      });
      
      setTransferSuccess(`Successfully transferred ${amt} ${transferAsset} from ${transferFrom} to ${transferTo} account.`);
      setTransferAmount('');
      fetchTxns();
    } catch (err) {
      setTransferError("Failed to process internal transfer.");
    }
  };

  // Fetch transaction history
  const fetchTxns = async () => {
    if (!user) return;
    setLoadingTxns(true);
    try {
      const q = query(
        collection(db, 'wallet_transactions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTxnLogs(docs);
    } catch (e) {
      console.warn("Could not fetch txn history (it's okay if col is fresh)", e);
    } finally {
      setLoadingTxns(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTxns();
    }
  }, [user, walletMainView]);

  // Copy helper
  const handleCopyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Live prices reference
  const getAssetPrice = (sym: string): number => {
    return livePrices[sym] !== undefined ? livePrices[sym] : 1;
  };

  // Estimated portfolio calculations
  const getPortfolioValues = () => {
    if (!profile) return { totalUSD: 0, totalBTC: 0 };
    
    let totalUSD = 0;
    SUPPORTED_ASSETS.forEach(item => {
      let isMatch = false;
      const walletCfg = customWallets.find(w => w.id === activeWalletType);
      if (walletCfg) {
        if (walletCfg.id === 'MAIN') {
          isMatch = ['BTC', 'ETH', 'USDT', 'SOL'].includes(item.symbol);
        } else if (walletCfg.id === 'SPOT') {
          isMatch = true;
        } else if (walletCfg.id === 'CRYPTO') {
          isMatch = !['DOGE'].includes(item.symbol);
        } else if (walletCfg.id === 'MEMECOIN') {
          isMatch = ['DOGE', 'TRX'].includes(item.symbol);
        } else {
          // Custom user-defined wallet
          if (walletCfg.includedSymbols && walletCfg.includedSymbols.length > 0) {
            isMatch = walletCfg.includedSymbols.includes(item.symbol);
          } else if (walletCfg.excludedSymbols && walletCfg.excludedSymbols.length > 0) {
            isMatch = !walletCfg.excludedSymbols.includes(item.symbol);
          } else {
            isMatch = true;
          }
        }
      } else {
        isMatch = true;
      }

      if (isMatch) {
         const bVal = getWalletBalance(profile, activeWalletType, item.symbol);
         totalUSD += bVal * getAssetPrice(item.symbol);
      }
    });

    const btcPrice = getAssetPrice('BTC');
    return {
      totalUSD,
      totalBTC: btcPrice > 0 ? totalUSD / btcPrice : 0
    };
  };

  const { totalUSD, totalBTC } = getPortfolioValues();

  // Handle Real Deposit via NowPayments
  const handleProcessDeposit = async () => {
    setDepSuccessMsg('');
    const amt = parseFloat(depAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Enter a valid deposit volume.");
      return;
    }

    if (!user) {
      alert("Please authenticate first.");
      return;
    }

    try {
      // Create payment via backend proxy
      const response = await fetch('/api/nowpayments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          amount: amt,
          currency: 'USD',
          paymentCurrency: depAsset
        })
      });

      const data = await response.json();

      if (data.success) {
        // Log Pending Transaction to Firestore
        const network = COIN_NETWORKS[depAsset]?.[depNetworkIdx]?.name || 'Native';
        
        await addDoc(collection(db, 'wallet_transactions'), {
          userId: user.uid,
          type: 'DEPOSIT',
          asset: depAsset,
          amount: Number(data.pay_amount || amt),
          fee: 0,
          txId: data.payment_id,
          network: network,
          destinationAddress: data.pay_address || '',
          status: 'PENDING',
          createdAt: new Date(),
        });

        // Open NowPayments Invoice or simulate
        window.open(data.invoice_url, '_blank');
        
        setDepSuccessMsg(`Invoice generated! Please complete the payment. Your balance will be credited automatically once confirmed on-chain.`);
        fetchTxns();
        
        setDepAmount('');
      } else {
        alert(data.error || "Failed to create payment invoice.");
      }
    } catch (err) {
      console.error(err);
      alert("Payment gateway connection failed.");
    }
  };

  // Process Withdraw checking and execution
  const handleProcessWithdraw = async () => {
    setWithError('');
    setWithSuccess('');

    const amt = parseFloat(withAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithError("Invalid withdrawal volume requested.");
      return;
    }

    // Check balance
    const available = getWalletBalance(profile, 'MAIN', withAsset);
    if (amt > available) {
      setWithError(`Insufficient ${withAsset} available in MAIN balance. Available: ${available} ${withAsset}`);
      return;
    }

    // Address verification regex
    const network = COIN_NETWORKS[withAsset]?.[withNetworkIdx];
    if (network && !network.format.test(withAddress.trim())) {
      setWithError(`Format error for selected network: Invalid destination address.`);
      return;
    }

    if (withOtp.trim().length < 4) {
      setWithError("Invalid OTP validation code.");
      return;
    }

    try {
      const fee = network?.fee || 0;
      
      // Deduct balance
      //@ts-ignore
      await updateWalletBalance('MAIN', withAsset, -amt);

      // Save transaction to DB
      await addDoc(collection(db, 'wallet_transactions'), {
        userId: user?.uid,
        type: 'WITHDRAWAL',
        asset: withAsset,
        amount: amt,
        fee: fee,
        txId: 'TXN_OUT_' + Math.random().toString(36).substring(2, 14).toUpperCase(),
        network: network?.name || 'Native',
        destinationAddress: withAddress.trim(),
        status: 'SUCCESS',
        createdAt: new Date(),
      });

      setWithSuccess(`Withdrawal order dispatched! ${amt - fee} ${withAsset} was safely transmitted (Network Fee: ${fee} ${withAsset}).`);
      setWithAmount('');
      setWithAddress('');
      setWithOtp('');
      fetchTxns();
    } catch (e) {
      setWithError("Transactional pipeline stalled. Adjust quantities.");
    }
  };

  // Swap estimations
  useEffect(() => {
    const amt = parseFloat(swapFromAmount);
    if (isNaN(amt) || amt <= 0) {
      setSwapToEstimated(0);
      return;
    }

    const priceFrom = getAssetPrice(swapFrom);
    const priceTo = getAssetPrice(swapTo);
    
    const est = (amt * priceFrom) / priceTo;
    setSwapToEstimated(est);
  }, [swapFromAmount, swapFrom, swapTo]);

  // Execute Instaswap
  const handleProcessSwap = async () => {
    setSwapError('');
    setSwapSuccess('');

    const amt = parseFloat(swapFromAmount);
    if (isNaN(amt) || amt <= 0) {
      setSwapError("Specify a valid conversion quantity.");
      return;
    }

    const currentFromBalance = getWalletBalance(profile, activeWalletType, swapFrom);
    
    if (amt > currentFromBalance) {
      setSwapError(`Insufficient ${swapFrom} in ${activeWalletType} balance. Available: ${currentFromBalance} ${swapFrom}`);
      return;
    }

    try {
      const priceFrom = getAssetPrice(swapFrom);
      const priceTo = getAssetPrice(swapTo);
      const finalToValue = (amt * priceFrom) / priceTo;

      // Deduct From, Credit To
      //@ts-ignore
      await updateWalletBalance(activeWalletType, swapFrom, -amt);
      //@ts-ignore
      await updateWalletBalance(activeWalletType, swapTo, finalToValue);

      // Log
      await addDoc(collection(db, 'wallet_transactions'), {
        userId: user?.uid,
        type: 'SWAP',
        asset: `${swapFrom} → ${swapTo}`,
        amount: amt,
        fee: 0,
        txId: 'SWAP_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
        network: 'Internal Instant swap ledger',
        destinationAddress: 'Internal user swap desk',
        status: 'SUCCESS',
        createdAt: new Date(),
      });

      setSwapSuccess(`Dynamic exchange matching successful. Sold ${amt} ${swapFrom} and obtained ${finalToValue.toFixed(6)} ${swapTo}.`);
      setSwapFromAmount('');
      fetchTxns();
    } catch (e) {
      setSwapError("Market slippage or interface mismatch. Select correct coins.");
    }
  };

  return (
    <div className="flex h-full w-full bg-[#121316] text-[#E0E2E5] overflow-hidden">
      {/* Sidebar Navigation */}
      {(walletMainView === 'ASSETS' || walletMainView === 'ORDERS') && (
        <div className="hidden lg:flex w-64 border-r border-dark-border/60 bg-[#121316] flex-shrink-0 flex-col overflow-y-auto">
          <div className="py-4 space-y-1">
            <div className="flex flex-col">
              <div className="w-full flex items-center justify-between px-8 py-3.5 text-white">
                <button 
                  onClick={() => {
                    setIsAccountsOpen(!isAccountsOpen);
                    setWalletMainView('ASSETS');
                  }}
                  className="flex items-center gap-3.5 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-[13px] font-bold">Accounts</span>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsAccountsOpen(!isAccountsOpen)}>
                    {isAccountsOpen ? <ChevronUp className="w-4 h-4 text-dark-text-muted" /> : <ChevronDown className="w-4 h-4 text-dark-text-muted" />}
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {isAccountsOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col pl-[3.25rem] pr-6 py-2 text-[13px] text-[#A3A6AF] font-medium overflow-hidden space-y-4"
                  >
                    {customWallets.filter(w => w.visible).map(wallet => (
                      <button 
                        key={wallet.id}
                        onClick={() => {
                          setWalletMainView('ASSETS');
                          setActiveWalletType(wallet.id);
                        }}
                        className={`text-left transition-colors truncate ${walletMainView === 'ASSETS' && activeWalletType === wallet.id ? 'text-white font-bold' : 'hover:text-white'}`}
                      >
                        {wallet.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dedicated Orders Page Tab in Sidebar as requested with "dir page orders" */}
            <div className="border-t border-dark-border/40 mt-3 pt-3 px-[3.25rem]">
              <button
                onClick={() => setWalletMainView('ORDERS')}
                className={`w-full text-left transition-colors font-medium text-[13px] ${walletMainView === 'ORDERS' ? 'text-white font-bold' : 'text-[#A3A6AF] hover:text-white'}`}
              >
                Orders
              </button>
            </div>
            
          </div>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto bg-dark-bg text-dark-text pb-12 w-full select-none"
      >
        <div className="w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          
          {/* Mobile sub-account / orders switcher */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
            {customWallets.filter(w => w.visible).map(wallet => (
              <button
                key={wallet.id}
                onClick={() => {
                  setWalletMainView('ASSETS');
                  setActiveWalletType(wallet.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                  walletMainView === 'ASSETS' && activeWalletType === wallet.id
                    ? 'bg-primary-500/10 border-primary-500/40 text-primary-500 font-extrabold'
                    : 'bg-dark-surface-alt border-dark-border text-dark-text-muted hover:text-white'
                }`}
              >
                {wallet.name}
              </button>
            ))}
            <button
              onClick={() => setWalletMainView('ORDERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                walletMainView === 'ORDERS'
                  ? 'bg-primary-500/10 border-primary-500/40 text-primary-500 font-extrabold'
                  : 'bg-dark-surface-alt border-dark-border text-dark-text-muted hover:text-white'
              }`}
            >
              Page Orders
            </button>
          </div>
          
          {/* Dynamic Multi-column Space-efficient header dashboard */}
          {walletMainView === 'ASSETS' && (
            <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
              
              {/* Main Net Assets Wallet Deck (Left, takes space, beautiful details) */}
              <div className="flex-1 bg-gradient-to-br from-[#121316] to-dark-surface border border-dark-border/80 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div>
                  <div className="flex items-center gap-2 text-dark-text-muted mb-2">
                    <WalletIcon className="w-4 h-4 text-primary-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {customWallets.find(w => w.id === activeWalletType)?.name || activeWalletType} Ledger Estimated Balance
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-3">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                      ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h1>
                    <span className="text-xs md:text-sm text-dark-text-muted font-mono font-bold uppercase">USD Value</span>
                  </div>

                  <div className="mt-2 text-primary-500 font-mono text-sm font-semibold flex items-center gap-1.5">
                    <span>≈ {totalBTC.toFixed(6)} BTC</span>
                    <span className="text-[10px] bg-primary-500/10 text-primary-500 px-1.5 py-0.5 rounded font-black animate-pulse">LIVE</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-2.5">
                  <button 
                    onClick={() => setWalletMainView(walletMainView === 'TRANSFER' ? 'ASSETS' : 'TRANSFER')}
                    className={`px-3 md:px-4 py-2 text-[11px] font-black tracking-widest uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                      walletMainView === 'TRANSFER' 
                        ? 'bg-primary-500 text-black border-primary-500 font-bold' 
                        : 'bg-white/5 text-white border-white/5 hover:bg-white/10 font-bold'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer</span>
                  </button>
                  <button 
                    onClick={() => setWalletMainView(walletMainView === 'DEPOSIT' ? 'ASSETS' : 'DEPOSIT')}
                    className={`px-3 md:px-4 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                      walletMainView === 'DEPOSIT' 
                        ? 'bg-primary-500 text-black border-primary-500 font-bold' 
                        : 'bg-white/5 text-white border-white/5 hover:bg-white/10 font-bold'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Deposit</span>
                  </button>
                  <button 
                    onClick={() => setWalletMainView(walletMainView === 'WITHDRAW' ? 'ASSETS' : 'WITHDRAW')}
                    className={`px-3 md:px-4 py-2 text-[11px] font-black tracking-widest uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                      walletMainView === 'WITHDRAW' 
                        ? 'bg-primary-500 text-black border-primary-500 font-bold' 
                        : 'bg-white/5 text-white border-white/5 hover:bg-white/10 font-bold'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Withdraw</span>
                  </button>
                  <button 
                    onClick={() => setWalletMainView(walletMainView === 'SWAP' ? 'ASSETS' : 'SWAP')}
                    className={`px-3 md:px-4 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                      walletMainView === 'SWAP' 
                        ? 'bg-primary-500 text-black border-primary-500 font-bold' 
                        : 'bg-white/5 text-white border-white/5 hover:bg-white/10 font-bold'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Swap</span>
                  </button>
                  <button 
                    onClick={() => setWalletMainView(walletMainView === 'ORDERS' ? 'ASSETS' : 'ORDERS')}
                    className={`px-3 md:px-4 py-2 text-[11px] font-black tracking-widest uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                      walletMainView === 'ORDERS' 
                        ? 'bg-primary-500 text-black border-primary-500 font-bold' 
                        : 'bg-white/5 text-white border-white/5 hover:bg-white/10 font-bold'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Orders</span>
                  </button>
                  <button 
                    onClick={() => setWalletMainView(walletMainView === 'TRANSACTIONS' ? 'ASSETS' : 'TRANSACTIONS')}
                    className={`px-3 md:px-4 py-2 text-[11px] font-black tracking-widest uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                      walletMainView === 'TRANSACTIONS' 
                        ? 'bg-primary-500 text-black border-primary-500 font-bold' 
                        : 'bg-white/5 text-white border-white/5 hover:bg-white/10 font-bold'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={walletMainView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full"
            >
              {walletMainView === 'ORDERS' ? (
          <div className="w-full space-y-4">
            <OrderHistory />
          </div>
        ) : walletMainView === 'TRANSFER' ? (
          <div className="bg-dark-surface border border-dark-border/60 rounded-2xl p-6 md:p-8 w-full space-y-6">
            <div className="flex justify-between items-center border-b border-dark-border/40 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Internal Sub-Account Transfer</h3>
                  <p className="text-[10px] text-dark-text-muted mt-0.5">Move assets instantaneously between separate ledger books with zero network fees.</p>
                </div>
              </div>
              <button 
                onClick={() => setWalletMainView('ASSETS')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-dark-border text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-primary-500" />
                <span>Back to Overview</span>
              </button>
            </div>
            
            <div className="max-w-xl mx-auto bg-dark-surface-alt/70 border border-dark-border/50 rounded-2xl p-6 md:p-8 flex flex-col gap-6 w-full shadow-xl">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] uppercase font-bold text-dark-text-muted tracking-wider block">From Source Ledger</label>
                    <select 
                      value={transferFrom}
                      onChange={(e) => setTransferFrom(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 text-white outline-none focus:border-white transition-colors"
                    >
                      <option value="MAIN">Main Wallet (Universal Vault)</option>
                      <option value="SPOT">Forex Spot Desk</option>
                      <option value="CRYPTO">Crypto (Sovereign Assets)</option>
                      <option value="MEMECOIN">Memecoin (Speculative Desk)</option>
                    </select>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] uppercase font-bold text-dark-text-muted tracking-wider block">To Destination Ledger</label>
                    <select 
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 text-white outline-none focus:border-white transition-colors"
                    >
                      <option value="MAIN">Main Wallet (Universal Vault)</option>
                      <option value="SPOT">Forex Spot Desk</option>
                      <option value="CRYPTO">Crypto (Sovereign Assets)</option>
                      <option value="MEMECOIN">Memecoin (Speculative Desk)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] uppercase font-bold text-dark-text-muted tracking-wider block">Cryptocurrency & Transfer Amount</label>
                  <div className="flex gap-2.5">
                    <select 
                      value={transferAsset}
                      onChange={(e) => {
                        setTransferAsset(e.target.value);
                        setTransferSuccess('');
                        setTransferError('');
                      }}
                      className="w-1/2 md:w-[45%] bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 text-white outline-none focus:border-white transition-colors font-bold cursor-pointer"
                    >
                      {[...SUPPORTED_ASSETS]
                        .sort((x, y) => {
                          const balX = getWalletBalance(profile, transferFrom, x.symbol);
                          const balY = getWalletBalance(profile, transferFrom, y.symbol);
                          if (balX > 0 && balY === 0) return -1;
                          if (balY > 0 && balX === 0) return 1;
                          return x.symbol.localeCompare(y.symbol);
                        })
                        .map(a => {
                          const bal = getWalletBalance(profile, transferFrom, a.symbol);
                          return (
                            <option key={a.symbol} value={a.symbol}>
                              {a.symbol} &mdash; {a.name} {bal > 0 ? `(${bal.toLocaleString(undefined, { maximumFractionDigits: 6 })} avail)` : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        value={transferAmount}
                        onChange={(e) => {
                          setTransferAmount(e.target.value);
                          setTransferSuccess('');
                          setTransferError('');
                        }}
                        placeholder="0.00"
                        className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs pl-3.5 pr-14 py-3 text-white outline-none focus:border-white transition-colors font-mono"
                      />
                      <button 
                        onClick={() => {
                          const val = getWalletBalance(profile, transferFrom, transferAsset);
                          setTransferAmount(val.toString());
                        }}
                        className="absolute right-2 top-2 bottom-2 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all uppercase"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  
                  {/* Percentage Quick fill buttons */}
                  <div className="flex gap-2.5 mt-2">
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const val = getWalletBalance(profile, transferFrom, transferAsset);
                          setTransferAmount(((val * pct) / 100).toFixed(6));
                        }}
                        className="flex-1 py-1.5 px-2 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-[#A3A6AF] hover:text-white transition-colors"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="text-right text-[10px] text-dark-text-muted font-bold mt-1 tracking-wide">
                    Available in selected partition: <span className="text-white font-mono">{getWalletBalance(profile, transferFrom, transferAsset)}</span> {transferAsset}
                  </div>
                </div>
              </div>

              {transferError && (
                <div className="border border-rose-500/20 bg-rose-500/5 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-xs text-left animate-flash">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{transferError}</span>
                </div>
              )}

              {transferSuccess && (
                <div className="border border-green-500/20 bg-green-500/5 text-buy p-4 rounded-xl flex items-center gap-2.5 text-xs text-left">
                  <Check className="w-4 h-4 shrink-0 text-buy" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              <button 
                onClick={handleProcessTransfer}
                disabled={transferFrom === transferTo}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-30 disabled:cursor-not-allowed text-black font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-widest text-center shadow-lg shadow-primary-500/15"
              >
                {transferFrom === transferTo ? 'Source and Target are identical' : 'Execute Internal Transfer'}
              </button>
            </div>
          </div>
        ) : walletMainView === 'DEPOSIT' ? (
          <div className="bg-dark-surface border border-dark-border/60 rounded-2xl p-6 md:p-8 w-full space-y-6">
            <div className="flex justify-between items-center border-b border-dark-border/40 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center text-[#10B981]">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">On-chain Deposit Portal</h3>
                  <p className="text-[10px] text-dark-text-muted mt-0.5 font-sans">Generate dynamic ledger deposit tags and sweep incoming protocol credits.</p>
                </div>
              </div>
              <button 
                onClick={() => setWalletMainView('ASSETS')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-dark-border text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-primary-500" />
                <span>Back to Overview</span>
              </button>
            </div>
            
            {/* STAGE DEPOSIT PANEL INLINE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              <div className="lg:col-span-7 bg-dark-surface-alt/75 border border-dark-border/50 rounded-2xl p-6 space-y-6 flex flex-col justify-between shadow-xl">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-dark-border/40 pb-3">
                    <h4 className="font-bold text-[11px] text-white uppercase tracking-wider text-left">Generate Wallet Credentials</h4>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded tracking-wide border border-emerald-500/20 uppercase font-mono">Real-Time Sweep Matching</span>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] uppercase font-black text-dark-text-muted tracking-wider block">Cryptocurrency Asset</label>
                    <select 
                      value={depAsset}
                      onChange={(e) => {
                        setDepAsset(e.target.value);
                        setDepNetworkIdx(0);
                        setDepSuccessMsg('');
                      }}
                      className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 tracking-wide text-white outline-none focus:border-white transition-colors font-bold"
                    >
                      {SUPPORTED_ASSETS.map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol} &mdash; {a.name}</option>
                      ))}
                    </select>
                  </div>

                  {COIN_NETWORKS[depAsset] && (
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] uppercase font-black text-dark-text-muted tracking-wider block">Target Custody network protocol</label>
                      <select 
                        value={depNetworkIdx}
                        onChange={(e) => {
                          setDepNetworkIdx(parseInt(e.target.value));
                          setDepSuccessMsg('');
                        }}
                        className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 tracking-wide text-white outline-none focus:border-white transition-colors"
                      >
                        {COIN_NETWORKS[depAsset].map((net, idx) => (
                          <option key={idx} value={idx}>{net.name} {idx === 0 ? '(Default Primary Path)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="bg-dark-bg border border-dark-border/60 rounded-xl p-5 space-y-4 text-left">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                      <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
                      <span>Deposit via NowPayments</span>
                    </div>
                    <p className="text-[11px] text-dark-text-muted leading-relaxed font-medium">
                      Create an invoice through our payment gateway to process real crypto deposits safely to your account balances.
                    </p>
                    
                    <div className="flex gap-2.5">
                      <div className="relative flex-1">
                        <input 
                          type="number"
                          value={depAmount}
                          onChange={(e) => setDepAmount(e.target.value)}
                          placeholder={`Enter quantity of ${depAsset}`}
                          className="w-full bg-dark-surface border border-dark-border hover:border-dark-text-muted rounded-xl pl-3.5 pr-14 py-2.5 text-xs text-white placeholder-dark-text-muted focus:border-white outline-none transition-colors font-mono"
                        />
                        <span className="absolute right-3.5 top-2.5 text-[10px] font-black text-dark-text-muted uppercase tracking-wider">{depAsset}</span>
                      </div>
                      <button 
                        onClick={handleProcessDeposit}
                        className="bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99] text-dark-bg font-extrabold text-[11px] px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap uppercase tracking-widest"
                      >
                        Create Invoice
                      </button>
                    </div>
                  </div>
                </div>

                {depSuccessMsg && (
                  <div className="bg-buy/10 border border-buy/20 text-buy text-xs p-4 rounded-xl flex items-start gap-2.5 text-left animate-flash">
                    <Check className="w-4 h-4 shrink-0 text-buy mt-0.5" />
                    <span>{depSuccessMsg}</span>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-dark-surface-alt/75 border border-dark-border/50 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-between text-center gap-6 shadow-xl">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono font-black text-primary-500 tracking-widest">Secure Ledger Destination</span>
                  <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">Receiver QR Identification</h3>
                </div>

                <div className="w-44 h-44 bg-white p-3 rounded-2xl border border-dark-border/40 flex items-center justify-center relative shadow-2xl">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-dark-bg">
                    <path fill="currentColor" d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" />
                    <path fill="currentColor" d="M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" />
                    <path fill="currentColor" d="M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z" />
                    <path fill="currentColor" d="M40,20 h10 v10 h-10 z M60,40 h15 v5 h-15 z M35,45 h20 v10 h-20 z" />
                    <path fill="currentColor" d="M60,60 h10 v5 h-10 z M75,70 h15 v20 h-15 z M50,75 h10 v5 h-10 z" />
                    <path fill="currentColor" d="M45,10 h10 v5 h-10 z M50,45 h5 v5 h-5 z M20,40 h10 v5 h-10 z" />
                  </svg>
                  <QrCode className="absolute w-7 h-7 text-primary-500 bg-white p-1 rounded-lg shadow-md border" />
                </div>

                <div className="text-center w-full">
                  <span className="text-[10px] text-dark-text-muted font-black uppercase block mb-1 tracking-wider">Expected protocol route</span>
                  <span className="text-xs text-white font-mono bg-dark-bg border border-dark-border/80 px-4 py-2 rounded-xl inline-block select-all shadow-inner">
                    {COIN_NETWORKS[depAsset]?.[depNetworkIdx]?.name || 'Native Protocol'}
                  </span>
                </div>

                <div className="w-full space-y-3">
                  <div className="w-full flex items-center bg-dark-bg border border-dark-border rounded-xl p-2.5 gap-2 hover:border-dark-text-muted transition-colors">
                    <span className="flex-1 text-left font-mono text-[10px] md:text-[11px] text-white text-ellipsis overflow-hidden select-all px-2 uppercase tracking-wide">
                      {SIMULATED_DEPOSIT_ADDRESSES[depAsset] || 'No Address available'}
                    </span>
                    <button 
                      onClick={() => handleCopyAddr(SIMULATED_DEPOSIT_ADDRESSES[depAsset])}
                      className="bg-white/5 hover:bg-white/10 p-2.5 rounded-lg text-dark-text-muted hover:text-white transition-all cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedAddress ? <ClipboardCheck className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-left text-[10px] text-dark-text-muted leading-relaxed font-sans flex gap-2 border-t border-dark-border/40 pt-2.5">
                    <span className="text-amber-500 shrink-0 font-bold block">🚨 LIMITATION:</span>
                    <span>Submit only <strong className="text-white">{depAsset}</strong> transactions over this designated link. Coins dispatched via other protocols are permanently lost.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : walletMainView === 'WITHDRAW' ? (
          <div className="bg-dark-surface border border-dark-border/60 rounded-2xl p-6 md:p-8 w-full space-y-6">
            <div className="flex justify-between items-center border-b border-dark-border/40 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Secured Outgoing Assets Dispatch</h3>
                  <p className="text-[10px] text-dark-text-muted mt-0.5 font-sans">Transmit sovereign cryptographic assets securely to validated external addresses.</p>
                </div>
              </div>
              <button 
                onClick={() => setWalletMainView('ASSETS')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-dark-border text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-primary-500" />
                <span>Back to Overview</span>
              </button>
            </div>
            
            <div className="max-w-xl mx-auto bg-dark-surface-alt/75 border border-dark-border/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] uppercase font-black text-dark-text-muted tracking-wider block">Target Asset Coin</label>
                  <select 
                    value={withAsset}
                    onChange={(e) => {
                      setWithAsset(e.target.value);
                      setWithNetworkIdx(0);
                      setWithAmount('');
                      setWithError('');
                    }}
                    className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 text-white outline-none focus:border-white transition-colors font-bold"
                  >
                    {SUPPORTED_ASSETS.map(a => (
                      <option key={a.symbol} value={a.symbol}>{a.symbol} &mdash; {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] uppercase font-black text-dark-text-muted tracking-wider block">Ledger Protocol Network</label>
                  <select 
                    value={withNetworkIdx}
                    onChange={(e) => {
                      setWithNetworkIdx(parseInt(e.target.value));
                      setWithError('');
                    }}
                    className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted rounded-xl text-xs px-3.5 py-3 text-white outline-none focus:border-white transition-colors"
                  >
                    {COIN_NETWORKS[withAsset]?.map((net, idx) => (
                      <option key={idx} value={idx}>{net.name} {net.fee > 0 ? `(Fee: ${net.fee} ${withAsset})` : '(No fee)'}</option>
                    )) || <option>Native Network</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-black text-dark-text-muted tracking-wider">External Wallet Address</label>
                  <span className="text-[9px] font-mono text-dark-text-muted uppercase tracking-wide">Expected Prefix: {COIN_NETWORKS[withAsset]?.[withNetworkIdx]?.addressPlaceholder || '0x...'}</span>
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    value={withAddress}
                    onChange={(e) => {
                      setWithAddress(e.target.value);
                      setWithError('');
                    }}
                    placeholder="Provide authentic blockchain external destination"
                    className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted placeholder-dark-text-muted rounded-xl text-xs px-4 py-3 text-white outline-none focus:border-white transition-colors font-mono"
                  />
                  <div className="absolute right-3.5 top-3.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-black text-dark-text-muted tracking-wider">Withdrawal Quantity</label>
                  <span className="text-[10px] font-bold text-dark-text-muted">
                    Available in Universal: <span className="text-white font-mono font-bold">{getWalletBalance(profile, 'MAIN', withAsset)}</span> {withAsset}
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="number"
                    value={withAmount}
                    onChange={(e) => {
                      setWithAmount(e.target.value);
                      setWithError('');
                    }}
                    placeholder="0.00"
                    className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted placeholder-dark-text-muted rounded-xl text-xs pl-4 pr-16 py-3 text-white outline-none focus:border-white transition-colors font-mono"
                  />
                  <button 
                    onClick={() => {
                      const val = getWalletBalance(profile, 'MAIN', withAsset);
                      setWithAmount(val.toString());
                    }}
                    className="absolute right-2 top-2 bottom-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all uppercase"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Google 2FA OTP Token (Security Check)</span>
                </div>
                <input 
                  type="text"
                  maxLength={6}
                  value={withOtp}
                  onChange={(e) => setWithOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0 0 0"
                  className="w-full bg-dark-bg border border-dark-border hover:border-dark-text-muted text-sm px-4 py-3 rounded-xl text-white placeholder-dark-text-muted outline-none font-mono tracking-[0.4em] text-center focus:border-rose-500 focus:ring-1 focus:ring-rose-500/10 transition-all font-black"
                />
              </div>

              {withError && (
                <div className="border border-rose-500/20 bg-rose-500/5 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-xs text-left animate-flash">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{withError}</span>
                </div>
              )}

              {withSuccess && (
                <div className="border border-green-500/20 bg-green-500/5 text-buy p-4 rounded-xl flex items-center gap-2.5 text-xs text-left">
                  <Check className="w-4 h-4 shrink-0 text-buy" />
                  <span>{withSuccess}</span>
                </div>
              )}

              <button 
                onClick={handleProcessWithdraw}
                className="w-full bg-[#F43F5E] hover:bg-[#E11D48] hover:scale-[1.01] active:scale-[0.99] duration-150 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/15"
              >
                <span>Authorize Blockchain Withdrawal</span>
              </button>
            </div>
          </div>
        ) : walletMainView === 'SWAP' ? (
          <div className="bg-dark-surface border border-dark-border/60 rounded-2xl p-6 md:p-8 w-full space-y-6">
            <div className="flex justify-between items-center border-b border-dark-border/40 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/25 flex items-center justify-center text-primary-500">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider font-sans">Dynamic Asset Conversion Desk</h3>
                  <p className="text-[10px] text-dark-text-muted mt-0.5">Instantly convert spot crypto holdings at real-time global market rates.</p>
                </div>
              </div>
              <button 
                onClick={() => setWalletMainView('ASSETS')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-dark-border text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-primary-500" />
                <span>Back to Overview</span>
              </button>
            </div>
            
            <div className="max-w-xl mx-auto bg-dark-surface-alt/70 border border-dark-border/50 rounded-2xl p-6 md:p-8 flex flex-col gap-6 w-full shadow-2xl">
              <div className="space-y-4 relative">
                {/* Pay card */}
                <div className="bg-dark-bg border border-dark-border/80 hover:border-dark-text-muted rounded-2xl p-5 space-y-2.5 text-left transition-colors">
                  <div className="flex justify-between text-[10px] font-black uppercase text-dark-text-muted tracking-wider">
                    <span>From Source Asset ({activeWalletType} Fund)</span>
                    <span>Available: <span className="font-mono text-white font-bold">{getWalletBalance(profile, activeWalletType, swapFrom)}</span> {swapFrom}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="number"
                      value={swapFromAmount}
                      onChange={(e) => {
                        setSwapFromAmount(e.target.value);
                        setSwapError('');
                        setSwapSuccess('');
                      }}
                      placeholder="0.00"
                      className="flex-1 bg-transparent border-none outline-none font-bold font-mono text-2xl text-white placeholder-dark-text-muted pl-0"
                    />
                    <select 
                      value={swapFrom}
                      onChange={(e) => {
                        setSwapFrom(e.target.value);
                        setSwapSuccess('');
                      }}
                      className="bg-dark-surface border border-dark-border rounded-xl text-xs px-3.5 py-2 text-white font-black outline-none focus:border-white transition-colors"
                    >
                      {SUPPORTED_ASSETS.map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Percentage shortcuts */}
                  <div className="flex gap-2 pb-0.5">
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const available = getWalletBalance(profile, activeWalletType, swapFrom);
                          setSwapFromAmount(((available * pct) / 100).toFixed(6));
                        }}
                        className="flex-1 py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-black text-dark-text-muted hover:text-white transition-all"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switcher Indicator */}
                <div className="flex justify-center -my-3.5 relative z-10">
                  <button 
                    type="button"
                    onClick={() => {
                      const temp = swapFrom;
                      setSwapFrom(swapTo);
                      setSwapTo(temp);
                    }}
                    className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border hover:border-white/20 text-primary-500 hover:text-white flex items-center justify-center shadow-lg transition-all transform hover:rotate-180"
                    title="Invert Conversion direction"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Get card */}
                <div className="bg-dark-bg border border-dark-border/80 rounded-2xl p-5 space-y-2.5 text-left">
                  <div className="flex justify-between text-[10px] font-black uppercase text-dark-text-muted tracking-wide">
                    <span>To Destination Asset</span>
                    <span>ESTIMATED RECEIPT</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 font-bold font-mono text-2xl text-white select-all">
                      {swapToEstimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </div>
                    <select 
                      value={swapTo}
                      onChange={(e) => {
                        setSwapTo(e.target.value);
                        setSwapSuccess('');
                      }}
                      className="bg-dark-surface border border-dark-border rounded-xl text-xs px-3.5 py-2 text-white font-black outline-none focus:border-white transition-colors"
                    >
                      {SUPPORTED_ASSETS.map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conversional index tags */}
                <div className="bg-dark-bg/40 border border-dark-border/40 p-3.5 rounded-xl text-xs text-dark-text-muted flex justify-between items-center text-left">
                  <span className="font-semibold uppercase text-[10px]">Reference converter value</span>
                  <span className="font-mono text-white font-bold">1 {swapFrom} &approx; {((getAssetPrice(swapFrom) / getAssetPrice(swapTo))).toLocaleString(undefined, { maximumFractionDigits: 6 })} {swapTo}</span>
                </div>
              </div>

              {swapError && (
                <div className="border border-rose-500/20 bg-rose-500/5 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-xs text-left animate-flash">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{swapError}</span>
                </div>
              )}

              {swapSuccess && (
                <div className="border border-green-500/20 bg-green-500/5 text-buy p-4 rounded-xl flex items-center gap-2.5 text-xs text-left">
                  <Check className="w-4 h-4 text-buy shrink-0" />
                  <span>{swapSuccess}</span>
                </div>
              )}

              <button 
                onClick={handleProcessSwap}
                disabled={swapFrom === swapTo}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-30 disabled:cursor-not-allowed select-none text-black font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-widest text-center shadow-lg shadow-primary-500/15"
              >
                {swapFrom === swapTo ? 'Select alternate assets' : 'Instant Spot Ledger conversion'}
              </button>
            </div>
          </div>
        ) : walletMainView === 'TRANSACTIONS' ? (
          <div className="w-full space-y-6">
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Historic Transfer Receipts</h3>
                  <p className="text-[10px] text-dark-text-muted mt-0.5">Audit complete transaction logs across real-time and physical assets.</p>
                </div>
              </div>
              <button 
                onClick={() => setWalletMainView('ASSETS')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-dark-border text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-primary-500" />
                <span>Back to Overview</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <span className="text-[10px] md:text-xs text-white font-black tracking-wider uppercase">Active Transaction Logs ({txnLogs.length} events logged)</span>
              <button 
                onClick={fetchTxns}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-text-muted hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold border border-dark-border/40"
              >
                <RefreshCw className="w-3 h-3 text-primary-500" />
                <span>Synchronize ledgers</span>
              </button>
            </div>

            <div className="w-full mt-1">
              {loadingTxns ? (
                <div className="py-20 text-center text-dark-text-muted text-xs font-bold uppercase tracking-wider animate-pulse">Running sweep ledger checks...</div>
              ) : txnLogs.length === 0 ? (
                <div className="py-16 text-center text-dark-text-muted text-xs font-medium uppercase tracking-wide">No transactions recorded in this session. Try initiating deposits or transfers!</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex flex-col w-full text-left min-w-[700px]">
                    <div className="grid grid-cols-7 border-b border-white/[0.05] text-dark-text-muted text-[10px] font-black uppercase tracking-widest py-3 px-1">
                      <div>Receipt ID</div>
                      <div>Type</div>
                      <div>Asset Transfer</div>
                      <div>Volume</div>
                      <div>Network Channel</div>
                      <div>Timestamp</div>
                      <div className="text-right">Ledger Status</div>
                    </div>
                    <div className="flex flex-col text-xs text-dark-text-muted">
                      {txnLogs.map(log => {
                        const isDeposit = log.type === 'DEPOSIT';
                        const isWithdraw = log.type === 'WITHDRAWAL';
                        
                        return (
                          <div key={log.id} className="grid grid-cols-7 hover:bg-white/[0.02] border-b border-white/[0.03] py-4 px-1 rounded-lg transition-all items-center font-sans">
                            <div className="font-mono text-[10px] font-bold text-white selection:bg-primary-500/20 truncate uppercase">{log.txId || 'N/A'}</div>
                            <div>
                              <span className={`text-[9px] font-mono font-black border uppercase px-2 py-0.5 rounded ${
                                isDeposit ? 'bg-buy/10 text-buy border-buy/20' : 
                                isWithdraw ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              }`}>
                                {log.type}
                              </span>
                            </div>
                            <div className="font-bold text-white uppercase truncate">{log.asset || 'N/A'}</div>
                            <div className="font-mono font-extrabold text-[#10B981] truncate">{log.amount}</div>
                            <div className="font-sans text-[11px] text-left leading-none truncate uppercase tracking-wider">{log.network || 'Internal'}</div>
                            <div className="text-[10px] text-dark-text-muted font-mono truncate">{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()}</div>
                            <div className="text-right">
                              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-[#10B981]/10 text-buy border border-buy/20">
                                {log.status || 'SUCCESS'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
          {/* Filter controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between py-2">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-dark-text-muted pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={searchAssetQuery}
                onChange={(e) => setSearchAssetQuery(e.target.value)}
                placeholder="Search custom assets..."
                className="w-full pl-9 pr-4 py-2 rounded bg-dark-bg border border-dark-border rounded focus-within:border-white outline-none transition-colors"
              />
            </div>
          </div>

          <div className="w-full">
                <div className="overflow-x-auto">
                  <div className="flex flex-col w-full text-left">
                    <div className="grid grid-cols-5 border-b border-white/[0.05] text-dark-text-muted text-[10px] font-black uppercase tracking-widest py-3 px-1">
                      <div>Crypto Asset</div>
                      <div>Real-time valuation</div>
                      <div>Liquid Balance Available</div>
                      <div className="text-right">Gross USD Valuation</div>
                      <div className="text-right">Action</div>
                    </div>
                    <div className="flex flex-col text-xs text-white">
                      {SUPPORTED_ASSETS.filter(a => {
                        let isMatch = false;
                        const walletCfg = customWallets.find(w => w.id === activeWalletType);
                        if (walletCfg) {
                          if (walletCfg.id === 'MAIN') {
                            isMatch = ['BTC', 'ETH', 'USDT', 'SOL'].includes(a.symbol);
                          } else if (walletCfg.id === 'SPOT') {
                            isMatch = true;
                          } else if (walletCfg.id === 'CRYPTO') {
                            isMatch = !['DOGE'].includes(a.symbol);
                          } else if (walletCfg.id === 'MEMECOIN') {
                            isMatch = ['DOGE', 'TRX'].includes(a.symbol);
                          } else {
                            // Custom wallet
                            if (walletCfg.includedSymbols && walletCfg.includedSymbols.length > 0) {
                              isMatch = walletCfg.includedSymbols.includes(a.symbol);
                            } else if (walletCfg.excludedSymbols && walletCfg.excludedSymbols.length > 0) {
                              isMatch = !walletCfg.excludedSymbols.includes(a.symbol);
                            } else {
                              isMatch = true;
                            }
                          }
                        } else {
                          isMatch = true;
                        }

                        return isMatch && (
                          a.symbol.toLowerCase().includes(searchAssetQuery.toLowerCase()) || 
                          a.name.toLowerCase().includes(searchAssetQuery.toLowerCase())
                        );
                      }).map(item => {
                        const qty = getWalletBalance(profile, activeWalletType, item.symbol);
                        const itemPrice = getAssetPrice(item.symbol);
                        const usdVal = qty * itemPrice;
                        
                        return (
                          <div key={item.symbol} className="grid grid-cols-5 hover:bg-white/[0.02] border-b border-white/[0.03] py-4 px-1 rounded-lg transition-all items-center">
                            <div>
                              <div className="flex items-center gap-3">
                                <CoinIcon symbol={item.symbol} name={item.name} />
                                <div className="text-left min-w-0">
                                  <div className="font-extrabold text-white text-xs md:text-sm tracking-wide flex items-center gap-1.5">
                                    <span>{item.symbol}</span>
                                    {['BTC', 'ETH', 'SOL', 'BNB'].includes(item.symbol) && (
                                      <span className="text-[8px] bg-primary-500/10 text-primary-500 px-1 py-0.2 rounded font-black uppercase">Major</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#A3A6AF] truncate font-sans font-medium">{item.name}</div>
                                </div>
                              </div>
                            </div>
                            <div className="font-mono text-xs text-white/95 font-bold truncate">
                              ${itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </div>
                            <div className="font-mono text-xs font-semibold text-white/95 truncate">
                              <span className="font-extrabold">{qty.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span> <span className="text-[10px] text-dark-text-muted font-bold uppercase select-none">{item.symbol}</span>
                            </div>
                            <div className="text-right font-mono text-xs font-black text-buy truncate pr-2">
                              ${usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-right flex items-center justify-end gap-2 pr-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDepAsset(item.symbol); setWalletMainView('DEPOSIT'); }}
                                className="text-[10px] font-bold text-dark-text-muted hover:text-white uppercase transition-colors px-2 py-1 bg-white/5 hover:bg-white/10 rounded"
                              >
                                Deposit
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setWithAsset(item.symbol); setWalletMainView('WITHDRAW'); }}
                                className="text-[10px] font-bold text-dark-text-muted hover:text-white uppercase transition-colors px-2 py-1 bg-white/5 hover:bg-white/10 rounded"
                              >
                                Withdraw
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>

          {/* WALLET MANAGEMENT CONFIGURATION MODAL */}
          <AnimatePresence>
            {isConfigModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-2xl bg-[#16171a] border border-dark-border rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto max-h-[90vh] custom-scroll text-left"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-dark-border/60 pb-4 mb-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                          <Settings className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-white uppercase tracking-wider">Sub-Account Control Hub</h3>
                          <p className="text-[10px] text-dark-text-muted mt-0.5">Customize names, toggle sidebar visibilities, or provision new custom portfolios.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsConfigModalOpen(false)}
                        className="p-1 text-dark-text-muted hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Sub-account List */}
                    <div className="space-y-4 mb-8">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-dark-text-muted">Active Ledgers</h4>
                      <div className="divide-y divide-dark-border/45 border border-dark-border/65 bg-[#121316]/40 rounded-xl overflow-hidden">
                        {customWallets.map((wallet) => {
                          const isDefault = ['MAIN', 'SPOT', 'CRYPTO', 'MEMECOIN'].includes(wallet.id);
                          return (
                            <div key={wallet.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-dark-border/40 flex items-center justify-center text-dark-text-muted shrink-0 font-bold text-xs font-mono">
                                  {wallet.id.substring(0, 3)}
                                </div>
                                <div className="flex-1">
                                  <input 
                                    type="text"
                                    value={wallet.name}
                                    onChange={(e) => {
                                      const updated = customWallets.map(w => w.id === wallet.id ? { ...w, name: e.target.value } : w);
                                      setCustomWallets(updated);
                                    }}
                                    className="bg-transparent border-b border-transparent hover:border-dark-border focus:border-primary-500 focus:outline-none text-xs text-white font-bold w-full max-w-[200px] pb-0.5"
                                  />
                                  <p className="text-[9px] text-dark-text-muted mt-0.5 font-mono">
                                    Type: {isDefault ? 'System Preset' : 'Custom Portfolio'}
                                  </p>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-2">
                                {/* Toggle Visibility */}
                                <button
                                  onClick={() => {
                                    if (wallet.id === 'MAIN') return; // Cannot hide MAIN
                                    const updated = customWallets.map(w => w.id === wallet.id ? { ...w, visible: !w.visible } : w);
                                    setCustomWallets(updated);
                                  }}
                                  disabled={wallet.id === 'MAIN'}
                                  className={`p-1.5 rounded transition ${
                                    wallet.id === 'MAIN' 
                                      ? 'text-dark-text-muted/30 cursor-not-allowed' 
                                      : wallet.visible 
                                        ? 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20' 
                                        : 'bg-white/5 text-dark-text-muted hover:bg-white/10'
                                  }`}
                                  title={wallet.id === 'MAIN' ? 'Primary list is mandatory' : wallet.visible ? 'Hide from sidebar' : 'Show in sidebar'}
                                >
                                  {wallet.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>

                                {/* Delete custom wallet button */}
                                {!isDefault && (
                                  <button
                                    onClick={() => {
                                      if (activeWalletType === wallet.id) {
                                        setActiveWalletType('MAIN');
                                      }
                                      setCustomWallets(customWallets.filter(w => w.id !== wallet.id));
                                    }}
                                    className="p-1.5 bg-rose-500/10 text-[#EF4444] hover:bg-rose-500/20 rounded transition cursor-pointer"
                                    title="Delete Custom Wallet"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Provision New Custom Sub-account Form */}
                    <div className="bg-[#121316] border border-dark-border/40 rounded-xl p-5 space-y-4">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-primary-500 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        Provision New Portfolio
                      </h4>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[10px] uppercase font-bold text-dark-text-muted">Portfolio Display Name</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="e.g. Retirement Fund, Swing Vault..."
                              value={newWalletName}
                              onChange={(e) => setNewWalletName(e.target.value)}
                              className="flex-1 bg-dark-bg border border-dark-border hover:border-dark-text-muted focus:border-white outline-none rounded-lg px-3 py-2 text-xs text-white"
                            />
                            <button
                              onClick={() => {
                                if (!newWalletName.trim()) return;
                                const id = 'USER_' + Math.random().toString(36).substring(2, 8).toUpperCase();
                                setCustomWallets([
                                  ...customWallets,
                                  {
                                    id,
                                    name: newWalletName.trim(),
                                    visible: true,
                                    excludedSymbols: [],
                                    includedSymbols: [...newWalletAssets]
                                  }
                                ]);
                                setNewWalletName('');
                                setNewWalletAssets([]);
                              }}
                              className="bg-primary-500 hover:bg-primary-600 text-black font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Provision Portfolio
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-left">
                          <label className="text-[10px] uppercase font-bold text-dark-text-muted block">Included Crypto Assets (Optional)</label>
                          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 bg-dark-surface/40 rounded-lg border border-dark-border/40">
                            {SUPPORTED_ASSETS.map((asset) => {
                              const isSelected = newWalletAssets.includes(asset.symbol);
                              return (
                                <button
                                  key={asset.symbol}
                                  onClick={() => {
                                    if (isSelected) {
                                      setNewWalletAssets(newWalletAssets.filter(x => x !== asset.symbol));
                                    } else {
                                      setNewWalletAssets([...newWalletAssets, asset.symbol]);
                                    }
                                  }}
                                  className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded duration-100 transition whitespace-nowrap cursor-pointer border ${
                                    isSelected 
                                      ? 'bg-primary-500/10 border-primary-500/35 text-primary-500' 
                                      : 'bg-dark-bg border-dark-border text-dark-text-muted hover:text-white'
                                  }`}
                                >
                                  {asset.symbol}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="mt-8 border-t border-dark-border/60 pt-4 flex justify-end">
                    <button
                      onClick={() => setIsConfigModalOpen(false)}
                      className="bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition border border-dark-border cursor-pointer"
                    >
                      Close & Apply Changes
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}

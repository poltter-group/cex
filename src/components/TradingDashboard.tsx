import { useState, useEffect } from 'react';
import { useAuth, getWalletBalance } from '../lib/auth-context';
import { MarketTicker } from './MarketTicker';
import { OrderBook } from './OrderBook';
import { ChartPlaceholder } from './ChartPlaceholder';
import { OrderEntry } from './OrderEntry';
import { RecentTrades } from './RecentTrades';
import { OrderHistory } from './OrderHistory';
import { Star, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { placeSpotOrder } from '../lib/spot-engine';

export function TradingDashboard({
  setCurrentView,
  setAuthMode,
  activeTradePair,
  setActiveTradePair
}: {
  setCurrentView: (v: 'HOME' | 'MARKETS' | 'AUTH' | 'SPOT') => void;
  setAuthMode: (m: 'LOGIN' | 'REGISTER') => void;
  activeTradePair?: string;
  setActiveTradePair?: (p: string) => void;
}) {
  const { user, profile, updateBalance, updateAssetBalance } = useAuth();
  const [localPair, setLocalPair] = useState('BTC');
  const activePair = activeTradePair || localPair;
  const setActivePair = setActiveTradePair || setLocalPair;

  const [activeCategory, setActiveCategory] = useState<'Crypto' | 'Spot' | 'Memecoin'>('Crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTradeUSD, setQuickTradeUSD] = useState('100');
  const [notification, setNotification] = useState<{msg: string; type: 'success'|'error'} | null>(null);
  
  const [tradableAssets, setTradableAssets] = useState<any>({
    Crypto: [],
    Spot: [],
    Memecoin: []
  });
  const [favorites, setFavorites] = useState<string[]>(['BTCUSDT']);

  const toggleFavorite = (e: any, coin: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(coin) ? prev.filter(c => c !== coin) : [...prev, coin]
    );
  };

  useEffect(() => {
    fetch('/api/markets')

      .then(res => res.json())
      .then(data => {
        if (data && data.Crypto) {
           setTradableAssets(data);
        }
      })
      .catch(err => console.error("Could not load markets from API", err));
  }, []);

  // Auto-switch display tab when activePair prop updates from external trigger like Dropdown / Markets
  useEffect(() => {
    if (activePair) {
      if (['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].includes(activePair)) {
        setActiveCategory('Spot');
      } else if (['DOGE', 'PEPE', 'SHIB', 'WIF', 'BANANA', 'KEVIN'].includes(activePair)) {
        setActiveCategory('Memecoin');
      } else {
        setActiveCategory('Crypto');
      }
    }
  }, [activePair]);

  const currentAssets = tradableAssets[activeCategory] || [];
  const filteredAssets = currentAssets.filter(item => 
    item.coin.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const executeQuickTrade = async (coin: string, side: 'Buy' | 'Sell', currentPriceStr: string, cat: string) => {
     if (!user || !profile) {
        setAuthMode('LOGIN');
        setCurrentView('AUTH');
        return;
     }

     const orderPrice = parseFloat(currentPriceStr.replace(/[^0-9.]/g, ''));
     const totalUsd = parseFloat(quickTradeUSD);
     
     if (isNaN(totalUsd) || totalUsd <= 0) {
        setNotification({msg: 'Invalid amount', type: 'error'});
        setTimeout(() => setNotification(null), 3000);
        return;
     }
     if (isNaN(orderPrice) || orderPrice <= 0) return;
     
     const orderAmount = totalUsd / orderPrice;

     const quoteAsset = coin.endsWith('USDT') ? 'USDT' : coin.endsWith('USD') ? 'USD' : 'USDT';
     const baseAsset = coin.replace(/USDT|USD$/, '');
     
     // Derive walletType from category
     const walletType = cat === 'Spot' ? 'SPOT' : cat === 'Memecoin' ? 'MEMECOIN' : 'CRYPTO';

     const availableQuote = getWalletBalance(profile, walletType, quoteAsset);
     const availableBase = getWalletBalance(profile, walletType, baseAsset);

     // Balance checks
     if (side === 'Buy' && availableQuote < totalUsd) {
        setNotification({msg: `Insufficient ${quoteAsset} in ${walletType} wallet`, type: 'error'});
        setTimeout(() => setNotification(null), 3000);
        return;
     }

     if (side === 'Sell' && availableBase < orderAmount) {
        setNotification({msg: `Insufficient ${baseAsset} in ${walletType} wallet`, type: 'error'});
        setTimeout(() => setNotification(null), 3000);
        return;
     }

     try {
       await placeSpotOrder({
           userId: user.uid,
           baseAsset,
           quoteAsset,
           walletType,
           side,
           type: 'Market',
           amount: orderAmount,
           price: orderPrice
       });

       setNotification({msg: `Quick ${side} ${coin} Filled`, type: 'success'});
       setTimeout(() => setNotification(null), 3000);
     } catch (e: any) {
       console.error(e);
       setNotification({msg: e.message || 'Trade failed', type: 'error'});
       setTimeout(() => setNotification(null), 3000);
     }
  };

  return (
    <div className="h-full flex flex-col bg-dark-bg text-dark-text pt-1 select-none relative">
      {notification && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 flex items-center gap-2 rounded shadow-2xl font-bold text-sm ${notification.type === 'success' ? 'bg-[#10B981] text-black' : 'bg-[#F43F5E] text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}
      <MarketTicker activePair={activePair} setActivePair={setActivePair} />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_18.75rem] lg:grid-cols-[1fr_22rem] xl:grid-cols-[17.5rem_1fr_18.75rem] overflow-y-auto xl:overflow-hidden border-t border-dark-border custom-scroll">
        {/* Left Col - Orderbook & Trades */}
        <div className="order-2 md:col-start-1 md:row-start-2 xl:col-start-1 xl:row-start-1 flex flex-col bg-dark-bg border-b xl:border-b-0 md:border-r border-dark-border overflow-hidden min-h-[500px] xl:min-h-0">
          <div className="flex flex-col h-[60%] border-b border-dark-border">
             <OrderBook activePair={activePair} />
          </div>
          <div className="flex-1 overflow-hidden">
             <RecentTrades activePair={activePair} />
          </div>
        </div>
        
        {/* Middle Col - Chart & History */}
        <div className="order-1 md:col-start-1 md:row-start-1 xl:col-start-2 xl:row-start-1 flex flex-col min-w-0 bg-dark-bg border-b xl:border-b-0 md:border-r border-dark-border overflow-hidden min-h-[600px] xl:min-h-0">
          <div className="flex justify-between items-center px-4 py-1.5 border-b border-dark-border bg-dark-surface shrink-0">
             <div className="flex gap-4">
                <button className="text-white font-medium text-xs">Advanced Chart View</button>
             </div>
          </div>
          <div className="flex-1 relative">
             <ChartPlaceholder activePair={activePair} />
          </div>
          <div className="h-[13.75rem] shrink-0 border-t border-dark-border bg-dark-surface-alt/20">
             <OrderHistory />
          </div>
        </div>

        {/* Right Col - Market List & Order Entry */}
        <div className="order-3 md:col-start-2 md:row-start-1 md:row-span-2 xl:col-start-3 xl:row-start-1 xl:row-span-1 flex flex-col bg-dark-bg overflow-hidden min-h-[600px] xl:min-h-0">
          {/* Market categories dynamic list & selectors */}
          <div className="h-[17.5rem] border-b border-dark-border flex flex-col text-xs font-medium">
             
             {/* Category switch tabs */}
             <div className="flex border-b border-dark-border">
                {(['Crypto', 'Spot', 'Memecoin'] as const).map(cat => (
                   <button
                     key={cat}
                     type="button"
                     onClick={() => {
                       setActiveCategory(cat);
                       // Pre-select first coin in that category
                       const firstAsset = tradableAssets[cat]?.[0]?.coin;
                       if (firstAsset) setActivePair(firstAsset);
                     }}
                     className={`flex-1 py-2 text-center border-b-[2px] transition-all font-bold tracking-wider text-[10px] uppercase ${activeCategory === cat ? 'border-primary-500 text-primary-500 bg-white/5 font-extrabold' : 'border-transparent text-dark-text-muted hover:text-white hover:bg-white/2'}`}
                   >
                     {cat === 'Spot' ? 'Forex Spot' : cat}
                   </button>
                ))}
             </div>

             {/* Search */}
             <div className="flex items-center gap-2 p-3 border-b border-dark-border bg-dark-bg">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-dark-text-muted" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search" 
                    className="bg-transparent outline-none w-full text-white placeholder-dark-text-muted border-none p-0 focus:ring-0 text-xs" 
                  />
                </div>
             </div>

             <div className="flex text-dark-text-muted px-3 py-2 border-b border-dark-border bg-dark-surface/40">
                <div className="flex-1">Pair</div>
                <div className="w-16 text-right">Price</div>
                <div className="w-16 text-right">Change</div>
             </div>

             <div className="flex-1 overflow-y-auto no-scrollbar custom-scroll">
                {filteredAssets.map(asset => {
                    const isUSD = activeCategory === 'Spot';
                    const displaySymbol = isUSD ? 
                      (asset.coin === 'USDJPY' ? 'USD/JPY' : asset.coin.slice(0, 3) + '/' + asset.coin.slice(3)) : 
                      `${asset.coin}/USDT`;

                    return (
                        <div 
                          key={asset.coin} 
                          onClick={() => setActivePair(asset.coin)}
                          className={`group relative flex px-3 py-1.5 cursor-pointer items-center transition-colors ${activePair === asset.coin ? 'bg-dark-surface-alt' : 'hover:bg-white/3'}`}
                        >
                           <div className="flex-1 flex items-center gap-1.5 min-w-0">
                              <Star 
                                onClick={(e) => toggleFavorite(e, asset.coin)}
                                className={`w-3 h-3 shrink-0 ${favorites.includes(asset.coin) ? 'text-yellow-500 fill-yellow-500' : 'text-dark-text-muted hover:text-yellow-500'}`} 
                              />
                              <span className={`truncate ${activePair === asset.coin ? 'text-primary-500 font-bold' : 'text-white'}`}>
                                {displaySymbol}
                              </span>
                           </div>
                           <div className="w-16 text-right text-white tabular-nums truncate text-[11px] group-hover:hidden">
                             {asset.price}
                           </div>
                           <div className={`w-16 text-right tabular-nums text-[11px] font-semibold group-hover:hidden ${asset.isUp ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                             {asset.change}
                           </div>
                           
                           {/* Quick Trade Buttons */}
                           <div className="w-32 items-center justify-end gap-1.5 hidden group-hover:flex">
                             <button
                               onClick={(e) => { e.stopPropagation(); executeQuickTrade(asset.coin, 'Buy', asset.price, activeCategory); }}
                               className="px-2 py-0.5 bg-[#10B981] hover:bg-[#10B981]/80 text-black font-extrabold text-[10px] rounded transition-colors"
                             >
                               BUY
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); executeQuickTrade(asset.coin, 'Sell', asset.price, activeCategory); }}
                               className="px-2 py-0.5 bg-[#F43F5E] hover:bg-[#F43F5E]/80 text-white font-extrabold text-[10px] rounded transition-colors"
                             >
                               SELL
                             </button>
                           </div>
                        </div>
                    );
                })}

                {filteredAssets.length === 0 && (
                  <div className="text-center py-6 text-xs text-dark-text-muted">No trading assets found.</div>
                )}
             </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderEntry activePair={activePair} setCurrentView={setCurrentView} setAuthMode={setAuthMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, ArrowUpRight, ArrowDownRight, ChevronDown, Award, Sparkles, TrendingUp, Compass } from 'lucide-react';
import { useMarket } from '../lib/market-context';

interface MarketAsset {
  pair: string;
  name: string;
  category: 'Crypto' | 'Memecoin' | 'Spot';
  type: 'Spot' | 'Futures' | 'Margin';
  price: string;
  numericPrice: number;
  change: number;
  max: string;
  min: string;
  amount: string;
  chart: number[];
  badge?: string;
  ecosystems: string[];
}

const GLOBAL_INDEX_DATA = [
  { symbol: 'BTC', price: '77,232.99', change: -0.46, chart: [78, 77.8, 77.5, 77.1, 77.3, 77.23] },
  { symbol: 'DOGE', price: '0.41240', change: 4.82, chart: [0.39, 0.40, 0.41, 0.395, 0.402, 0.4124] },
  { symbol: '$BANANA', price: '0.01301', change: 6.34, chart: [0.012, 0.0125, 0.0122, 0.0129, 0.0128, 0.01301] },
  { symbol: 'XAUUSD', price: '4,508.01', change: -0.84, chart: [4540, 4530, 4515, 4502, 4510, 4508.01] },
  { symbol: 'EURUSD', price: '1.15873', change: -0.29, chart: [1.162, 1.161, 1.157, 1.159, 1.1584, 1.15873] }
];

const MARKET_ASSETS: MarketAsset[] = [
  // Crypto - Spot
  { pair: 'BTCUSDT', name: 'Bitcoin', category: 'Crypto', type: 'Spot', price: '77,209.1', numericPrice: 77209.1, change: -0.46, max: '78,185', min: '76,693', amount: '2.88B', badge: 'Popular', chart: [78, 77.8, 77.5, 77.1, 77.3, 77.209], ecosystems: ['L1/L2'] },
  { pair: 'ETHUSDT', name: 'Ethereum', category: 'Crypto', type: 'Spot', price: '2,131.07', numericPrice: 2131.07, change: -0.32, max: '2,156.41', min: '2,104', amount: '1.79B', badge: 'Hot', chart: [2150, 2140, 2110, 2125, 2118, 2131.07], ecosystems: ['L1/L2', 'DeFi'] },
  { pair: 'HYPEUSDT', name: 'Hyperliquid', category: 'Crypto', type: 'Spot', price: '61.411', numericPrice: 61.411, change: 19.54, max: '62.663', min: '51.16', amount: '337.59M', badge: 'New', chart: [51, 53, 52, 58, 57, 61.411], ecosystems: ['L1/L2', 'DeFi', 'Web3'] },
  { pair: 'SOLUSDT', name: 'Solana', category: 'Crypto', type: 'Spot', price: '145.20', numericPrice: 145.2, change: 12.30, max: '148.50', min: '132.10', amount: '982.40M', badge: 'Trending', chart: [132, 135, 133, 142, 140, 145.2], ecosystems: ['L1/L2', 'DeFi', 'Web3'] },
  { pair: 'CXPUSDT', name: 'Cexpro Token', category: 'Crypto', type: 'Spot', price: '1.9803', numericPrice: 1.9803, change: -1.41, max: '2.0210', min: '1.9540', amount: '124.50M', chart: [2.01, 1.99, 1.97, 1.985, 1.9803], ecosystems: ['DeFi', 'Web3'] },
  { pair: 'AVAXUSDT', name: 'Avalanche', category: 'Crypto', type: 'Spot', price: '34.85', numericPrice: 34.85, change: -2.10, max: '35.90', min: '33.80', amount: '215.15M', chart: [35.9, 35.2, 34.1, 34.5, 34.85], ecosystems: ['L1/L2', 'DeFi'] },

  // Memecoins
  { pair: 'DOGEUSDT', name: 'Dogecoin', category: 'Memecoin', type: 'Spot', price: '0.41240', numericPrice: 0.4124, change: 4.82, max: '0.42500', min: '0.39500', amount: '840.50M', badge: 'Popular', chart: [0.395, 0.405, 0.401, 0.412, 0.4124], ecosystems: ['Meme'] },
  { pair: 'SHIBUSDT', name: 'Shiba Inu', category: 'Memecoin', type: 'Spot', price: '0.00002514', numericPrice: 0.00002514, change: 2.15, max: '0.00002610', min: '0.00002420', amount: '310.20M', chart: [0.0000242, 0.0000248, 0.0000245, 0.00002514], ecosystems: ['Meme', 'DeFi'] },
  { pair: 'PEPEUSDT', name: 'Pepe Coin', category: 'Memecoin', type: 'Spot', price: '0.00001543', numericPrice: 0.00001543, change: 12.80, max: '0.00001620', min: '0.00001350', amount: '520.40M', badge: 'Hot', chart: [0.0000135, 0.0000148, 0.0000142, 0.00001543], ecosystems: ['Meme'] },
  { pair: 'WIFUSDT', name: 'dogwifhat', category: 'Memecoin', type: 'Spot', price: '3.1250', numericPrice: 3.125, change: -5.40, max: '3.4500', min: '3.0100', amount: '185.30M', chart: [3.42, 3.31, 3.05, 3.15, 3.125], ecosystems: ['Meme'] },
  { pair: 'BANANAUSDT', name: 'Banana Coin', category: 'Memecoin', type: 'Spot', price: '0.01301', numericPrice: 0.01301, change: 6.34, max: '0.01380', min: '0.01210', amount: '8.90M', chart: [12.1, 12.5, 12.2, 12.9, 13.01], ecosystems: ['Meme'] },
  { pair: 'KEVINUSDT', name: 'Kevin Meme', category: 'Memecoin', type: 'Spot', price: '0.0007324', numericPrice: 0.0007324, change: 1893.52, max: '0.0008500', min: '0.0000350', amount: '4.20M', badge: 'New', chart: [3.5, 10, 50, 250, 732.4], ecosystems: ['Meme'] },

  // Spot commodities & Forex
  { pair: 'XAUUSD', name: 'Gold Forex Spot vs USD', category: 'Spot', type: 'Spot', price: '4,508.01', numericPrice: 4508.01, change: -0.84, max: '4,550.00', min: '4,490.00', amount: '14.20B', badge: 'Metal', chart: [4540, 4530, 4515, 4502, 4510, 4508.01], ecosystems: ['DeFi'] },
  { pair: 'XAGUSD', name: 'Silver Forex Spot vs USD', category: 'Spot', type: 'Spot', price: '75.41', numericPrice: 75.41, change: 2.54, max: '76.10', min: '73.20', amount: '2.15B', badge: 'Metal', chart: [73.2, 74.0, 73.8, 74.9, 75.41], ecosystems: ['DeFi'] },
  { pair: 'EURUSD', name: 'Euro vs US Dollar', category: 'Spot', type: 'Spot', price: '1.15873', numericPrice: 1.15873, change: -0.29, max: '1.1625', min: '1.1540', amount: '48.50B', badge: 'Forex', chart: [1.162, 1.161, 1.157, 1.159, 1.1584, 1.15873], ecosystems: ['Web3'] },
  { pair: 'GBPUSD', name: 'Pound vs US Dollar', category: 'Spot', type: 'Spot', price: '1.34215', numericPrice: 1.34215, change: 0.45, max: '1.3480', min: '1.3350', amount: '35.10B', badge: 'Forex', chart: [1.335, 1.339, 1.337, 1.341, 1.34215], ecosystems: ['Web3'] },
  { pair: 'USDJPY', name: 'US Dollar vs Japanese Yen', category: 'Spot', type: 'Spot', price: '149.82', numericPrice: 149.82, change: -0.12, max: '150.50', min: '149.20', amount: '42.90B', badge: 'Forex', chart: [149.5, 150.1, 149.8, 149.9, 149.82], ecosystems: ['Web3'] }
];

export function Markets({ setCurrentView }: { setCurrentView: (v: 'HOME' | 'MARKETS' | 'AUTH' | 'SPOT') => void }) {
  const { prices } = useMarket();

  // Dynamic versions bound to live prices
  const dynamicGlobalIndexData = GLOBAL_INDEX_DATA.map(idx => {
    const symbol = idx.symbol.startsWith('$') ? idx.symbol.slice(1) : idx.symbol;
    const livePrice = prices[symbol];
    if (livePrice !== undefined) {
      const decimals = livePrice < 1 ? (livePrice < 0.001 ? 6 : 4) : 2;
      return {
        ...idx,
        price: livePrice.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      };
    }
    return idx;
  });

  const dynamicMarketAssets = MARKET_ASSETS.map(asset => {
    const cleanKey = asset.pair.replace('USDT', '');
    const livePrice = prices[cleanKey] || prices[asset.pair];
    if (livePrice !== undefined) {
      const decimals = livePrice < 1 ? (livePrice < 0.001 ? 7 : 4) : 2;
      return {
        ...asset,
        numericPrice: livePrice,
        price: livePrice.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      };
    }
    return asset;
  });

  // Tabs & category state matching headers
  const [activeCategory, setActiveCategory] = useState<'Favorites' | 'Crypto' | 'Memecoin' | 'Spot'>('Crypto');
  const [activeType, setActiveType] = useState<'Spot' | 'Futures' | 'Margin'>('Spot');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom ecosystem & Quote state
  const [ecosystem, setEcosystem] = useState('All');
  const [quoteCurrency, setQuoteCurrency] = useState('USDT Forex Spot');
  const [isEcoOpen, setIsEcoOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  
  const ecoRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ecoRef.current && !ecoRef.current.contains(event.target as Node)) {
        setIsEcoOpen(false);
      }
      if (quoteRef.current && !quoteRef.current.contains(event.target as Node)) {
        setIsQuoteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Favorites state loaded from localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cexpro_favorites_v1');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'HYPEUSDT'];
    } catch (e) {
      return ['BTCUSDT', 'HYPEUSDT'];
    }
  });

  useEffect(() => {
    localStorage.setItem('cexpro_favorites_v1', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (pair: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair]
    );
  };

  // Filtered dataset combining all active dropdown settings
  const filteredAssets = dynamicMarketAssets.filter(asset => {
    // 1. Matches Category tab (Favorites category lists all favorited, otherwise match asset.category)
    const matchesCategory = activeCategory === 'Favorites' 
      ? favorites.includes(asset.pair)
      : asset.category === activeCategory;

    // 2. Matches Ecosystem Filter
    const matchesEcosystem = ecosystem === 'All'
      ? true
      : (asset.ecosystems && asset.ecosystems.includes(ecosystem));

    // 3. Matches Quote currency selection
    let matchesQuote = true;
    if (quoteCurrency === 'USDT Forex Spot') {
      matchesQuote = asset.pair.endsWith('USDT') || asset.category === 'Spot';
    } else if (quoteCurrency === 'USDC Forex Spot') {
      matchesQuote = asset.category === 'Crypto' || asset.category === 'Memecoin';
    } else if (quoteCurrency === 'BTC Forex Spot') {
      // Show non-BTC crypto assets valued in BTC
      matchesQuote = (asset.category === 'Crypto' && !asset.pair.startsWith('BTC')) || asset.category === 'Memecoin';
    } else if (quoteCurrency === 'USD-Fiat') {
      // Fiat category includes USD pairs
      matchesQuote = asset.category === 'Spot' || ['BTCUSDT', 'ETHUSDT'].includes(asset.pair);
    }

    // 4. Matches Search bar matching
    const matchesSearch = asset.pair.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesEcosystem && matchesQuote && matchesSearch;
  });

  // Sparkline generator helper
  const renderSparkline = (data: number[], isUp: boolean) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 30;
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height * 0.7 - height * 0.15;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100" height="30" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <polyline
          fill="none"
          stroke={isUp ? "#10B981" : "#F43F5E"}
          strokeWidth="1.75"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-dark-bg text-dark-text pt-6 pb-24 px-4 md:px-8 xl:px-12 select-none custom-scroll relative">
      
      {/* Visual Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary-500/5 rounded-full blur-[100px] pointer-events-none opacity-30" />
      <div className="absolute top-[20%] left-0 w-[400px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none opacity-20" />

      {/* 1. Global Index Headline Banner */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar scrollbar-none mb-8 pb-2 relative z-10">
        {dynamicGlobalIndexData.map((idx, i) => {
          const isUp = idx.change >= 0;
          return (
            <div 
              key={i} 
              className="min-w-[215px] shrink-0 bg-gradient-to-b from-[#1c1e22] to-[#121316] border border-dark-border/80 hover:border-primary-500/40 rounded-xl p-4.5 flex flex-col justify-between hover:shadow-[0_8px_20px_-6px_rgba(245,158,11,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group" 
              onClick={() => setCurrentView('SPOT')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-white/90 group-hover:text-primary-500 transition-colors uppercase tracking-wider">{idx.symbol}</span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${isUp ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F43F5E]/10 text-[#F43F5E]'}`}>
                  {isUp ? '▲ +' : '▼ '}{idx.change}%
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-lg font-mono font-black text-white tracking-tight leading-none">{idx.price}</span>
                <div className="w-16 h-8 flex items-end justify-end opacity-85 group-hover:opacity-100 transition-opacity">
                  {renderSparkline(idx.chart, isUp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>



      {/* 3. Filter Navigation & Inputs Row */}
      <div className="space-y-4 mb-6 relative z-10">
        
        {/* Category Primary Tab Switchers (Favorites, Crypto, Memecoin, Spot) */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2 flex-wrap gap-4">
          <div className="flex gap-4 overflow-x-auto no-scrollbar scrollbar-none">
            {(['Favorites', 'Crypto', 'Memecoin', 'Spot'] as const).map(cat => (
              <button 
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveType('Spot');
                }}
                className={`py-2 px-1 text-xs font-mono font-black uppercase tracking-widest transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat 
                    ? 'text-primary-500' 
                    : 'text-dark-text-muted hover:text-white'
                }`}
              >
                {cat === 'Favorites' && <Star className={`w-3.5 h-3.5 ${activeCategory === 'Favorites' ? 'fill-primary-500 text-primary-500' : 'text-dark-text-muted'}`} />}
                <span>{cat === 'Spot' ? 'Forex Spot' : cat}</span>
                {activeCategory === cat && (
                  <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coin..." 
                className="bg-dark-bg border border-dark-border rounded-lg pl-8 pr-4 py-2 text-xs text-white outline-none focus:border-primary-500/50 w-56 transition-colors placeholder-white/20 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Inner sub-type list replaced with elegant Spot Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            {/* Ecosystem dropdown simulation */}
            <div className="relative" ref={ecoRef}>
              <button 
                onClick={() => {
                  setIsEcoOpen(!isEcoOpen);
                  setIsQuoteOpen(false);
                }}
                className="bg-dark-surface/40 backdrop-blur-md border border-dark-border hover:border-white/30 px-3 py-2 rounded-lg text-dark-text-muted hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                id="ecosystem-button"
              >
                <span>Eco: <span className="text-white font-bold ml-0.5">{ecosystem}</span></span>
                <ChevronDown className="w-3 h-3 text-dark-text-muted" />
              </button>
              {isEcoOpen && (
                <div className="absolute right-0 mt-1 bg-dark-surface-alt border border-dark-border rounded-lg py-1 z-20 w-32 font-semibold shadow-2xl">
                  {['All', 'L1/L2', 'DeFi', 'Web3', 'Meme'].map(eco => (
                    <button 
                      key={eco}
                      onClick={() => {
                        setEcosystem(eco);
                        setIsEcoOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/5 hover:text-white text-dark-text-muted transition-colors text-xs"
                    >
                      {eco}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quote category dropdown simulation */}
            <div className="relative" ref={quoteRef}>
              <button 
                onClick={() => {
                  setIsQuoteOpen(!isQuoteOpen);
                  setIsEcoOpen(false);
                }}
                className="bg-dark-surface/40 backdrop-blur-md border border-dark-border hover:border-white/30 px-3 py-2 rounded-lg text-dark-text-muted hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                id="quote-currency-button"
              >
                <span>Quote: <span className="text-white font-bold ml-0.5">{quoteCurrency}</span></span>
                <ChevronDown className="w-3 h-3 text-dark-text-muted" />
              </button>
              {isQuoteOpen && (
                <div className="absolute right-0 mt-1 bg-dark-surface-alt border border-dark-border rounded-lg py-1 z-20 w-44 font-semibold shadow-2xl">
                  {['USDT Forex Spot', 'USDC Forex Spot', 'BTC Forex Spot', 'USD-Fiat'].map(qc => (
                    <button 
                      key={qc}
                      onClick={() => {
                        setQuoteCurrency(qc);
                        setIsQuoteOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/5 hover:text-white text-dark-text-muted transition-colors text-xs"
                    >
                      {qc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 4. Detailed Data Table - Border-free minimal list layout "hyad had tableau wlakin khli content" */}
      <div className="relative z-10 w-full">
        {/* Table Header Row */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr] md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr_1.5fr] xl:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1.5fr_1.5fr] gap-4 text-[10px] font-mono font-black uppercase tracking-widest text-dark-text-muted py-4 px-2 border-b border-white/[0.05]">
          <div>Pair</div>
          <div className="text-right">Last Price</div>
          <div className="text-right">24h Change</div>
          <div className="hidden md:block text-right">Max. (24h)</div>
          <div className="hidden md:block text-right">Min. (24h)</div>
          <div className="hidden xl:block text-right whitespace-nowrap">Volume</div>
          <div className="hidden md:block text-center whitespace-nowrap">Market Spark</div>
          <div className="hidden md:block text-right">Operations</div>
        </div>

        <div className="flex flex-col min-h-[30vh] mt-1">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((row, i) => {
              const isUp = row.change >= 0;
              const isFavorite = favorites.includes(row.pair);

              // Smart Quote Currency conversion values
              let displayPair = row.pair;
              let displayPrice = row.price;
              let displayMax = row.max;
              let displayMin = row.min;

              if (quoteCurrency === 'USDC Forex Spot') {
                displayPair = row.pair.replace('USDT', 'USDC');
              } else if (quoteCurrency === 'BTC Forex Spot') {
                displayPair = row.pair.replace('USDT', 'BTC');
                if (row.pair !== 'BTCUSDT') {
                  const btcPrice = row.numericPrice / 77209.1;
                  displayPrice = btcPrice.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
                  
                  const parseMax = parseFloat(row.max.replace(/,/g, ''));
                  if (!isNaN(parseMax)) {
                    displayMax = (parseMax / 77209.1).toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
                  }
                  const parseMin = parseFloat(row.min.replace(/,/g, ''));
                  if (!isNaN(parseMin)) {
                    displayMin = (parseMin / 77209.1).toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
                  }
                } else {
                  displayPrice = "1.00000";
                  displayMax = "1.00000";
                  displayMin = "1.00000";
                }
              } else if (quoteCurrency === 'USD-Fiat') {
                displayPair = row.pair.replace('USDT', 'USD');
              }

              return (
                <div 
                  key={i} 
                  onClick={() => setCurrentView('SPOT')} 
                  className="grid grid-cols-[2fr_1.5fr_1fr] md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr_1.5fr] xl:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1.5fr_1.5fr] gap-4 items-center text-xs md:text-sm font-medium border-b border-white/[0.03] py-4 px-2 hover:bg-white/[0.02] rounded-lg transition-all group cursor-pointer"
                >
                  {/* Column 1: Pair */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => toggleFavorite(row.pair, e)}
                      className="focus:outline-none focus:ring-0 p-1 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
                      id={`favorite-${row.pair}`}
                    >
                      <Star className={`w-3.5 h-3.5 transition-colors ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-dark-text-muted group-hover:text-white'}`} />
                    </button>
                    <div className="flex flex-col pl-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-extrabold tracking-tight group-hover:text-primary-500 transition-colors">{displayPair}</span>
                        {row.badge && (
                          <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded-sm uppercase leading-none bg-[#3b82f6]/10 text-blue-400 tracking-widest mt-0.5 border border-[#3b82f6]/20">
                            {row.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-dark-text-muted mt-0.5 font-sans tracking-wide font-normal">{row.name}</span>
                    </div>
                  </div>

                  {/* Column 2: Last price */}
                  <div className="text-right text-white font-bold font-mono">
                    {displayPrice}
                  </div>

                  {/* Column 3: Change percent */}
                  <div className="flex items-center justify-end">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isUp ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F43F5E]/10 text-[#F43F5E]'}`}>
                      {isUp ? '+' : ''}{row.change}%
                    </span>
                  </div>

                  {/* Column 4: Max extreme */}
                  <div className="hidden md:block text-right text-dark-text-muted font-mono bg-dark-bg/40 p-1.5 px-2 rounded-lg whitespace-nowrap text-xs border border-white/[0.01]">
                    {displayMax}
                  </div>

                  {/* Column 5: Min extreme */}
                  <div className="hidden md:block text-right text-dark-text-muted font-mono bg-dark-bg/40 p-1.5 px-2 rounded-lg whitespace-nowrap text-xs border border-white/[0.01]">
                    {displayMin}
                  </div>

                  {/* Column 6: Amount */}
                  <div className="hidden xl:block text-right text-dark-text-muted font-mono whitespace-nowrap">
                    {row.amount}
                  </div>

                  {/* Column 7: Sparkline indicator chart */}
                  <div className="hidden md:flex items-center justify-center">
                    {renderSparkline(row.chart, isUp)}
                  </div>

                  {/* Column 8: Actions */}
                  <div className="hidden md:flex items-center justify-end gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentView('SPOT');
                      }}
                      className="text-[10px] font-mono font-black px-2.5 py-1.5 border border-dark-border bg-dark-surface hover:bg-dark-surface-alt rounded-lg text-white transition-colors cursor-pointer uppercase tracking-wider"
                      id={`details-${row.pair}`}
                    >
                      Info
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentView('SPOT');
                      }}
                      className="text-[10px] font-mono font-black px-3 py-1.5 bg-primary-500 hover:bg-white rounded-lg text-black transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer uppercase tracking-wider"
                      id={`trade-${row.pair}`}
                    >
                      Trade
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-24 text-center text-dark-text-muted">
              <Compass className="w-10 h-10 mx-auto text-dark-border mb-3" />
              <p className="text-sm font-medium">No matched pairs found for "{searchQuery}" in {activeCategory === 'Favorites' ? 'your custom Favorites watchlist' : activeCategory}</p>
              <p className="text-xs mt-1">Try to switch asset categories, toggle off quote presets, or star some pairs to populate your list.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setEcosystem('All');
                  setQuoteCurrency('USDT Forex Spot');
                }}
                className="mt-4 bg-dark-surface border border-dark-border text-xs text-white px-3.5 py-1.5 rounded hover:bg-dark-surface-alt font-bold tracking-wide uppercase transition-colors"
                id="reset-search"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


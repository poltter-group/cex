import { useState, useRef, useEffect } from 'react';
import { Star, ChevronDown, Search } from 'lucide-react';
import { useMarket } from '../lib/market-context';

const PRICES: Record<string, { name: string; price: string; change: string; isUp: boolean; high: string; low: string; vol: string; quoteVol: string }> = {
  BTC: { name: 'Bitcoin', price: '77,298.51', change: '+2.45% +1,848.12', isUp: true, high: '78,211.00', low: '75,100.00', vol: '12,410.22', quoteVol: '956M' },
  ETH: { name: 'Ethereum', price: '2,117.94', change: '-0.76% -16.20', isUp: false, high: '2,152.40', low: '2,088.00', vol: '184,210.40', quoteVol: '389M' },
  SOL: { name: 'Solana', price: '145.20', change: '+12.30% +15.90', isUp: true, high: '148.50', low: '132.10', vol: '982,410.22', quoteVol: '142M' },
  AVAX: { name: 'Avalanche', price: '34.85', change: '-2.10% -0.75', isUp: false, high: '35.90', low: '33.80', vol: '215,110.15', quoteVol: '7.5M' },
  BNB: { name: 'BNB Coin', price: '612.40', change: '+0.85% +5.20', isUp: true, high: '618.00', low: '601.00', vol: '15,221.84', quoteVol: '9.3M' },
  XAUUSD: { name: 'Gold Forex Spot vs USD', price: '4,508.01', change: '-0.84% -38.10', isUp: false, high: '4,550.00', low: '4,490.00', vol: '14.20B', quoteVol: '14.20B' },
  XAGUSD: { name: 'Silver Forex Spot vs USD', price: '75.41', change: '+2.54% +1.86', isUp: true, high: '76.10', low: '73.20', vol: '2.15B', quoteVol: '2.15B' },
  EURUSD: { name: 'Euro vs USD', price: '1.15873', change: '-0.29% -0.0034', isUp: false, high: '1.1625', low: '1.1540', vol: '48.50B', quoteVol: '48.50B' },
  GBPUSD: { name: 'Pound vs USD', price: '1.34215', change: '+0.45% +0.0060', isUp: true, high: '1.3480', low: '1.3350', vol: '35.10B', quoteVol: '35.10B' },
  USDJPY: { name: 'USD vs Japanese Yen', price: '149.82', change: '-0.12% -0.18', isUp: false, high: '150.50', low: '149.20', vol: '42.90B', quoteVol: '42.90B' },
  PEPE: { name: 'Pepe Coin', price: '0.00001543', change: '+12.80% +0.00000175', isUp: true, high: '0.00001620', low: '0.00001350', vol: '5.20T', quoteVol: '80.2M' },
  DOGE: { name: 'Dogecoin', price: '0.41240', change: '+4.82% +0.0190', isUp: true, high: '0.42500', low: '0.39500', vol: '840.50M', quoteVol: '346M' },
  SHIB: { name: 'Shiba Inu', price: '0.00002514', change: '+2.15% +0.00000053', isUp: true, high: '0.00002610', low: '0.00002420', vol: '3.10T', quoteVol: '78.1M' },
  WIF: { name: 'dogwifhat', price: '3.1250', change: '-5.40% -0.1780', isUp: false, high: '3.4500', low: '3.0100', vol: '185.30M', quoteVol: '57.8M' },
  BANANA: { name: 'Banana Coin', price: '0.01301', change: '+6.34% +0.00078', isUp: true, high: '0.01380', low: '0.01210', vol: '8.90M', quoteVol: '115K' },
  KEVIN: { name: 'Kevin Meme', price: '0.0007324', change: '+1893.5% +0.00069', isUp: true, high: '0.0008500', low: '0.0000350', vol: '4.20M', quoteVol: '3.1M' }
};

export function MarketTicker({ 
  activePair = 'BTC',
  setActivePair
}: { 
  activePair?: string;
  setActivePair?: (p: string) => void;
}) {
  const { prices, marketStats } = useMarket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Normalize ticker string for lookups/display
  const cleanKey = activePair.replace('USDT', '').replace('USD', '');
  const staticData = PRICES[cleanKey] || PRICES[activePair] || {
    name: 'Asset',
    price: '1.000',
    change: '+0.00%',
    isUp: true,
    high: '1.050',
    low: '0.980',
    vol: '1.20M',
    quoteVol: '1.20M'
  };
  
  const stat = marketStats[cleanKey] || marketStats[activePair];
  const livePriceValue = stat ? stat.price : prices[cleanKey] || prices[activePair] || parseFloat(staticData.price.replace(/,/g, ''));
  const decimals = (livePriceValue < 1 || cleanKey === 'PEPE' || cleanKey === 'SHIB') ? 6 : 2;
  const formattedLivePrice = livePriceValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  
  const data = stat ? {
    name: staticData.name || cleanKey,
    price: formattedLivePrice,
    change: `${stat.change >= 0 ? '+' : ''}${stat.change.toFixed(2)}%`,
    isUp: stat.change >= 0,
    high: stat.high.toLocaleString(undefined, { maximumFractionDigits: decimals }),
    low: stat.low.toLocaleString(undefined, { maximumFractionDigits: decimals }),
    vol: stat.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    quoteVol: stat.quoteVolume ? (stat.quoteVolume / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'M' : '0'
  } : {
    ...staticData,
    price: formattedLivePrice
  };

  const isUSD = activePair.endsWith('USD') || activePair === 'USDJPY' || activePair.includes('USD');
  const displayPairName = isUSD ? 
    (activePair === 'USDJPY' ? 'USD/JPY' : activePair.slice(0, 3) + '/' + activePair.slice(3)) : 
    `${cleanKey}/USDT`;
    
  const filteredPairs = Object.entries(PRICES).filter(([key, val]) => 
    key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    val.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[60px] border-b border-dark-border bg-dark-bg flex items-center px-4 gap-8 shrink-0 relative">
      <div className="flex items-center gap-3">
        <button className="text-dark-text-muted hover:text-yellow-500 transition-colors">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </button>
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer group hover:bg-dark-surface/50 px-2 py-1 -ml-2 rounded transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="text-xl font-bold text-white group-hover:text-primary-500 transition-colors">{displayPairName}</div>
            <ChevronDown className={`w-4 h-4 text-dark-text-muted group-hover:text-primary-500 transition-all ${dropdownOpen ? 'rotate-180 text-primary-500' : ''}`} />
          </div>
          
          {dropdownOpen && (
            <div className="absolute top-12 left-0 w-80 bg-dark-bg border border-dark-border  rounded-xl z-50 overflow-hidden animate-fadeIn flex flex-col">
              <div className="p-3 border-b border-dark-border bg-dark-surface">
                <div className="flex items-center bg-[#0a0a0b] border border-white/5 rounded-lg px-3 py-2 focus-within:border-primary-500/50 transition-colors">
                  <Search className="w-4 h-4 text-dark-text-muted mr-2" />
                  <input 
                    type="text" 
                    placeholder="Search pairs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-white text-xs w-full placeholder-dark-text-muted font-sans"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scroll py-2">
                {filteredPairs.map(([key, pData]) => {
                  const isUSDPair = key.endsWith('USD') || key === 'USDJPY';
                  const pDisplay = isUSDPair ? (key === 'USDJPY' ? 'USD/JPY' : key.slice(0, 3) + '/' + key.slice(3)) : `${key}/USDT`;
                  
                  const stat = marketStats[key] || marketStats[`${key}USDT`];
                  const pLiveRaw = stat ? stat.price : prices[key] || parseFloat(pData.price.replace(/,/g, ''));
                  const decs = (pLiveRaw < 1 || key === 'PEPE' || key === 'SHIB') ? 6 : 2;
                  const pLiveFmt = pLiveRaw.toLocaleString(undefined, { minimumFractionDigits: decs, maximumFractionDigits: decs });
                  
                  const isUp = stat ? stat.change >= 0 : pData.isUp;
                  const changeStr = stat ? `${stat.change >= 0 ? '+' : ''}${stat.change.toFixed(2)}%` : pData.change.split(' ')[0];

                  return (
                    <div 
                      key={key} 
                      className="flex items-center justify-between px-4 py-2 hover:bg-dark-surface cursor-pointer group"
                      onClick={() => {
                        if (setActivePair) setActivePair(key);
                        setDropdownOpen(false);
                      }}
                    >
                      <div>
                        <div className={`font-bold font-sans ${cleanKey === key ? 'text-primary-500' : 'text-white group-hover:text-primary-500 transition-colors'}`}>{pDisplay}</div>
                        <div className="text-[10px] text-dark-text-muted font-medium">{pData.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-xs font-mono font-semibold">{pLiveFmt}</div>
                        <div className={`text-[10px] font-bold font-mono ${isUp ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>{changeStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-dark-text-muted font-medium ml-2 underline underline-offset-4 decoration-dark-border">
          {data.name}
        </span>
      </div>

      <div className="flex gap-8 text-xs">
        <div className="flex flex-col justify-center">
          <div className={`font-bold text-base ${data.isUp ? 'text-buy' : 'text-sell'}`}>
            {data.price}
          </div>
          <div className="text-dark-text-muted font-medium font-mono">
            ${data.price}
          </div>
        </div>
        
        <div className="flex flex-col justify-center font-mono">
          <div className="text-dark-text-muted mb-0.5">24h Change</div>
          <div className={`font-medium ${data.isUp ? 'text-buy' : 'text-sell'}`}>
            {data.change}
          </div>
        </div>
        
        <div className="flex flex-col justify-center font-mono hidden sm:flex">
          <div className="text-dark-text-muted mb-0.5">24h High</div>
          <div className="text-white font-medium">{data.high}</div>
        </div>
        
        <div className="flex flex-col justify-center font-mono hidden md:flex">
          <div className="text-dark-text-muted mb-0.5">24h Low</div>
          <div className="text-white font-medium">{data.low}</div>
        </div>
        
        <div className="flex flex-col justify-center font-mono hidden lg:flex">
          <div className="text-dark-text-muted mb-0.5">24h Vol({cleanKey})</div>
          <div className="text-white font-medium">{data.vol}</div>
        </div>
        
        <div className="flex flex-col justify-center font-mono hidden xl:flex">
          <div className="text-dark-text-muted mb-0.5">24h Vol(USD)</div>
          <div className="text-white font-medium">{data.quoteVol}</div>
        </div>
      </div>
    </div>
  );
}

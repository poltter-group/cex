import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMarket } from '../lib/market-context';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function OrderBook({ activePair = 'BTC' }: { activePair?: string }) {
  const { prices } = useMarket();
  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'BOOK' | 'DEPTH'>('BOOK');
  
  const initialBase = prices[activePair] || 100;

  // Sync current price with Market Provider
  useEffect(() => {
    if (prices[activePair]) {
       setCurrentPrice(prices[activePair]);
    }
  }, [prices, activePair]);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('pair', '==', `${activePair}/USDT`),
      where('status', '==', 'Open')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          price: data.price.toFixed(initialBase > 10 ? 2 : 5),
          amount: data.amount.toString(),
          depth: 100, // Make them fully visible
          isReal: true,
          side: data.side
        };
      });
      setRealOrders(dbOrders);
    });
    
    return () => unsubscribe();
  }, [activePair, initialBase]);

  const priceColor = Math.random() > 0.5 ? 'text-[#10B981]' : 'text-[#F43F5E]';
  
  const currentVal = currentPrice || initialBase;
  const generateMockAsks = () => {
    const list = [];
    for (let i = 1; i <= 8; i++) {
      const askPrice = currentVal * (1 + (i * 0.0003));
      list.push({
        id: `mock_sell_${i}`,
        price: askPrice.toFixed(initialBase > 10 ? 2 : 5),
        amount: (Math.random() * 1.5 + 0.05).toFixed(4),
        depth: Math.floor(Math.random() * 50) + 10,
        isReal: false,
        side: 'Sell'
      });
    }
    return list;
  };

  const generateMockBids = () => {
    const list = [];
    for (let i = 1; i <= 8; i++) {
      const bidPrice = currentVal * (1 - (i * 0.0003));
      list.push({
        id: `mock_buy_${i}`,
        price: bidPrice.toFixed(initialBase > 10 ? 2 : 5),
        amount: (Math.random() * 1.5 + 0.05).toFixed(4),
        depth: Math.floor(Math.random() * 50) + 10,
        isReal: false,
        side: 'Buy'
      });
    }
    return list;
  };

  const mockAsks = generateMockAsks();
  const mockBids = generateMockBids();

  const displayAsks = [
    ...realOrders.filter(o => o.side === 'Sell'),
    ...mockAsks
  ].slice(0, 10).sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

  const displayBids = [
    ...realOrders.filter(o => o.side === 'Buy'),
    ...mockBids
  ].slice(0, 10).sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

  // Generate cumulative depth data
  let accumBid = 0;
  const rawBids = [...displayBids].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // lowest to highest
  const depthBids = rawBids.map(b => {
    accumBid += parseFloat(b.amount);
    return { price: parseFloat(b.price), bidVolume: accumBid, askVolume: null };
  });

  let accumAsk = 0;
  const rawAsks = [...displayAsks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // lowest to highest
  const depthAsks = rawAsks.map(a => {
    accumAsk += parseFloat(a.amount);
    return { price: parseFloat(a.price), askVolume: accumAsk, bidVolume: null };
  });
  
  const depthChartData = [...depthBids, ...depthAsks];

  return (
    <div className="flex flex-col h-full overflow-hidden text-[11px] font-mono select-none">
      <div className="flex justify-between px-4 py-2 text-dark-text-muted font-sans border-b border-dark-border bg-dark-surface shrink-0">
        <div className="flex gap-4">
          <button 
            onClick={() => setViewMode('BOOK')}
            className={`font-medium transition-colors cursor-pointer ${viewMode === 'BOOK' ? 'text-white' : 'hover:text-white text-dark-text-muted'}`}
          >
            Order Book
          </button>
          <button 
            onClick={() => setViewMode('DEPTH')}
            className={`font-medium transition-colors cursor-pointer ${viewMode === 'DEPTH' ? 'text-white' : 'hover:text-white text-dark-text-muted'}`}
          >
            Depth Chart
          </button>
        </div>
      </div>
      
      {viewMode === 'BOOK' ? (
        <>
          <div className="flex justify-between px-4 py-1.5 text-dark-text-muted shrink-0 text-xs mt-1">
            <span>Price(USDT)</span>
            <span>Amount</span>
          </div>

          {/* Asks (Sell Orders) */}
          <div className="flex-1 overflow-hidden flex flex-col justify-end gap-[2px]">
            {displayAsks.map((ask) => (
              <div key={ask.id} className="flex justify-between px-4 hover:bg-dark-surface/80 cursor-pointer relative group">
                <div className="absolute right-0 top-0 bottom-0 bg-[#F43F5E]/15 transition-all duration-300 ease-in-out" style={{ width: `${ask.depth}%` }}></div>
                <span className={`text-[#F43F5E] relative z-10 font-bold group-hover:transition-all ${ask.isReal ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}>{ask.price}</span>
                <span className="text-white relative z-10 opacity-90 group-hover:opacity-100 font-semibold flex items-center justify-end gap-1">
                  {ask.isReal && <span className="w-1 h-1 bg-primary-500 rounded-full animate-pulse" title="Real User Order" />}
                  {ask.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Current Price Ticker Middle Ribbon */}
          <div className="py-2 px-4 flex items-center gap-2 border-y border-dark-border my-1.5 bg-dark-surface/30 shrink-0">
            <span className={`${priceColor} text-lg font-extrabold transition-colors delay-75`}>
              {currentPrice.toLocaleString(undefined, { minimumFractionDigits: initialBase > 10 ? 2 : 5 })} 
            </span>
            <span className="text-dark-text-muted text-sm font-semibold cursor-pointer hover:text-white transition-colors" title="Reference Price">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: initialBase > 10 ? 2 : 5 })}
            </span>
          </div>

          {/* Bids (Buy Orders) */}
          <div className="flex-1 overflow-hidden flex flex-col gap-[2px]">
            {displayBids.map((bid) => (
              <div key={bid.id} className="flex justify-between px-4 hover:bg-dark-surface/80 cursor-pointer relative group">
                <div className="absolute right-0 top-0 bottom-0 bg-[#10B981]/15 transition-all duration-300 ease-in-out" style={{ width: `${bid.depth}%` }}></div>
                <span className={`text-[#10B981] relative z-10 font-bold group-hover:transition-all ${bid.isReal ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}>{bid.price}</span>
                <span className="text-white relative z-10 opacity-90 group-hover:opacity-100 font-semibold flex items-center justify-end gap-1">
                  {bid.isReal && <span className="w-1 h-1 bg-primary-500 rounded-full animate-pulse" title="Real User Order" />}
                  {bid.amount}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col relative w-full h-full p-2 bg-dark-bg">
          <span className="text-[10px] text-dark-text-muted absolute top-4 left-4 z-10 tracking-widest font-sans font-bold">MARKET DEPTH</span>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={depthChartData} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAsk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E2026', borderColor: '#2A2D35', fontSize: '11px', borderRadius: '4px' }}
                itemStyle={{ fontWeight: 'bold' }}
                labelFormatter={(val) => `Price: ${val}`}
              />
              <Area type="step" dataKey="bidVolume" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorBid)" connectNulls />
              <Area type="step" dataKey="askVolume" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorAsk)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

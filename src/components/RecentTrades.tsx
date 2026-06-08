import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function RecentTrades({ activePair = 'BTC' }: { activePair?: string }) {
  const [realTrades, setRealTrades] = useState<any[]>([]);
  
  const basePrices: Record<string, number> = {
    'BTC': 77298.51, 'ETH': 2117.94, 'SOL': 145.20, 'BNB': 612.40,
    'AVAX': 34.85, 'DOGE': 0.41240, 'PEPE': 0.00001543
  };
  const currentBasePrice = basePrices[activePair] || 100;

  const mockTrades: any[] = [];

  useEffect(() => {
    const q = query(
      collection(db, 'trades'),
      where('pair', '==', `${activePair}/USDT`),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          price: data.price.toFixed(currentBasePrice > 10 ? 2 : 5),
          amount: data.amount.toString(),
          time: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: data.side === 'Buy' ? 'buy' : 'sell',
          isReal: true
        };
      });
      setRealTrades(list.reverse());
    }, (error) => {
      console.error("Trades listener error:", error);
    });
    
    return () => unsubscribe();
  }, [activePair, currentBasePrice]);
  
  const displayTrades = [
    ...realTrades,
    ...mockTrades
  ].slice(0, 25);

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs font-mono">
      <div className="px-4 py-2 text-dark-text-muted font-sans border-b border-dark-border bg-dark-surface shrink-0">
        <button className="hover:text-white font-medium text-white transition-colors">Market Trades</button>
      </div>
      
      <div className="flex justify-between px-4 py-1.5 text-dark-text-muted shrink-0  z-10 bg-dark-bg/80 backdrop-blur-sm">
        <span className="w-1/3">Price(USDT)</span>
        <span className="w-1/3 text-right">Amount</span>
        <span className="w-1/3 text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar custom-scroll pb-2">
        {displayTrades.map((t) => (
          <div key={t.id} className="flex justify-between px-4 py-[3px] hover:bg-dark-surface/80 cursor-pointer animate-fadeIn group">
            <span className={`w-1/3 font-bold group-hover:scale-105 origin-left transition-transform ${t.type === 'buy' ? 'text-[#10B981]' : 'text-[#F43F5E]'} ${t.isReal ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}>
              {t.price}
            </span>
            <span className="w-1/3 text-right text-white font-semibold flex items-center justify-end gap-1">
              {t.isReal && <span className="w-1 h-1 bg-primary-500 rounded-full animate-pulse" title="Real User Trade" />}
              {t.amount}
            </span>
            <span className="w-1/3 text-right text-dark-text-muted">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

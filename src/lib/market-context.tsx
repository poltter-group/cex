import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from './auth-context';

type MarketPrices = Record<string, number>;

interface MarketContextType {
  prices: MarketPrices;
}

const defaultPrices: MarketPrices = {
  'BTC': 77298.50, 'ETH': 2117.94, 'SOL': 145.20, 'BNB': 612.40, 'AVAX': 34.85, 'XRP': 1.14, 'ADA': 0.62,
  'XAUUSD': 4508.01, 'XAGUSD': 75.41, 'EURUSD': 1.15873, 'GBPUSD': 1.34215, 'USDJPY': 149.82,
  'PEPE': 0.00001543, 'DOGE': 0.41240, 'SHIB': 0.00002514, 'WIF': 3.1250, 'BANANA': 0.01301, 'KEVIN': 0.0007324
};

const MarketContext = createContext<MarketContextType>({ prices: defaultPrices });

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<MarketPrices>(defaultPrices);
  const { user, profile, updateBalance, updateAssetBalance } = useAuth();
  const [openOrders, setOpenOrders] = useState<any[]>([]);

  // Fetch real-time prices via Binance WebSocket
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setPrices(prev => {
            const next = { ...prev };
            let updated = false;
            
            data.forEach(ticker => {
              // We match our active pairs. E.g. BTCUSDT -> BTC
              if (ticker.s.endsWith('USDT')) {
                const asset = ticker.s.replace('USDT', '');
                if (next[asset] !== undefined) {
                  next[asset] = parseFloat(ticker.c);
                  updated = true;
                }
              }
            });
            
            return updated ? next : prev;
          });
        }
      } catch (err) {
        console.error("Error parsing Binance WebSocket data", err);
      }
    };

    ws.onerror = (error) => {
      console.error("Binance WebSocket error", error);
    };

    return () => {
      if (ws.readyState === 1) {
        ws.close();
      }
    };
  }, []);

  // Fetch Open Orders
  useEffect(() => {
    if (!user) {
      setOpenOrders([]);
      return;
    }
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid), where('status', '==', 'Open'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOpenOrders(list);
    });
    return () => unsub();
  }, [user]);

  // Order Matching Engine
  useEffect(() => {
    if (openOrders.length === 0 || !user) return;

    for (const order of openOrders) {
      const activePair = order.pair.split('/')[0] || order.pair;
      const currentPrice = prices[activePair];
      if (!currentPrice) continue;

      let shouldFill = false;

      // Limit Order Logic
      if (order.side === 'Buy' && currentPrice <= order.price) {
        shouldFill = true; // Buy Limit hit
      } else if (order.side === 'Sell' && currentPrice >= order.price) {
        shouldFill = true; // Sell Limit hit
      }

      // Check Stop Loss / Take profit for existing positions (if we had position DB, but here they are attached to orders or stand alone)
      
      if (shouldFill) {
        // Execute the fill
        (async () => {
          try {
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, { status: 'Filled' });

            // Create trade record
            const tradePayload = {
              userId: user.uid,
              orderId: order.id,
              pair: order.pair,
              side: order.side,
              price: currentPrice, // Executed at current price
              amount: order.amount,
              total: currentPrice * order.amount,
              fee: (currentPrice * order.amount) * 0.001,
              createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'trades'), tradePayload);

            // Settle assets:
            if (order.side === 'Buy') {
               // Limit buy already took margin originally, we just give them the asset
               await updateAssetBalance(activePair, order.amount);
            } else {
               // Limit sell already locked asset originally, give them the USD
               await updateBalance(currentPrice * order.amount, 0);
            }
          } catch(e) {
            console.error("Order matching failed:", e);
          }
        })();
      }
    }
  }, [prices, openOrders, user]);

  return (
    <MarketContext.Provider value={{ prices }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  return useContext(MarketContext);
}

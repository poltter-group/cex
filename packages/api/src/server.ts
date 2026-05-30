import { Router } from 'express';

export const buildApp = () => {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  router.get('/markets', (req, res) => {
    res.json({
      Crypto: [
        { coin: 'BTC', name: 'Bitcoin', price: '77,298.51', change: '+2.45%', isUp: true },
        { coin: 'ETH', name: 'Ethereum', price: '2,117.94', change: '-0.76%', isUp: false },
        { coin: 'SOL', name: 'Solana', price: '145.20', change: '+12.3%', isUp: true },
        { coin: 'AVAX', name: 'Avalanche', price: '34.85', change: '-2.10%', isUp: false },
        { coin: 'BNB', name: 'BNB Coin', price: '612.40', change: '+0.85%', isUp: true },
        { coin: 'XRP', name: 'Ripple', price: '1.14', change: '-0.50%', isUp: false },
        { coin: 'ADA', name: 'Cardano', price: '0.62', change: '+1.40%', isUp: true }
      ],
      Spot: [
        { coin: 'XAUUSD', name: 'Gold Forex Spot vs USD', price: '4,508.01', change: '-0.84%', isUp: false },
        { coin: 'XAGUSD', name: 'Silver Forex Spot vs USD', price: '75.41', change: '+2.54%', isUp: true },
        { coin: 'EURUSD', name: 'Euro vs USD', price: '1.15873', change: '-0.29%', isUp: false },
        { coin: 'GBPUSD', name: 'Pound vs USD', price: '1.34215', change: '+0.45%', isUp: true },
        { coin: 'USDJPY', name: 'USD vs Japanese Yen', price: '149.82', change: '-0.12%', isUp: false }
      ],
      Memecoin: [
        { coin: 'PEPE', name: 'Pepe Coin', price: '0.00001543', change: '+12.8%', isUp: true },
        { coin: 'DOGE', name: 'Dogecoin', price: '0.41240', change: '+4.82%', isUp: true },
        { coin: 'SHIB', name: 'Shiba Inu', price: '0.00002514', change: '+2.15%', isUp: true },
        { coin: 'WIF', name: 'dogwifhat', price: '3.1250', change: '-5.40%', isUp: false },
        { coin: 'BANANA', name: 'Banana Coin', price: '0.01301', change: '+6.34%', isUp: true },
        { coin: 'KEVIN', name: 'Kevin Meme', price: '0.0007324', change: '+1893.5%', isUp: true }
      ]
    });
  });

  return router;
};

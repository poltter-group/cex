import React, { useState, useEffect } from "react";
import { ArrowRight, TrendingUp, Flame, Star, Hexagon, Sparkles } from "lucide-react";
import { useMarket } from "../lib/market-context";
import { motion } from "motion/react";

export function Home({
  setCurrentView,
  setAuthMode
}: {
  setCurrentView: (v: any) => void;
  setAuthMode: (m: 'LOGIN' | 'REGISTER') => void;
}) {
  const { prices } = useMarket();
  const [traderCount, setTraderCount] = useState(318973208);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTraderCount(prev => prev + Math.floor(Math.random() * 3) + 1);
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(timer);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: "Hot Assets",
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      assets: [
        { code: "BTC", name: "Bitcoin", change: "+2.45%", isUp: true },
        { code: "ETH", name: "Ethereum", change: "-0.76%", isUp: false },
        { code: "SOL", name: "Solana", change: "+12.30%", isUp: true }
      ]
    },
    {
      title: "New Listings",
      icon: <Star className="w-4 h-4 text-yellow-500" />,
      assets: [
        { code: "HYPE", name: "Hyperliquid", change: "+19.54%", isUp: true },
        { code: "KEVIN", name: "Kevin Meme", change: "+1893.5%", isUp: true },
        { code: "BANANA", name: "Banana Coin", change: "+6.34%", isUp: true }
      ]
    },
    {
      title: "Top Gainers",
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      assets: [
        { code: "KEVIN", name: "Kevin Meme", change: "+1893.5%", isUp: true },
        { code: "SOL", name: "Solana", change: "+12.30%", isUp: true },
        { code: "PEPE", name: "Pepe Coin", change: "+12.80%", isUp: true }
      ]
    }
  ];

  return (
    <div className="w-full bg-dark-bg text-dark-text pb-24 flex flex-col flex-1 relative overflow-hidden">
      
      {/* Background Neon Glow Orbs */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-primary-500/10 via-transparent to-transparent rounded-full blur-[140px] pointer-events-none opacity-40 z-0" />
      <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none opacity-30 z-0" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none opacity-20 z-0" />
      
      {/* Dynamic Cyber Grid Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-30 mask-gradient-b z-0" />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-28 pb-16 px-4 text-center mt-6 z-10 relative">
        <motion.h1 
          className={`text-display-lg md:text-6xl font-black mb-4 tracking-tighter select-none font-sans drop-shadow-[0_2px_10px_rgba(255,255,255,0.05)] transition-all duration-300 ${pulse ? 'text-primary-400 scale-[1.01]' : 'text-white'}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {traderCount.toLocaleString()}
        </motion.h1>
        
        <motion.h2 
          className="text-headline-xl md:text-2xl font-black text-dark-text-muted tracking-tight mb-8 font-mono select-none"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          GLOBAL TRADERS TRUST CEX<span className="text-white">PRO</span>
        </motion.h2>
        
        <motion.div 
          className="flex items-center gap-10 mt-2 mb-12 justify-center max-w-4xl font-medium text-xs font-mono uppercase tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-primary-500 font-extrabold text-[10px]">Tier 1</span>
            <span className="text-white">Crypto Exchange</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-primary-500 font-extrabold text-[10px]">$48.5B</span>
            <span className="text-white">24h volume</span>
          </div>
        </motion.div>

        <motion.div 
          className="w-full max-w-lg bg-dark-surface/40 backdrop-blur-md border border-dark-border rounded-xl p-1.5 flex items-center justify-between mb-8 pl-4 group focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20 transition-all mx-auto shadow-2xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <input 
            type="text" 
            placeholder="Email address or Phone number" 
            className="bg-transparent border-none outline-none text-white text-xs flex-1 placeholder-white/20 font-mono tracking-wide"
          />
          <button 
            className="bg-primary-500 hover:bg-white text-black font-black px-6 py-2.5 rounded text-xs transition-colors border-none uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => { setAuthMode('REGISTER'); setCurrentView('AUTH'); }}
          >
            Sign Up
          </button>
        </motion.div>
      </section>

      {/* Tickers Section */}
      <section className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-6 px-6 z-10 relative">
        {columns.map((col, i) => (
          <motion.div 
            key={i} 
            className="flex-1 bg-dark-surface/30 backdrop-blur-sm rounded-xl border border-dark-border p-6 hover:border-primary-500/30 hover:bg-dark-surface/60 transition-all duration-300 cursor-pointer shadow-lg group" 
            onClick={() => setCurrentView('MARKETS')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-6 font-mono font-black text-xs text-white uppercase tracking-wider border-b border-white/5 pb-3">
              {col.icon} 
              <span className="tracking-widest">{col.title}</span> 
              <ArrowRight className="w-4 h-4 ml-auto text-dark-text-muted group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="flex flex-col gap-3">
              {col.assets.map((asset, idx) => {
                const livePriceRaw = prices[asset.code] || (
                  asset.code === "BTC" ? 77298.50 :
                  asset.code === "ETH" ? 2117.94 :
                  asset.code === "SOL" ? 145.20 :
                  asset.code === "HYPE" ? 61.41 :
                  asset.code === "KEVIN" ? 0.0007324 :
                  asset.code === "BANANA" ? 0.01301 : 0.00001543
                );
                const decimals = livePriceRaw < 1 ? (livePriceRaw < 0.001 ? 7 : 4) : 2;
                const formattedPrice = livePriceRaw.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

                return (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-white/[0.02] pb-3 last:border-0 last:pb-0 hover:bg-white/[0.02] transition-colors p-2.5 -mx-2.5 rounded-lg group/item">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-extrabold group-hover/item:text-primary-500 transition-colors font-sans">{asset.code}</span>
                      <span className="text-dark-text-muted text-[10px] font-mono uppercase tracking-widest">{asset.name}</span>
                    </div>
                    <div className="flex gap-4 text-right items-center">
                      <span className="text-white font-mono font-bold">${formattedPrice}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${!asset.isUp ? "text-[#F43F5E] bg-[#F43F5E]/10" : "text-[#10B981] bg-[#10B981]/10 font-bold"}`}>
                        {asset.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}

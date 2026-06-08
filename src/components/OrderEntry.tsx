import { useState } from 'react';
import { useAuth, getWalletBalance } from '../lib/auth-context';
import { useMarket } from '../lib/market-context';
import { AlertCircle, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { placeSpotOrder } from '../lib/spot-engine';

export function OrderEntry({ 
  activePair = 'BTC',
  setCurrentView,
  setAuthMode
}: { 
  activePair?: string;
  setCurrentView?: (v: 'HOME' | 'MARKETS' | 'AUTH' | 'SPOT') => void;
  setAuthMode?: (m: 'LOGIN' | 'REGISTER') => void;
}) {
  const [orderType, setOrderType] = useState('Limit');
  const { user, profile, updateBalance, updateAssetBalance } = useAuth();
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  
  // TP/SL states
  const [enableTPSL, setEnableTPSL] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');

  const [soundEnabled, setSoundEnabled] = useState(true);

  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { prices } = useMarket();
  const activePrice = (prices[activePair] || 1.00).toFixed(5);
  
  // Extract pure assets for Spot logic mapping
  const quoteAsset = activePair.endsWith('USDT') ? 'USDT' : activePair.endsWith('USD') ? 'USD' : 'USDT';
  const baseAsset = activePair.replace(/USDT|USD$/, '');

  // Derive walletType from pair
  const cat = (['XAU', 'XAG', 'EUR', 'GBP', 'JPY'].includes(baseAsset) || activePair.endsWith('USD')) 
                ? 'SPOT' 
                : (['DOGE', 'SHIB', 'PEPE', 'WIF', 'BANANA', 'KEVIN'].includes(baseAsset)) 
                ? 'MEMECOIN' 
                : 'CRYPTO';

  const availableQuote = getWalletBalance(profile, cat, quoteAsset);
  const availableBase = getWalletBalance(profile, cat, baseAsset);

  const handlePriceChange = (val: string) => {
    setPrice(val);
    const p = parseFloat(val);
    const a = parseFloat(amount);
    if (!isNaN(p) && !isNaN(a)) {
      setTotal((p * a).toFixed(2));
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const p = parseFloat(price || activePrice);
    const a = parseFloat(val);
    if (!isNaN(p) && !isNaN(a)) {
      setTotal((p * a).toFixed(2));
    }
  };

  const handleTotalChange = (val: string) => {
    setTotal(val);
    const p = parseFloat(price || activePrice);
    const t = parseFloat(val);
    if (!isNaN(p) && !isNaN(t) && p > 0) {
      setAmount((t / p).toFixed(6));
    }
  };

  const playDing = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { }
  };

  const handleOrder = async (side: 'Buy' | 'Sell') => {
    setMsg('');
    setErrorMsg('');
    
    if (!user || !profile) {
      setErrorMsg('Please log in to place trades.');
      return;
    }

    const orderPrice = orderType === 'Market' ? parseFloat(activePrice) : parseFloat(price || activePrice);
    const orderAmount = parseFloat(amount);
    // Force total to equal exact mathematically valid value
    const orderTotal = parseFloat((orderPrice * orderAmount).toFixed(2));

    if (isNaN(orderPrice) || orderPrice <= 0) {
      setErrorMsg('Please enter a valid price.');
      return;
    }
    if (isNaN(orderAmount) || orderAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    // Check balance
    if (side === 'Buy' && availableQuote < orderTotal) {
      setErrorMsg(`Insufficient balance. Requires $${orderTotal.toLocaleString(undefined, {maximumFractionDigits: 2})} ${quoteAsset} but you have $${availableQuote.toLocaleString(undefined, {maximumFractionDigits: 2})} ${quoteAsset} in ${cat} wallet.`);
      return;
    }
    
    if (side === 'Sell' && availableBase < orderAmount) {
      setErrorMsg(`Insufficient asset quantity. You want to sell ${orderAmount} ${baseAsset} but only have ${availableBase} ${baseAsset} in ${cat} wallet.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await placeSpotOrder({
        userId: user.uid,
        baseAsset,
        quoteAsset,
        walletType: cat,
        side,
        type: orderType,
        amount: orderAmount,
        price: orderPrice,
        tp: enableTPSL ? tpPrice : undefined,
        sl: enableTPSL ? slPrice : undefined,
      });

      playDing();
      setMsg(`${side} order placed successfully ${orderType === 'Market' ? '(Executed)' : '(Limit Active)'}!`);
      setAmount('');
      setTotal('');
      setTpPrice('');
      setSlPrice('');
      setEnableTPSL(false);

      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'An error occurred submitting the order.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 relative custom-scroll">
      {msg && (
        <div className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 p-2.5 rounded text-center text-xs font-semibold flex items-center justify-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {msg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-2.5 rounded text-center text-xs font-semibold flex items-center justify-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Type Tabs */}
      <div className="flex gap-4 text-xs font-bold border-b border-dark-border mb-4 relative">
        {['Limit', 'Market', 'Stop-limit'].map((type) => (
          <button 
            key={type}
            onClick={() => setOrderType(type)}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${orderType === type ? 'text-primary-500 border-primary-500' : 'text-dark-text-muted border-transparent hover:text-white'}`}
          >
            {type}
          </button>
        ))}
        
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="absolute right-0 top-0 bottom-2 text-dark-text-muted hover:text-white transition-colors flex items-center justify-center px-2 cursor-pointer"
          title={soundEnabled ? "Mute Order Sounds" : "Enable Order Sounds"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Wallet Balance Display */}
      <div className="flex flex-col gap-1 text-xs text-dark-text-muted mb-4 bg-dark-bg/40 p-2 border border-dark-border/40 rounded-lg">
        <div className="flex justify-between items-center">
          <span>{cat} {quoteAsset}</span>
          <span className="font-mono text-white font-semibold">
            {profile ? `$${availableQuote.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'} {quoteAsset}
          </span>
        </div>
        {profile && (
          <div className="flex justify-between items-center">
            <span>{cat} {baseAsset}</span>
            <span className="font-mono text-primary-500 font-semibold">
              {availableBase.toLocaleString(undefined, { maximumFractionDigits: 6 })} {baseAsset}
            </span>
          </div>
        )}
      </div>
      
      {/* Inputs */}
      <div className="flex flex-col gap-3">
        {orderType !== 'Market' && (
          <div className="bg-dark-bg rounded border border-dark-border/60 flex items-center px-3 h-10 group focus-within:border-white transition-colors">
            <span className="text-dark-text-muted text-xs w-12 shrink-0 font-medium">Price</span>
            <input 
              type="number" 
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder={activePrice}
              className="flex-1 bg-transparent w-full min-w-0 text-right outline-none text-sm font-mono text-white font-bold" 
            />
            <span className="text-dark-text-muted text-xs ml-2 font-mono shrink-0">{quoteAsset}</span>
          </div>
        )}
        {orderType === 'Market' && (
          <div className="bg-dark-bg/40 rounded border border-dark-border/40 flex items-center px-3 h-10 group cursor-not-allowed">
            <span className="text-dark-text-muted text-xs w-12 shrink-0 font-medium">Price</span>
            <div className="flex-1 text-right text-sm font-mono text-white/50 font-bold overflow-hidden text-ellipsis whitespace-nowrap">Market Price ≈ {activePrice}</div>
            <span className="text-dark-text-muted text-xs ml-2 font-mono shrink-0">{quoteAsset}</span>
          </div>
        )}
        
        <div className="bg-dark-bg rounded border border-dark-border/60 flex items-center px-3 h-10 group focus-within:border-white transition-colors">
          <span className="text-dark-text-muted text-xs w-12 shrink-0 font-medium">Amount</span>
          <input 
            type="number" 
            value={amount}
            required
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00" 
            className="flex-1 bg-transparent w-full min-w-0 text-right outline-none text-sm font-mono text-white font-bold" 
          />
          <span className="text-dark-text-muted text-xs ml-2 font-semibold shrink-0">{baseAsset}</span>
        </div>
        
        {/* Percentage Slider Shortcuts */}
        <div className="relative pt-4 pb-2 px-1">
          <input 
             type="range" 
             min="0" 
             max="100" 
             step="1"
             defaultValue={0}
             onChange={(e) => {
                const pct = parseFloat(e.target.value);
                const orderPrice = orderType === 'Market' ? parseFloat(activePrice) : parseFloat(price || activePrice);
                if (!orderPrice) return;
                const baseValue = availableBase * orderPrice;
                if (baseValue > availableQuote) {
                  const a = availableBase * (pct / 100);
                  setAmount(a.toFixed(6));
                  setTotal((a * orderPrice).toFixed(2));
                } else {
                  const t = availableQuote * (pct / 100);
                  setTotal(t.toFixed(2));
                  setAmount((t / orderPrice).toFixed(6));
                }
             }}
             className="w-full h-1 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-[9px] text-dark-text-muted mt-2 font-bold px-1 relative">
            <span className="w-1/4 text-left">0%</span>
            <span className="w-1/4 text-center">25%</span>
            <span className="w-1/4 text-center">50%</span>
            <span className="w-1/4 text-center">75%</span>
            <span className="w-1/4 text-right">100%</span>
          </div>
        </div>
        
        <div className="bg-dark-bg rounded border border-dark-border/60 flex items-center px-3 h-10 group focus-within:border-white transition-colors">
          <span className="text-dark-text-muted text-xs w-12 shrink-0 font-medium">Total</span>
          <input 
            type="number" 
            value={total}
            onChange={(e) => handleTotalChange(e.target.value)}
            placeholder="0.00" 
            className="flex-1 bg-transparent w-full min-w-0 text-right outline-none text-sm font-mono text-white font-bold" 
          />
          <span className="text-dark-text-muted text-xs ml-2 font-mono shrink-0">{quoteAsset}</span>
        </div>

        {/* Take Profit & Stop Loss Checkbox Expandable Accordion */}
        <div className="mt-2 border border-dark-border/40 rounded-lg p-2.5 bg-dark-bg/20">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={enableTPSL}
              onChange={(e) => setEnableTPSL(e.target.checked)}
              className="rounded bg-dark-bg border border-dark-border text-primary-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-white">Add Take Profit / Stop Loss (TP/SL)</span>
          </label>

          {enableTPSL && (
            <div className="mt-3 space-y-2 pt-2.5 border-t border-dark-border/40 animate-fadeIn">
              <div className="bg-dark-bg rounded border border-dark-border flex items-center px-3 h-9 group focus-within:border-white transition-colors">
                <span className="text-dark-text-muted text-xs shrink-0 whitespace-nowrap mr-2 font-medium">Take Profit</span>
                <input 
                  type="number" 
                  value={tpPrice}
                  onChange={(e) => setTpPrice(e.target.value)}
                  placeholder="Exit target" 
                  className="flex-1 bg-transparent text-right w-full min-w-0 outline-none text-xs font-mono text-white" 
                />
                <span className="text-dark-text-muted text-[10px] ml-2 font-mono shrink-0">USDT</span>
              </div>
              <div className="bg-dark-bg rounded border border-dark-border flex items-center px-3 h-9 group focus-within:border-white transition-colors">
                <span className="text-dark-text-muted text-xs shrink-0 whitespace-nowrap mr-2 font-medium">Stop Loss</span>
                <input 
                  type="number" 
                  value={slPrice}
                  onChange={(e) => setSlPrice(e.target.value)}
                  placeholder="Stop limit" 
                  className="flex-1 bg-transparent text-right w-full min-w-0 outline-none text-xs font-mono text-white" 
                />
                <span className="text-dark-text-muted text-[10px] ml-2 font-mono shrink-0">USDT</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Execution Buttons */}
        <div className="flex gap-2.5 mt-4">
          {!user ? (
            <button 
              type="button"
              className="flex-1 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-black font-bold py-3.5 rounded transition-all text-sm border-none"
              onClick={() => {
                if (setAuthMode && setCurrentView) {
                  setAuthMode('LOGIN');
                  setCurrentView('AUTH');
                }
              }}
            >
              Sign In To Place Order
            </button>
          ) : (
            <>
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => handleOrder('Buy')}
                className="flex-1 bg-buy hover:bg-buy/90 disabled:opacity-50 active:scale-[0.98] py-3 rounded text-white font-bold text-sm transition-all border-none"
              >
                {isSubmitting ? 'Sending...' : `Buy ${baseAsset}`}
              </button>
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => handleOrder('Sell')}
                className="flex-1 bg-[#F43F5E] hover:bg-[#F43F5E]/95 disabled:opacity-50 active:scale-[0.98] py-3 rounded text-white font-bold text-sm transition-all border-none"
              >
                {isSubmitting ? 'Sending...' : `Sell ${baseAsset}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

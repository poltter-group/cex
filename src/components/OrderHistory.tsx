import { useState, useEffect } from 'react';
import { useAuth, getWalletBalance } from '../lib/auth-context';
import { useMarket } from '../lib/market-context';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Loader2, XCircle, CheckCircle, Filter, FileText, Download } from 'lucide-react';
import { placeSpotOrder, cancelSpotOrder, simulateFillSpotOrder } from '../lib/spot-engine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Order {
  id: string;
  userId: string;
  pair: string;
  category: string;
  type: string;
  side: string;
  price: number;
  amount: number;
  total: number;
  tp: number | null;
  sl: number | null;
  status: 'Open' | 'Filled' | 'Canceled';
  createdAt: any;
}

interface Trade {
  id: string;
  userId: string;
  orderId: string;
  pair: string;
  side: string;
  price: number;
  amount: number;
  total: number;
  fee: number;
  createdAt: any;
}

export function OrderHistory() {
  const { user, profile, updateBalance, updateAssetBalance } = useAuth();
  const { prices } = useMarket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'OPEN' | 'HISTORY' | 'TRADES'>('POSITIONS');
  
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FILLED' | 'CANCELED'>('ALL');
  const [tradeSideFilter, setTradeSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [tradePairFilter, setTradePairFilter] = useState<string>('ALL');

  const positions: any[] = [];
  if (profile) {
     ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'TRX', 'PEPE', 'SHIB', 'ADA', 'AVAX', 'XAU', 'XAG', 'EUR', 'GBP', 'JPY'].forEach(coin => {
        const cat = (['XAU', 'XAG', 'EUR', 'GBP', 'JPY'].includes(coin) || coin === 'USD') 
                     ? 'SPOT' 
                     : (['DOGE', 'SHIB', 'PEPE', 'WIF', 'BANANA', 'KEVIN'].includes(coin)) 
                     ? 'MEMECOIN' 
                     : 'CRYPTO';
        
        const amount = getWalletBalance(profile, cat, coin);
        if (amount > 0) {
           const currentPrice = prices[coin] || 0;
           
           const entryTrades = trades.filter(t => t.side === 'Buy' && (t.pair === coin + 'USDT' || t.pair === coin + 'USD'));
           const totalCost = entryTrades.reduce((acc, t) => acc + (t.price * t.amount), 0);
           const totalAmount = entryTrades.reduce((acc, t) => acc + t.amount, 0);
           
           const avgEntry = totalAmount > 0 ? totalCost / totalAmount : currentPrice;
           const pnl = (currentPrice - avgEntry) * amount;
           const pnlPercent = avgEntry > 0 ? ((currentPrice - avgEntry) / avgEntry) * 100 : 0;

           positions.push({
              coin,
              amount,
              currentPrice,
              avgEntry,
              pnl,
              pnlPercent,
              valueUSDT: amount * currentPrice
           });
        }
     });
  }

  const handleClosePosition = async (coin: string, amount: number, currentPrice: number) => {
     if (!user || currentPrice <= 0 || amount <= 0) return;
     try {
       const walletType = (['XAU', 'XAG', 'EUR', 'GBP', 'JPY'].includes(coin) || coin.endsWith('USD')) 
                ? 'SPOT' 
                : (['DOGE', 'SHIB', 'PEPE', 'WIF', 'BANANA', 'KEVIN'].includes(coin)) 
                ? 'MEMECOIN' 
                : 'CRYPTO';

       await placeSpotOrder({
           userId: user.uid,
           baseAsset: coin,
           quoteAsset: 'USDT',
           walletType: walletType,
           side: 'Sell',
           type: 'Market',
           amount: amount,
           price: currentPrice
       });
     } catch (e) {
       console.error(e);
     }
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setTrades([]);
      return;
    }

    setLoading(true);
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const tradesQuery = query(collection(db, 'trades'), where('userId', '==', user.uid));
    
    // Subscribe to Orders
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data
        } as Order);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(list);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // Subscribe to Trades
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const list: Trade[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data
        } as Trade);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setTrades(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trades');
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTrades();
    };
  }, [user]);

  const handleCancelOrder = async (order: Order) => {
    try {
      await cancelSpotOrder(order.id, user!.uid);
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleFillOrder = async (order: Order) => {
    try {
      await simulateFillSpotOrder(order.id, user!.uid);
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const openOrders = orders.filter(o => o.status === 'Open');
  
  const finishedOrders = orders.filter(o => {
    if (o.status === 'Open') return false;
    if (statusFilter === 'FILLED' && o.status !== 'Filled') return false;
    if (statusFilter === 'CANCELED' && o.status !== 'Canceled') return false;
    return true;
  });

  const distinctTradePairs = Array.from(new Set(trades.map(t => t.pair)));
  const filteredTrades = trades.filter(t => {
    if (tradeSideFilter === 'BUY' && t.side !== 'Buy') return false;
    if (tradeSideFilter === 'SELL' && t.side !== 'Sell') return false;
    if (tradePairFilter !== 'ALL' && t.pair !== tradePairFilter) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    if (status === 'Filled') return 'text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded';
    if (status === 'Canceled') return 'text-dark-text-muted bg-dark-surface px-1.5 py-0.5 rounded';
    return 'text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded';
  };

  const handleDownloadCSV = () => {
    if (filteredTrades.length === 0) return;
    
    const headers = ['Execution Date', 'Pair', 'Side', 'Price (USDT)', 'Amount', 'Total (USDT)', 'Fee (USDT)', 'Order ID'];
    const csvRows = [headers.join(',')];
    
    filteredTrades.forEach(trade => {
      const tradeDate = trade.createdAt?.seconds 
        ? new Date(trade.createdAt.seconds * 1000).toLocaleString()
        : 'Pending';
      
      const row = [
        `"${tradeDate}"`,
        `"${trade.pair}"`,
        `"${trade.side}"`,
        `"${trade.price}"`,
        `"${trade.amount}"`,
        `"${trade.total}"`,
        `"${trade.fee}"`,
        `"${trade.orderId}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (filteredTrades.length === 0) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('CEXPRO Trade History Ledger', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    if (profile) {
       doc.text(`Account ID: ${user!.uid}`, 14, 36);
    }

    const tableData = filteredTrades.map(trade => {
      const tradeDate = trade.createdAt?.seconds 
        ? new Date(trade.createdAt.seconds * 1000).toLocaleString()
        : 'Pending';
      
      return [
        tradeDate,
        trade.pair,
        trade.side,
        `$${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        trade.amount,
        `$${trade.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        `$${trade.fee.toFixed(4)}`,
        trade.orderId.substring(0, 8)
      ];
    });

    autoTable(doc, {
      startY: 44,
      head: [['Date', 'Pair', 'Side', 'Price', 'Amount', 'Total', 'Fee', 'Order ID']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
    });

    doc.save(`cexpro_trade_ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center px-1 pt-4 border-b border-white/[0.05] shrink-0 select-none">
        <div className="flex gap-6 text-xs font-bold">
          <button 
            onClick={() => setActiveTab('POSITIONS')}
            className={`pb-3 transition-all cursor-pointer ${activeTab === 'POSITIONS' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-dark-text-muted hover:text-white border-b-2 border-transparent'}`}
          >
            Positions ({positions.length})
          </button>
          <button 
            onClick={() => setActiveTab('OPEN')}
            className={`pb-3 transition-all cursor-pointer ${activeTab === 'OPEN' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-dark-text-muted hover:text-white border-b-2 border-transparent'}`}
          >
            Open Orders ({openOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 transition-all cursor-pointer ${activeTab === 'HISTORY' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-dark-text-muted hover:text-white border-b-2 border-transparent'}`}
          >
            Order History ({finishedOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('TRADES')}
            className={`pb-3 transition-all cursor-pointer ${activeTab === 'TRADES' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-dark-text-muted hover:text-white border-b-2 border-transparent'}`}
          >
            Trade History ({filteredTrades.length})
          </button>
        </div>
      </div>

      {/* Filter Controllers */}
      {activeTab === 'HISTORY' && (
        <div className="flex gap-2 items-center px-4 py-2 border-b border-dark-border/40 bg-dark-bg/40 text-xs shrink-0 select-none animate-fadeIn">
          <span className="text-dark-text-muted font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary-500" /> Filter Status:
          </span>
          {['ALL', 'FILLED', 'CANCELED'].map((fs) => (
            <button
              key={fs}
              onClick={() => setStatusFilter(fs as any)}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-all ${
                statusFilter === fs 
                  ? 'bg-primary-500 text-black' 
                  : 'bg-dark-surface/50 text-dark-text-muted hover:text-white'
              }`}
            >
              {fs}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'TRADES' && (
        <div className="flex flex-wrap gap-4 items-center justify-between px-4 py-2 border-b border-dark-border/40 bg-dark-bg/40 text-xs shrink-0 select-none animate-fadeIn">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 items-center">
              <span className="text-dark-text-muted font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-primary-500" /> Side:
              </span>
              {['ALL', 'BUY', 'SELL'].map((sf) => (
                <button
                  key={sf}
                  onClick={() => setTradeSideFilter(sf as any)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
                    tradeSideFilter === sf 
                      ? 'bg-primary-500 text-black' 
                      : 'bg-dark-surface/50 text-dark-text-muted hover:text-white'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-dark-text-muted font-bold">Pair:</span>
              <select
                value={tradePairFilter}
                onChange={(e) => setTradePairFilter(e.target.value)}
                className="bg-dark-surface border border-dark-border/50 rounded font-mono text-[10px] font-bold text-white px-2 py-0.5 outline-none focus:border-primary-500 transition-colors cursor-pointer"
              >
                <option value="ALL">ALL PAIRS</option>
                {distinctTradePairs.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadCSV}
              disabled={filteredTrades.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-surface border border-dark-border/50 rounded-lg text-[10px] font-bold text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={filteredTrades.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-surface border border-dark-border/50 rounded-lg text-[10px] font-bold text-white hover:bg-primary-500 hover:text-black hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Report
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-y-auto bg-dark-bg/30 custom-scroll">
         {activeTab === 'POSITIONS' ? (
           <div className="grid grid-cols-7 px-4 py-2 text-[10px] uppercase font-bold text-dark-text-muted border-b border-white/[0.05] shrink-0 bg-dark-bg/60 backdrop-blur-md sticky top-0 z-10">
             <div>Asset</div>
             <div className="text-right">Balance</div>
             <div className="text-right">Avg. Entry</div>
             <div className="text-right">Current Price</div>
             <div className="text-right">Value (USDT)</div>
             <div className="text-right">PnL</div>
             <div className="text-right">Action</div>
           </div>
         ) : activeTab === 'TRADES' ? (
           <div className="grid grid-cols-8 px-4 py-2 text-[10px] uppercase font-bold text-dark-text-muted border-b border-white/[0.05] shrink-0 bg-dark-bg/60 backdrop-blur-md sticky top-0 z-10">
             <div>Execution Date</div>
             <div>Pair</div>
             <div>Side</div>
             <div className="text-right">Price (USDT)</div>
             <div className="text-right">Amount</div>
             <div className="text-right">Total (USDT)</div>
             <div className="text-right">Fee (USDT)</div>
             <div className="text-right">Order ID</div>
           </div>
         ) : (
           <div className="grid grid-cols-9 px-4 py-2 text-[10px] uppercase font-bold text-dark-text-muted border-b border-white/[0.05] shrink-0 bg-dark-bg/60 backdrop-blur-md sticky top-0 z-10">
             <div>Date</div>
             <div>Pair</div>
             <div>Type</div>
             <div>Side</div>
             <div className="text-right">Price</div>
             <div className="text-right">Amount</div>
             <div className="text-right">Total (USDT)</div>
             <div className="text-center">TP / SL</div>
             <div className="text-right">Action / Status</div>
           </div>
         )}

         {!user ? (
            <div className="flex-1 flex items-center justify-center text-xs text-dark-text-muted flex-col gap-2 p-6 select-none bg-dark-bg/60">
               <span className="font-medium">Authenticate to explore your active trading desk and ledger logs</span>
            </div>
         ) : loading ? (
            <div className="flex-1 flex items-center justify-center p-8">
               <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            </div>
         ) : activeTab === 'POSITIONS' ? (
            positions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-dark-text-muted p-8 font-medium">
                 No open positions found.
              </div>
            ) : (
              <div className="divide-y divide-dark-border/30">
                {positions.map((pos) => {
                  const pnlColor = pos.pnl > 0 ? 'text-[#10B981]' : pos.pnl < 0 ? 'text-[#F43F5E]' : 'text-dark-text-muted';
                  return (
                    <div key={pos.coin} className="grid grid-cols-7 px-4 py-3 text-xs font-mono items-center hover:bg-dark-surface/10 transition-colors">
                      <div className="font-sans font-bold text-white flex items-center gap-2">
                        {pos.coin}
                      </div>
                      <div className="text-right text-white font-semibold">{pos.amount}</div>
                      <div className="text-right text-dark-text-muted">
                        ${pos.avgEntry > 0 ? pos.avgEntry.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--'}
                      </div>
                      <div className="text-right text-dark-text-muted">
                        ${pos.currentPrice > 0 ? pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--'}
                      </div>
                      <div className="text-right text-white font-bold">
                        ${pos.valueUSDT > 0 ? pos.valueUSDT.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--'}
                      </div>
                      <div className={`text-right font-bold ${pnlColor}`}>
                        {pos.pnl > 0 ? '+' : ''}{pos.pnl.toFixed(2)} ({pos.pnlPercent > 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                      </div>
                      <div className="text-right">
                        <button 
                          onClick={() => handleClosePosition(pos.coin, pos.amount, pos.currentPrice)}
                          disabled={pos.currentPrice <= 0 || pos.amount <= 0}
                          className="px-3 py-1 bg-[#F43F5E] hover:bg-[#F43F5E]/80 text-white font-extrabold text-[10px] uppercase rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Close Market
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
         ) : activeTab === 'TRADES' ? (
           filteredTrades.length === 0 ? (
             <div className="flex-1 flex items-center justify-center text-xs text-dark-text-muted p-8 font-medium">
                No trades found matching criteria
             </div>
           ) : (
              <div className="divide-y divide-dark-border/30">
                {filteredTrades.map((trade) => {
                  const tradeDate = trade.createdAt?.seconds 
                    ? new Date(trade.createdAt.seconds * 1000).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                      new Date(trade.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Pending';
                  return (
                    <div key={trade.id} className="grid grid-cols-8 px-4 py-3 text-xs font-mono items-center hover:bg-dark-surface/10 transition-colors">
                      <div className="text-dark-text-muted">{tradeDate}</div>
                      <div className="font-sans font-bold text-white">{trade.pair}</div>
                      <div className={`font-bold ${trade.side === 'Buy' ? 'text-buy' : 'text-[#F43F5E]'}`}>
                        {trade.side}
                      </div>
                      <div className="text-right text-white font-semibold">${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-right text-white font-semibold">{trade.amount}</div>
                      <div className="text-right text-primary-500 font-bold">${trade.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-right text-dark-text-muted">${trade.fee.toFixed(4)}</div>
                      <div className="text-right text-[10px] text-dark-text-muted font-sans select-all font-semibold break-all overflow-hidden text-ellipsis whitespace-nowrap" title={trade.orderId}>
                        #{trade.orderId.substring(0, 6)}...
                      </div>
                    </div>
                  );
                })}
              </div>
           )
         ) : (activeTab === 'OPEN' ? openOrders : finishedOrders).length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-dark-text-muted p-8 font-medium">
               No active records found matching criteria
            </div>
         ) : (
            <div className="divide-y divide-dark-border/30">
               {(activeTab === 'OPEN' ? openOrders : finishedOrders).map((order) => {
                 const orderDate = order.createdAt?.seconds 
                   ? new Date(order.createdAt.seconds * 1000).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                     new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                   : 'Pending';
                   
                 return (
                   <div key={order.id} className="grid grid-cols-9 px-4 py-3 text-xs font-mono items-center hover:bg-dark-surface/10 transition-colors">
                     <div className="text-dark-text-muted">{orderDate}</div>
                     <div className="font-sans font-bold text-white">{order.pair}</div>
                     <div className="text-dark-text-muted">{order.type}</div>
                     <div className={`font-bold ${order.side === 'Buy' ? 'text-buy' : 'text-[#F43F5E]'}`}>
                       {order.side}
                     </div>
                     <div className="text-right text-white font-semibold">${order.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                     <div className="text-right text-white font-semibold">{order.amount}</div>
                     <div className="text-right text-primary-500 font-bold">${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                     <div className="text-center text-[10px] text-dark-text-muted">
                        {order.tp || order.sl ? (
                          <div className="flex flex-col text-[9px] gap-0.5 font-sans leading-none">
                            {order.tp && <span className="text-[#10B981] font-bold">TP: ${order.tp}</span>}
                            {order.sl && <span className="text-[#F43F5E] font-bold">SL: ${order.sl}</span>}
                          </div>
                        ) : (
                          <span>--</span>
                        )}
                     </div>
                     <div className="text-right">
                        {order.status === 'Open' ? (
                          <div className="flex justify-end gap-1.5 font-sans">
                            <button 
                              onClick={() => handleFillOrder(order)}
                              className="text-[#10B981] hover:bg-[#10B981]/10 px-2 py-1 rounded transition-colors font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              title="Simulate complete execution on this limit order structure"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Fill</span>
                            </button>
                            <button 
                              onClick={() => handleCancelOrder(order)}
                              className="text-[#F43F5E] hover:bg-red-500/10 px-2 py-1 rounded transition-colors font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              title="Cancel limit/stop order structure"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <span className={`${getStatusColor(order.status)} font-extrabold text-[10px] tracking-wide uppercase`}>
                            {order.status}
                          </span>
                        )}
                     </div>
                   </div>
                 );
               })}
            </div>
         )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { Maximize2, RefreshCw, PenTool, Type, Trash2, TrendingUp, Minus } from 'lucide-react';
import { getSpotKlines } from '../lib/spot-engine';

// Moving Average Mathematical Generators
function calculateSMA(data: any[], period: number) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    sma.push({
      time: data[i].time,
      value: sum / period
    });
  }
  return sma;
}

function calculateEMA(data: any[], period: number) {
  const ema = [];
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let prevValue = data[0].close;
  
  // First item SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  prevValue = sum / period;
  
  ema.push({ time: data[period - 1].time, value: prevValue });
  
  for (let i = period; i < data.length; i++) {
    const curValue = data[i].close * k + prevValue * (1 - k);
    ema.push({
      time: data[i].time,
      value: curValue
    });
    prevValue = curValue;
  }
  return ema;
}

function calculateBollingerBands(data: any[], period: number, stdVar: number) {
  const sma = calculateSMA(data, period);
  if (sma.length === 0) return { upper: [], lower: [], basis: [] };
  
  const upper = [];
  const lower = [];
  const basis = [];
  
  let smaIdx = 0;
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[smaIdx].value;
    const sqDiffs = slice.map(d => Math.pow(d.close - mean, 2));
    const variance = sqDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);
    
    basis.push({ time: data[i].time, value: mean });
    upper.push({ time: data[i].time, value: mean + stdVar * std });
    lower.push({ time: data[i].time, value: mean - stdVar * std });
    
    smaIdx++;
  }
  
  return { upper, lower, basis };
}

export function ChartPlaceholder({ activePair = 'BTC' }: { activePair?: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [timeframe, setTimeframe] = useState('1m');
  
  // Indicator Toggles
  const [showMA7, setShowMA7] = useState(true);
  const [showEMA25, setShowEMA25] = useState(true);
  const [showBB, setShowBB] = useState(false);
  
  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<string>('cursor');

  // Hover telemetry
  const [hoveredData, setHoveredData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: any;
  } | null>(null);
  
  const [latestData, setLatestData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: any;
  } | null>(null);

  const overlayBoxRef = useRef<HTMLDivElement>(null);
  const overlayLabelRef = useRef<HTMLDivElement>(null);

  const cleanKey = activePair.toUpperCase().replace('USDT', '').replace('USD', '');
  let priceDecimals = 2;
  if (cleanKey === 'PEPE' || cleanKey === 'SHIB') priceDecimals = 8;
  else if (cleanKey === 'KEVIN') priceDecimals = 7;
  else if (cleanKey === 'BANANA' || cleanKey === 'DOGE') priceDecimals = 5;
  else if (cleanKey === 'EURUSD' || cleanKey === 'GBPUSD') priceDecimals = 5;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth,
        height: chartContainerRef.current?.clientHeight,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#848E9C',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(42, 45, 53, 0.4)' },
        horzLines: { color: 'rgba(42, 45, 53, 0.4)' },
      },
      crosshair: {
        mode: 1, // Magnet
        vertLine: {
          color: 'rgba(240, 185, 11, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1E2026',
        },
        horzLine: {
          color: 'rgba(240, 185, 11, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1E2026',
        },
      },
      timeScale: {
        borderColor: 'rgba(42, 45, 53, 0.6)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 10,
        minBarSpacing: 3,
        shiftVisibleRangeOnNewBar: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 45, 53, 0.6)',
        autoScale: true,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });
    
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });
    
    seriesRef.current = candlestickSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    let assetForBinance = `${activePair}USDT`;
    if (activePair === 'XAUUSD' || activePair === 'XAGUSD') assetForBinance = 'BTCUSDT'; // Binance does not trade gold/silver spot
    else if (activePair === 'EURUSD') assetForBinance = 'EURUSDT';
    else if (activePair === 'GBPUSD') assetForBinance = 'GBPUSDT';
    else if (activePair === 'USDJPY') assetForBinance = 'BTCUSDT'; // Fallback
    else if (activePair.endsWith('USDT')) assetForBinance = activePair;
    else if (activePair.endsWith('USD')) assetForBinance = activePair.replace('USD', 'USDT');
    
    // Convert timeframe to Binance format
    const tfMap: Record<string, string> = {
      '1s': '1s',
      '1m': '1m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d'
    };
    const binanceTf = tfMap[timeframe] || '1m';

    // Dynamic SMA & EMA Overlay Creators
    let ma7Series: any = null;
    let ema25Series: any = null;
    let bbUpperSeries: any = null;
    let bbLowerSeries: any = null;
    let bbBasisSeries: any = null;

    if (showMA7) {
      ma7Series = chart.addSeries(LineSeries, {
        color: '#E91E63',
        lineWidth: 2,
        title: 'MA(7)',
      });
    }

    if (showEMA25) {
      ema25Series = chart.addSeries(LineSeries, {
        color: '#00D1FF',
        lineWidth: 2,
        title: 'EMA(25)',
      });
    }

    if (showBB) {
      bbUpperSeries = chart.addSeries(LineSeries, {
        color: 'rgba(245, 158, 11, 0.4)',
        lineWidth: 1,
      });
      bbLowerSeries = chart.addSeries(LineSeries, {
        color: 'rgba(245, 158, 11, 0.4)',
        lineWidth: 1,
      });
      bbBasisSeries = chart.addSeries(LineSeries, {
        color: 'rgba(245, 158, 11, 0.8)',
        lineWidth: 1,
        title: 'BB(20,2)',
      });
    }

    let isMounted = true;

    // Helper functions inside useEffect to reuse plotting logic
    const applyChartData = (data: any[], volumeData: any[]) => {
       if (!isMounted || !seriesRef.current) return;
       seriesRef.current.setData(data);
       volumeSeries.setData(volumeData);
       let lastBar = data[data.length - 1];
       setLatestData(lastBar);
       
       if (showMA7 && ma7Series) ma7Series.setData(calculateSMA(data, 7));
       if (showEMA25 && ema25Series) ema25Series.setData(calculateEMA(data, 25));
       if (showBB && bbUpperSeries && bbLowerSeries && bbBasisSeries) {
         const bands = calculateBollingerBands(data, 20, 2);
         bbUpperSeries.setData(bands.upper);
         bbLowerSeries.setData(bands.lower);
         bbBasisSeries.setData(bands.basis);
       }
       chart.timeScale().fitContent();
    };

    let allKlines: any[] = [];
    let allVolumes: any[] = [];

    // Attempt to fetch from our Custom Datafeed
    getSpotKlines(`${activePair}/USDT`, binanceTf, 320)
      .then((json: any[]) => {
        if (!isMounted) return;
        if (!Array.isArray(json) || json.length === 0) {
           // Fallback to Binance exclusively for an empty fresh DB to provide visual feedback
           return fetch(`https://api.binance.com/api/v3/klines?symbol=${assetForBinance}&interval=${binanceTf}&limit=320`)
             .then(res => res.json())
             .then((binanceJson: any[]) => {
                if (!isMounted || !Array.isArray(binanceJson)) return;
                const data = binanceJson.map(kline => ({
                  time: (kline[0] / 1000) as any,
                  open: parseFloat(kline[1]),
                  high: parseFloat(kline[2]),
                  low: parseFloat(kline[3]),
                  close: parseFloat(kline[4]),
                }));
                const volumeData = binanceJson.map(kline => {
                  const open = parseFloat(kline[1]); const close = parseFloat(kline[4]);
                  return { time: (kline[0] / 1000) as any, value: parseFloat(kline[5]), color: close >= open ? '#10B981' : '#EF4444' };
                });
                allKlines = data;
                allVolumes = volumeData;
                applyChartData(data, volumeData);
             });
        } else {
           // Processing Our Custom DB Data
           const data = json.map(k => ({
             time: k.time as any,
             open: k.open, high: k.high, low: k.low, close: k.close
           }));
           const volumeData = json.map(k => ({
             time: k.time as any,
             value: k.value,
             color: k.close >= k.open ? '#10B981' : '#EF4444'
           }));
           allKlines = data;
           allVolumes = volumeData;
           applyChartData(data, volumeData);
        }
      })
      .catch(console.error);

    // Live WebSockets / Firestore Real-time Listener for Trades (Building Live Candles)
    let unsubscribeTrades = () => {};
    import('firebase/firestore').then(({ collection, query, where, onSnapshot, limit, orderBy }) => {
       const dbPromise = import('../lib/firebase').then(m => m.db);
       dbPromise.then(firestoreDb => {
          const q = query(
             collection(firestoreDb, 'trades'),
             where('pair', '==', `${activePair}/USDT`),
             orderBy('createdAt', 'desc'),
             limit(1) // Only listen to latest trades for real-time live candle
          );
          unsubscribeTrades = onSnapshot(q, (snapshot) => {
             if (snapshot.empty) return;
             const latestTradeDoc = snapshot.docs[0].data();
             const tradePrice = parseFloat(latestTradeDoc.price);
             const tradeAmount = parseFloat(latestTradeDoc.amount);
             const tradeTime = latestTradeDoc.createdAt?.toMillis ? latestTradeDoc.createdAt.toMillis() : Date.now();
             
             // Calculate bucket time
             let msInterval = 60000;
             const match = binanceTf.match(/^(\d+)([smhd])$/);
             if (match) {
                const val = parseInt(match[1]); const unit = match[2];
                if (unit === 's') msInterval = val * 1000;
                else if (unit === 'm') msInterval = val * 60000;
                else if (unit === 'h') msInterval = val * 3600000;
                else if (unit === 'd') msInterval = val * 86400000;
             }
             const bucketTime = Math.floor(tradeTime / msInterval) * msInterval;
             const timeSecs = Math.floor(bucketTime / 1000) as any;

             if (allKlines.length > 0) {
                const lastKline = allKlines[allKlines.length - 1];
                if (lastKline.time === timeSecs) {
                   // Update existing candle
                   lastKline.close = tradePrice;
                   lastKline.high = Math.max(lastKline.high, tradePrice);
                   lastKline.low = Math.min(lastKline.low, tradePrice);
                   
                   const lastVol = allVolumes[allVolumes.length - 1];
                   lastVol.value += tradeAmount;
                   lastVol.color = lastKline.close >= lastKline.open ? '#10B981' : '#EF4444';
                   
                   seriesRef.current?.update(lastKline);
                   volumeSeries.update(lastVol);
                   setLatestData({...lastKline});
                } else if (timeSecs > lastKline.time) {
                   // Create new candle
                   const newKline = { time: timeSecs, open: tradePrice, high: tradePrice, low: tradePrice, close: tradePrice };
                   const newVol = { time: timeSecs, value: tradeAmount, color: '#10B981' };
                   allKlines.push(newKline);
                   allVolumes.push(newVol);
                   seriesRef.current?.update(newKline);
                   volumeSeries.update(newVol);
                   setLatestData({...newKline});
                }
             }
          });
       });
    });

    let isMouseDown = false;
    let dragStartData: { price: number; logical: number } | null = null;
    let currentCrosshairParam: any = null;

    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent && e.button !== 0) return;
      
      isMouseDown = true;
      if (currentCrosshairParam && currentCrosshairParam.point && seriesRef.current) {
        const price = seriesRef.current.coordinateToPrice(currentCrosshairParam.point.y);
        const logical = currentCrosshairParam.logical;
        if (price !== null && price !== undefined && logical !== null && logical !== undefined) {
          dragStartData = { price, logical };
          if (overlayBoxRef.current) {
            overlayBoxRef.current.style.display = 'none';
          }
        }
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
      dragStartData = null;
      if (overlayBoxRef.current && (!currentCrosshairParam || !currentCrosshairParam.point)) {
        overlayBoxRef.current.style.display = 'none';
      }
    };

    // Subscribe to crosshair HUD telemetry
    chart.subscribeCrosshairMove((param) => {
      currentCrosshairParam = param;
      
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setHoveredData(null);
      } else {
        const activeDataPoint = param.seriesData.get(candlestickSeries);
        if (activeDataPoint) {
          setHoveredData({
            time: param.time,
            open: (activeDataPoint as any).open,
            high: (activeDataPoint as any).high,
            low: (activeDataPoint as any).low,
            close: (activeDataPoint as any).close,
          });
        } else {
          setHoveredData(null);
        }
      }

      // Drag measurement logic
      if (isMouseDown && dragStartData && param.point && seriesRef.current && chart) {
        const currentPrice = seriesRef.current.coordinateToPrice(param.point.y);
        const startX = chart.timeScale().logicalToCoordinate(dragStartData.logical as any);
        const startY = seriesRef.current.priceToCoordinate(dragStartData.price);
        
        if (startX !== null && startX !== undefined && 
            startY !== null && startY !== undefined && 
            currentPrice !== null && currentPrice !== undefined) {
           
           const endX = param.point.x;
           const endY = param.point.y;
           const startPrice = dragStartData.price;
           const endPrice = currentPrice;

           if (overlayBoxRef.current && overlayLabelRef.current) {
             const width = Math.abs(endX - startX);
             const height = Math.abs(endY - startY);
             const left = Math.min(startX, endX);
             const top = Math.min(startY, endY);
             const isUp = endPrice >= startPrice;
             const pctChange = (((endPrice - startPrice) / startPrice) * 100).toFixed(2);
             
             overlayBoxRef.current.style.display = width > 5 ? 'block' : 'none';
             overlayBoxRef.current.style.left = `${left}px`;
             overlayBoxRef.current.style.top = `${top}px`;
             overlayBoxRef.current.style.width = `${width}px`;
             overlayBoxRef.current.style.height = `${height}px`;
             overlayBoxRef.current.style.backgroundColor = isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
             overlayBoxRef.current.style.border = `1px solid ${isUp ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`;

             overlayLabelRef.current.style.left = endX >= startX ? '100%' : 'auto';
             overlayLabelRef.current.style.right = endX < startX ? '100%' : 'auto';
             overlayLabelRef.current.style.marginLeft = endX >= startX ? '12px' : '0';
             overlayLabelRef.current.style.marginRight = endX < startX ? '12px' : '0';
             overlayLabelRef.current.style.backgroundColor = isUp ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
             overlayLabelRef.current.style.borderColor = isUp ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)';
             overlayLabelRef.current.innerText = `${isUp ? '+' : ''}${pctChange}%`;
           }
        }
      } else if (!isMouseDown) {
         if (overlayBoxRef.current) {
           overlayBoxRef.current.style.display = 'none';
         }
      }
    });

    const container = chartContainerRef.current;
    if (container) {
      window.addEventListener('resize', handleResize);
      container.addEventListener('mousedown', onMouseDown);
      container.addEventListener('touchstart', onMouseDown, { passive: true });
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);
    }
    
    setTimeout(() => {
      chart.timeScale().fitContent();
    }, 50);

    return () => {
      isMounted = false;
      unsubscribeTrades();
      if (container) {
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('touchstart', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchend', onMouseUp);
      }
      chart.remove();
    };
  }, [activePair, timeframe, showMA7, showEMA25, showBB]);

  const handleZoomIn = () => {
    const timeScale = chartRef.current?.timeScale();
    if (!timeScale) return;
    const range = timeScale.getVisibleLogicalRange();
    if (range && (range.to - range.from) > 10) {
      const barsToZoom = (range.to - range.from) * 0.2;
      timeScale.setVisibleLogicalRange({
        from: range.from + barsToZoom,
        to: range.to - barsToZoom,
      });
    }
  };

  const handleZoomOut = () => {
    const timeScale = chartRef.current?.timeScale();
    if (!timeScale) return;
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const barsToZoom = (range.to - range.from) * 0.2;
      timeScale.setVisibleLogicalRange({
        from: range.from - barsToZoom,
        to: range.to + barsToZoom,
      });
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode:`, err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const timeframes = ['1s', '1m', '15m', '1h', '4h', '1d'];
  const displayData = hoveredData || latestData;
  const isPriceUp = displayData ? displayData.close >= displayData.open : true;
  const changePercent = displayData 
    ? ((displayData.close - displayData.open) / displayData.open) * 100 
    : 0;

  return (
    <div className="absolute inset-0 flex flex-col select-none">
      {/* Timeframe & Indicators Navbar */}
      <div className="h-12 border-b border-white/5 flex items-center px-4 gap-3 text-xs text-dark-text-muted bg-[#08080a] z-10 shrink-0 select-none ">
        <span className="text-white/40 font-bold uppercase text-[10px] tracking-widest shrink-0 mr-1">Time</span>
        
        <div className="flex bg-[#121216] rounded p-1 border border-white/5">
          {timeframes.map(tf => (
            <button 
              key={tf} 
              onClick={() => setTimeframe(tf)}
              className={`transition-all py-1.5 px-3 rounded font-bold text-[11px] cursor-pointer ${timeframe === tf ? 'bg-[#2A2B31] text-white ' : 'text-dark-text-muted hover:text-white hover:bg-white/5'}`}
            >
              {tf}
            </button>
          ))}
        </div>
        
        <div className="w-px h-5 bg-white/10 shrink-0 mx-2"></div>
        
        {/* Indicators checklist */}
        <span className="text-white/40 font-bold uppercase text-[10px] tracking-widest shrink-0 mr-1">Indicators</span>
        <div className="flex items-center gap-4 bg-[#121216] rounded p-1.5 px-3 border border-white/5">
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${showMA7 ? 'bg-[#E91E63]/20 border-[#E91E63]' : 'border-white/20 group-hover:border-white/40'}`}>
              {showMA7 && <div className="w-1.5 h-1.5 rounded-sm bg-[#E91E63]"></div>}
            </div>
            <input 
              type="checkbox" 
              checked={showMA7}
              onChange={(e) => setShowMA7(e.target.checked)}
              className="hidden"
            />
            <span className={`text-[11px] font-bold ${showMA7 ? 'text-[#E91E63]' : 'text-dark-text-muted group-hover:text-white'}`}>MA(7)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${showEMA25 ? 'bg-[#00D1FF]/20 border-[#00D1FF]' : 'border-white/20 group-hover:border-white/40'}`}>
              {showEMA25 && <div className="w-1.5 h-1.5 rounded-sm bg-[#00D1FF]"></div>}
            </div>
            <input 
              type="checkbox" 
              checked={showEMA25}
              onChange={(e) => setShowEMA25(e.target.checked)}
              className="hidden"
            />
            <span className={`text-[11px] font-bold ${showEMA25 ? 'text-[#00D1FF]' : 'text-dark-text-muted group-hover:text-white'}`}>EMA(25)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${showBB ? 'bg-[#F59E0B]/20 border-[#F59E0B]' : 'border-white/20 group-hover:border-white/40'}`}>
              {showBB && <div className="w-1.5 h-1.5 rounded-sm bg-[#F59E0B]"></div>}
            </div>
            <input 
              type="checkbox" 
              checked={showBB}
              onChange={(e) => setShowBB(e.target.checked)}
              className="hidden"
            />
            <span className={`text-[11px] font-bold ${showBB ? 'text-[#F59E0B]' : 'text-dark-text-muted group-hover:text-white'}`}>BB(20)</span>
          </label>
        </div>
        
        <div className="flex-1"></div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={handleZoomIn}
            className="text-[11px] font-bold p-1.5 bg-[#121216] hover:bg-[#2A2B31] rounded border border-white/5 transition-colors cursor-pointer text-white shrink-0 group"
            title="Zoom In"
          >
            <svg className="w-4 h-4 text-dark-text-muted group-hover:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          <button 
            onClick={handleZoomOut}
            className="text-[11px] font-bold p-1.5 bg-[#121216] hover:bg-[#2A2B31] rounded border border-white/5 transition-colors cursor-pointer text-white shrink-0 group"
            title="Zoom Out"
          >
            <svg className="w-4 h-4 text-dark-text-muted group-hover:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Chart canvas & Sidebar overlay panel */}
      <div className="flex-1 flex bg-dark-bg relative overflow-hidden">
        
        {/* TradingView-style Drawing Toolbar */}
        <div className="w-12 bg-[#121216] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-20 shrink-0 select-none">
          <button 
            onClick={() => setActiveTool('cursor')}
            className={`transition-colors cursor-pointer p-1.5 rounded ${activeTool === 'cursor' ? 'bg-primary-500/20 text-primary-500' : 'text-dark-text-muted hover:text-white hover:bg-white/5'}`} 
            title="Cursor"
          >
             <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
             </svg>
          </button>
          <div className="w-6 h-px bg-white/10 my-1"></div>
          <button 
            onClick={() => setActiveTool('trendline')}
            className={`transition-colors cursor-pointer p-1.5 rounded ${activeTool === 'trendline' ? 'bg-primary-500/20 text-primary-500' : 'text-dark-text-muted hover:text-white hover:bg-white/5'}`} 
            title="Trend Line"
          >
            <Minus className="w-[18px] h-[18px] transform rotate-45" />
          </button>
          <button 
            onClick={() => setActiveTool('fib')}
            className={`transition-colors cursor-pointer p-1.5 rounded ${activeTool === 'fib' ? 'bg-primary-500/20 text-primary-500' : 'text-dark-text-muted hover:text-white hover:bg-white/5'}`} 
            title="Fib Retracement"
          >
            <TrendingUp className="w-[18px] h-[18px]" />
          </button>
          <button 
            onClick={() => setActiveTool('brush')}
            className={`transition-colors cursor-pointer p-1.5 rounded ${activeTool === 'brush' ? 'bg-primary-500/20 text-primary-500' : 'text-dark-text-muted hover:text-white hover:bg-white/5'}`} 
            title="Brush / Highlight"
          >
            <PenTool className="w-[18px] h-[18px]" />
          </button>
          <button 
            onClick={() => setActiveTool('text')}
            className={`transition-colors cursor-pointer p-1.5 rounded ${activeTool === 'text' ? 'bg-primary-500/20 text-primary-500' : 'text-dark-text-muted hover:text-white hover:bg-white/5'}`} 
            title="Text Annotation"
          >
            <Type className="w-[18px] h-[18px]" />
          </button>
          
          <div className="flex-1"></div>
          <button 
            onClick={() => setActiveTool('cursor')}
            className="text-dark-text-muted hover:text-[#F43F5E] transition-colors cursor-pointer p-1.5 rounded hover:bg-white/5" 
            title="Remove All Drawings"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden flex" ref={chartContainerRef}>

        {/* Live HUD Legends */}
        {displayData && (
          <div className="absolute top-3 left-16 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono select-none bg-dark-bg/80 backdrop-blur-md px-3 py-1.5 rounded border border-dark-border/40 pointer-events-none ">
            <span className="text-dark-text-muted shrink-0 font-bold">O</span>
            <span className={isPriceUp ? 'text-buy font-extrabold' : 'text-[#F43F5E] font-extrabold'}>
              {displayData.open.toFixed(priceDecimals)}
            </span>
            
            <span className="text-dark-text-muted shrink-0 font-bold">H</span>
            <span className={isPriceUp ? 'text-buy font-extrabold' : 'text-[#F43F5E] font-extrabold'}>
              {displayData.high.toFixed(priceDecimals)}
            </span>
            
            <span className="text-dark-text-muted shrink-0 font-bold">L</span>
            <span className={isPriceUp ? 'text-buy font-extrabold' : 'text-[#F43F5E] font-extrabold'}>
              {displayData.low.toFixed(priceDecimals)}
            </span>
            
            <span className="text-dark-text-muted shrink-0 font-bold">C</span>
            <span className={isPriceUp ? 'text-buy font-extrabold' : 'text-[#F43F5E] font-extrabold'}>
              {displayData.close.toFixed(priceDecimals)}
            </span>
            
            <span className="w-px h-3 bg-dark-border/60 mx-1 shrink-0"></span>
            
            <span className={`${changePercent >= 0 ? 'text-buy' : 'text-[#F43F5E]'} font-black shrink-0`}>
              {changePercent >= 0 ? '▲ +' : '▼ '}{changePercent.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Drag Measurement Overlay */}
        <div
          ref={overlayBoxRef}
          className="absolute z-30 pointer-events-none transition-opacity duration-75"
          style={{ display: 'none' }}
        >
          <div 
            ref={overlayLabelRef}
            className="absolute whitespace-nowrap px-2 py-1 text-[11px] font-bold rounded shadow-lg backdrop-blur-md text-white border"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
          </div>
        </div>

        {/* Floating Zoom Center Control */}
        <button 
          onClick={handleToggleFullscreen}
          className="absolute bottom-5 right-5 z-20 bg-dark-bg/85 hover:bg-[#202229] border border-dark-border/80 p-2 rounded text-xs font-semibold text-white flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:scale-105 active:scale-95 text-dark-text-muted hover:text-white"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-primary-500" />
        </button>

        </div>
      </div>
    </div>
  );
}

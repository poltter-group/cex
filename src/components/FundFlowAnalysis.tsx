import { useState, useEffect } from 'react';
import { useMarket } from '../lib/market-context';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export function FundFlowAnalysis({ activePair = 'BTC' }: { activePair?: string }) {
  const { prices } = useMarket();
  const [inflowData, setInflowData] = useState<any[]>([]);
  const [netInflow, setNetInflow] = useState(0);

  useEffect(() => {
    // Mocking fund flow data based on current context
    const baseVal = (prices[activePair] || 100) * 1.5;
    const largeIn = baseVal * 0.4 * Math.random();
    const largeOut = baseVal * 0.3 * Math.random();
    const medIn = baseVal * 0.2 * Math.random();
    const medOut = baseVal * 0.25 * Math.random();
    const smallIn = baseVal * 0.1 * Math.random();
    const smallOut = baseVal * 0.15 * Math.random();

    const net = (largeIn + medIn + smallIn) - (largeOut + medOut + smallOut);
    setNetInflow(net);

    setInflowData([
      { name: 'X-Large', in: largeIn * 0.2, out: largeOut * 0.1, net: (largeIn * 0.2) - (largeOut * 0.1) },
      { name: 'Large', in: largeIn, out: largeOut, net: largeIn - largeOut },
      { name: 'Medium', in: medIn, out: medOut, net: medIn - medOut },
      { name: 'Small', in: smallIn, out: smallOut, net: smallIn - smallOut },
    ]);
  }, [activePair, prices]);

  const totalIn = inflowData.reduce((acc, obj) => acc + obj.in, 0);
  const totalOut = inflowData.reduce((acc, obj) => acc + obj.out, 0);
  const totalVol = totalIn + totalOut;
  
  const inPercent = totalVol > 0 ? (totalIn / totalVol) * 100 : 50;
  const outPercent = totalVol > 0 ? (totalOut / totalVol) * 100 : 50;

  return (
    <div className="flex flex-col h-full bg-dark-bg text-white overflow-y-auto custom-scroll text-xs">
      <div className="flex flex-col p-4 gap-4">
        
        {/* Top Summary */}
        <div className="flex justify-between items-center bg-dark-surface/30 p-4 border border-dark-border/50 rounded-lg">
          <div className="flex flex-col">
            <span className="text-dark-text-muted font-bold mb-1">5D large order net inflow</span>
            <span className={`text-lg font-mono font-extrabold ${netInflow > 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
              {netInflow > 0 ? '+' : ''}{netInflow.toFixed(4)} {activePair.replace(/USDT|USD$/, '')}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-dark-text-muted font-bold mb-1">Total Inflow</span>
            <span className="text-primary-500 font-mono font-bold">${totalIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Bar distribution */}
        <div className="flex flex-col gap-2 p-4 bg-dark-surface/20 rounded-lg border border-dark-border/30">
          <div className="flex justify-between text-[10px] font-bold text-dark-text-muted mb-2 uppercase">
            <span>Outflow ({outPercent.toFixed(1)}%)</span>
            <span>Inflow ({inPercent.toFixed(1)}%)</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden flex">
             <div className="h-full bg-[#F43F5E] transition-all duration-500" style={{ width: `${outPercent}%` }} />
             <div className="h-full bg-[#10B981] transition-all duration-500" style={{ width: `${inPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-2 font-mono font-bold">
            <span className="text-[#F43F5E]">${totalOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="text-[#10B981]">${totalIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Detailed chart */}
        <div className="h-48 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inflowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#808A9D', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#808A9D', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                cursor={{ fill: '#2A2D35', opacity: 0.4 }} 
                contentStyle={{ backgroundColor: '#1E2026', borderColor: '#2A2D35', fontSize: '11px', borderRadius: '4px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="net" radius={[2, 2, 0, 0]}>
                {inflowData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.net > 0 ? '#10B981' : '#F43F5E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $transactions, $activeCurrency, $personalBalance, $businessBalance, $totalBalance } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { TrendingUp, TrendingDown, Calendar, Activity } from 'lucide-react';
import {
  aggregateLast30Days,
  aggregateLast12Months,
  bezierPath,
} from '../../lib/chartUtils';
import { motion, AnimatePresence } from 'framer-motion';

export const GrowthAnalytics: React.FC = () => {
  const transactions = useStore($transactions);
  const currency = useStore($activeCurrency);
  const personal = useStore($personalBalance);
  const business = useStore($businessBalance);
  const total = useStore($totalBalance);

  // Reusing the advanced chart concept here:
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('year');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // We reuse the logic for 30-days, 12-months, or an all-time variant.
  // For 'all', we could just use a simple aggregation, but 12-months is best for a detailed chart.
  // We'll stick to month/year for the detailed concept.
  const tempAgg = period === 'month'
    ? aggregateLast30Days(transactions, currency, 0)
    : aggregateLast12Months(transactions, currency, 0);

  const netPeriodCashflow = tempAgg.reduce((sum, p) => sum + p.cashflow, 0);
  const startBalance = total - netPeriodCashflow;

  const aggregated = period === 'month'
    ? aggregateLast30Days(transactions, currency, startBalance)
    : aggregateLast12Months(transactions, currency, startBalance);

  if (aggregated.length === 0) {
    const now = new Date();
    aggregated.push({
      label: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      date: now,
      income: 0,
      expense: 0,
      cashflow: 0,
      balance: total,
    });
  }

  const totalIncome = aggregated.reduce((sum, p) => sum + p.income, 0);
  const totalExpense = aggregated.reduce((sum, p) => sum + p.expense, 0);
  const netSavings = totalIncome - totalExpense;
  const isNetSavingsGain = netSavings >= 0;

  const finalBalance = aggregated[aggregated.length - 1].balance;
  const initialBalance = aggregated[0].balance;
  const isBalanceGain = finalBalance >= initialBalance;

  // Chart dimensions
  const svgWidth = 1000;
  const svgHeight = 350;
  const paddingLeft = 56;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 28;

  const drawableWidth = svgWidth - paddingLeft - paddingRight;
  const drawableHeight = svgHeight - paddingTop - paddingBottom;
  const bottomY = svgHeight - paddingBottom;

  const maxFlow = Math.max(...aggregated.map(p => Math.max(p.income, p.expense))) || 100;
  const balances = aggregated.map(p => p.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const balanceRange = (maxBalance - minBalance) || 100;

  const points = aggregated.map((p, idx) => {
    const x = aggregated.length > 1
      ? paddingLeft + (idx / (aggregated.length - 1)) * drawableWidth
      : paddingLeft + drawableWidth / 2;
    const yIncome = bottomY - (p.income / maxFlow) * drawableHeight * 0.80;
    const yExpense = bottomY - (p.expense / maxFlow) * drawableHeight * 0.80;
    const yBalance = bottomY - (((p.balance - minBalance) / balanceRange) * drawableHeight * 0.65) - (drawableHeight * 0.15);
    return { x, yIncome, yExpense, yBalance };
  });

  const incomeCoords = points.map(pt => ({ x: pt.x, y: pt.yIncome }));
  const expenseCoords = points.map(pt => ({ x: pt.x, y: pt.yExpense }));
  const balanceCoords = points.map(pt => ({ x: pt.x, y: pt.yBalance }));

  const incomeBezier = bezierPath(incomeCoords);
  const expenseBezier = bezierPath(expenseCoords);
  const balanceBezier = bezierPath(balanceCoords);

  const incomeArea = points.length > 0
    ? `${incomeBezier} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`
    : '';
  const expenseArea = points.length > 0
    ? `${expenseBezier} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`
    : '';

  const verticalTickIndices: number[] = [];
  if (aggregated.length <= 12) {
    aggregated.forEach((_, idx) => verticalTickIndices.push(idx));
  } else {
    const step = Math.ceil(aggregated.length / 6);
    for (let i = 0; i < aggregated.length; i += step) verticalTickIndices.push(i);
    if (!verticalTickIndices.includes(aggregated.length - 1)) verticalTickIndices.push(aggregated.length - 1);
  }

  const yTicks = [
    maxBalance,
    minBalance + balanceRange * 0.66,
    minBalance + balanceRange * 0.33,
    minBalance,
  ];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * svgWidth;

    let nearestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgX);
      if (diff < minDiff) { minDiff = diff; nearestIdx = idx; }
    });

    setHoveredIdx(nearestIdx);
    const pt = points[nearestIdx];
    setTooltipPos({
      x: (pt.x / svgWidth) * rect.width,
      y: (pt.yBalance / svgHeight) * rect.height,
    });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltipPos(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl">
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase mb-2">Total Net Worth</span>
          <span className="text-3xl font-sans font-semibold text-platinum tabular-nums"><span className="font-serif mr-1">{currency}</span><span className="font-sans tabular-nums">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </div>
        <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl">
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase mb-2">Personal Equity</span>
          <span className="text-3xl font-sans font-semibold text-platinum tabular-nums"><span className="font-serif mr-1">{currency}</span><span className="font-sans tabular-nums">{personal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </div>
        <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl">
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase mb-2">Business Capital</span>
          <span className="text-3xl font-sans font-semibold text-platinum tabular-nums"><span className="font-serif mr-1">{currency}</span><span className="font-sans tabular-nums">{business.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </div>
      </div>

      <div className="flex flex-col p-8 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl min-h-[500px] overflow-visible">
        
        <div className="flex flex-col md:flex-row justify-between mb-8 z-10 gap-4">
          <div className="flex items-center gap-2">
            <Icon icon={Activity} className="w-5 h-5 text-platinum/60" />
            <h2 className="text-xl font-medium text-platinum">Asset Trajectory & Cashflow</h2>
          </div>

          <div className="flex rounded-lg bg-[#141414] p-0.5 border border-[#222]">
            <button
              onClick={() => setPeriod('month')}
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded transition-all duration-300 ${
                period === 'month' ? 'bg-luxury-gold/15 text-luxury-gold font-bold border border-luxury-gold/30' : 'text-platinum/40 hover:text-platinum border border-transparent'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded transition-all duration-300 ${
                period === 'year' ? 'bg-luxury-gold/15 text-luxury-gold font-bold border border-luxury-gold/30' : 'text-platinum/40 hover:text-platinum border border-transparent'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>

        <div className="flex-1 w-full relative select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="gaAreaIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gaAreaExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.07" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>
              <filter id="gaGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {[0, 0.33, 0.66, 1].map((ratio) => (
              <line
                key={ratio}
                x1={paddingLeft} y1={paddingTop + ratio * drawableHeight}
                x2={svgWidth - paddingRight} y2={paddingTop + ratio * drawableHeight}
                stroke="#ffffff" strokeOpacity="0.025" strokeWidth="1"
              />
            ))}

            {verticalTickIndices.map((idx) => points[idx] && (
              <line
                key={idx}
                x1={points[idx].x} y1={paddingTop}
                x2={points[idx].x} y2={bottomY}
                stroke="#ffffff" strokeOpacity="0.02" strokeWidth="1" strokeDasharray="2 2"
              />
            ))}

            {yTicks.map((val, idx) => {
              const ratio = idx / (yTicks.length - 1);
              const y = paddingTop + ratio * drawableHeight;
              return (
                <text key={idx} x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[11px] font-sans font-semibold fill-platinum/30">
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toFixed(0)}
                </text>
              );
            })}

            <path d={incomeArea} fill="url(#gaAreaIncome)" className="transition-all duration-500 ease-in-out" />
            <path d={incomeBezier} fill="none" stroke="#10B981" strokeOpacity="0.2" strokeWidth="1.5" className="transition-all duration-500 ease-in-out" />

            <path d={expenseArea} fill="url(#gaAreaExpense)" className="transition-all duration-500 ease-in-out" />
            <path d={expenseBezier} fill="none" stroke="#EF4444" strokeOpacity="0.15" strokeWidth="1.5" className="transition-all duration-500 ease-in-out" />

            <path
              d={balanceBezier} fill="none"
              stroke={isBalanceGain ? '#C5A059' : '#8A3324'}
              strokeWidth="3.5" strokeLinecap="round"
              filter="url(#gaGlow)"
              className="transition-all duration-500 ease-in-out"
            />

            {verticalTickIndices.map((idx) => points[idx] && (
              <text key={idx} x={points[idx].x} y={bottomY + 20} textAnchor="middle" className="text-[11px] font-sans font-semibold fill-platinum/30">
                {aggregated[idx].label}
              </text>
            ))}

            {hoveredIdx !== null && points[hoveredIdx] && (
              <>
                <line x1={points[hoveredIdx].x} y1={paddingTop} x2={points[hoveredIdx].x} y2={bottomY} stroke={isBalanceGain ? '#C5A059' : '#8A3324'} strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="2 2" />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yIncome} r="4" fill="#10B981" fillOpacity="0.4" />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yIncome} r="2.5" fill="#ffffff" />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yExpense} r="4" fill="#EF4444" fillOpacity="0.4" />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yExpense} r="2.5" fill="#ffffff" />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yBalance} r="7" fill={isBalanceGain ? '#C5A059' : '#8A3324'} fillOpacity="0.25" />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yBalance} r="4" fill={isBalanceGain ? '#C5A059' : '#8A3324'} />
                <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].yBalance} r="2" fill="#ffffff" />
              </>
            )}
          </svg>

          <AnimatePresence>
            {hoveredIdx !== null && tooltipPos && aggregated[hoveredIdx] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', left: `${tooltipPos.x - 90}px`, top: `${tooltipPos.y - 170}px`, transform: 'translateX(-50%)' }}
                className="z-30 pointer-events-none flex flex-col p-4 rounded-2xl bg-obsidian/95 border border-[#333] backdrop-blur-2xl shadow-2xl min-w-[180px]"
              >
                <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-obsidian border-r border-b border-[#333]" />
                <div className="flex items-center gap-2 text-[11px] font-bold text-platinum/40 uppercase tracking-wider mb-3 border-b border-[#222] pb-2">
                  <Icon icon={Calendar} className="w-3.5 h-3.5" />
                  {aggregated[hoveredIdx].date.toLocaleDateString(undefined, { weekday: period === 'month' ? 'long' : undefined, month: 'long', day: period === 'month' ? 'numeric' : undefined, year: 'numeric' })}
                </div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-platinum/50">Revenues</span>
                  <span className="font-semibold font-sans tabular-nums text-emerald-500"><span className="font-serif italic mr-1">+{currency}</span><span className="font-sans tabular-nums">{aggregated[hoveredIdx].income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-platinum/50">Expenses</span>
                  <span className="font-semibold font-sans tabular-nums text-soft-crimson"><span className="font-serif italic mr-1">-{currency}</span><span className="font-sans tabular-nums">{aggregated[hoveredIdx].expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
                <div className="flex items-center justify-between text-[12px] border-b border-[#222] pb-2 mb-2">
                  <span className="text-platinum/50">Delta</span>
                  <span className={`font-semibold font-sans tabular-nums ${aggregated[hoveredIdx].cashflow >= 0 ? 'text-luxury-gold' : 'text-soft-crimson'}`}>
                    <span className="font-serif italic mr-1">{aggregated[hoveredIdx].cashflow >= 0 ? '+' : ''}{currency}</span><span className="font-sans tabular-nums">{aggregated[hoveredIdx].cashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px] font-bold">
                  <span className="text-platinum/60">Balance</span>
                  <span className="font-sans tabular-nums text-platinum"><span className="font-serif italic mr-1">{currency}</span><span className="font-sans tabular-nums">{aggregated[hoveredIdx].balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between flex-wrap gap-4 border-t border-[#181818] pt-6 text-[11px] text-platinum/40 select-none">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
              <span>Revenue Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/10 border border-red-500/35" />
              <span>Expenditures</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-1.5 rounded ${isBalanceGain ? 'bg-luxury-gold' : 'bg-soft-crimson'}`} />
              <span>Net Asset Value</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span>Net Savings ({period}):</span>
            <span className={`font-sans font-semibold tabular-nums text-sm ${isNetSavingsGain ? 'text-luxury-gold glow-gold' : 'text-soft-crimson glow-error'}`}>
              <span className="font-serif italic mr-1">{isNetSavingsGain ? '+' : ''}{currency}</span><span className="font-sans tabular-nums">{netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

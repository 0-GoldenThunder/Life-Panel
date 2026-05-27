import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { $transactions, $activeCurrency, $totalBalance } from "../../stores/lifeStore";
import { Icon } from "../ui/Icon";
import { LineChart } from "lucide-react";
import {
  aggregateLast30Days,
  aggregateLast12Months,
  normalizePoints,
  bezierPath,
  type ChartDataPoint,
} from "../../lib/chartUtils";
import { motion, AnimatePresence } from "framer-motion";

export const FinanceMiniChart: React.FC = () => {
  const transactions = useStore($transactions);
  const currency = useStore($activeCurrency);
  const [period, setPeriod] = useState<"month" | "year">("month");

  // Hover & Tooltip State
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const totalBalance = useStore($totalBalance);

  // 1. Aggregate data based on period, using true balance like the huge chart
  const tempAgg =
    period === "month"
      ? aggregateLast30Days(transactions, currency, 0)
      : aggregateLast12Months(transactions, currency, 0);

  const netPeriodCashflow = tempAgg.reduce((sum, p) => sum + p.cashflow, 0);
  const startBalance = totalBalance - netPeriodCashflow;

  const aggregated =
    period === "month"
      ? aggregateLast30Days(transactions, currency, startBalance)
      : aggregateLast12Months(transactions, currency, startBalance);

  // 2. Extract trend values from the computed balances
  const trendValues = aggregated.map((p) => p.balance);

  // If no data, fallback
  if (trendValues.length === 0) {
    trendValues.push(0, 0);
  }

  // 3. Determine if Net Gain or Net Loss based on the period's delta
  const finalTrendVal = trendValues[trendValues.length - 1];
  const initialTrendVal = trendValues[0];
  const isGain = finalTrendVal >= initialTrendVal;

  // 4. Normalize coordinates for a wider SVG viewport to better fill the card
  const width = 420;
  const height = 90;
  const points = normalizePoints(trendValues, width, height, 0.15);
  const linePath = bezierPath(points);

  // Create an area path closed at the bottom for the gradient fill
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`
      : "";

  // Handle Mouse Events for Hover Tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (points.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const svgPoint = e.currentTarget.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const screenCTM = e.currentTarget.getScreenCTM();
    const svgCoords = screenCTM
      ? svgPoint.matrixTransform(screenCTM.inverse())
      : ({
          x: ((e.clientX - rect.left) / rect.width) * width,
          y: 0,
        } as DOMPoint);

    let nearestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgCoords.x);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = idx;
      }
    });

    setHoveredIndex(nearestIdx);

    const pt = points[nearestIdx];
    const hoverPoint = e.currentTarget.createSVGPoint();
    hoverPoint.x = pt.x;
    hoverPoint.y = pt.y;
    const screenPoint = screenCTM
      ? hoverPoint.matrixTransform(screenCTM)
      : ({
          x: (pt.x / width) * rect.width + rect.left,
          y: (pt.y / height) * rect.height + rect.top,
        } as DOMPoint);

    setTooltipPos({
      x: screenPoint.x - rect.left,
      y: screenPoint.y - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPos(null);
  };

  return (
    <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl h-full group hover:border-luxury-gold/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-500 relative overflow-visible">
      {/* Header with Title and Toggle Tabs */}
      <div className="flex items-center justify-between mb-4 z-10">
        <a
          href="/growth"
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <Icon
            icon={LineChart}
            className="w-4 h-4 text-platinum/40 group-hover:text-platinum transition-colors"
          />
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors">
            Cashflow Trend
          </span>
        </a>

        {/* Period Selector Toggle */}
        <div className="flex rounded-lg bg-[#141414] p-0.5 border border-[#222]">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPeriod("month");
            }}
            className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded transition-all duration-300 ${
              period === "month"
                ? "bg-luxury-gold/15 text-luxury-gold font-bold border border-luxury-gold/30"
                : "text-platinum/40 hover:text-platinum border border-transparent"
            }`}
          >
            Month
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPeriod("year");
            }}
            className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded transition-all duration-300 ${
              period === "year"
                ? "bg-luxury-gold/15 text-luxury-gold font-bold border border-luxury-gold/30"
                : "text-platinum/40 hover:text-platinum border border-transparent"
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 w-full h-full min-h-[80px] flex items-center justify-center relative select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Gain Colors: Luxury Gold / Green Glow */}
            <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5A059" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C5A059" stopOpacity="0.0" />
            </linearGradient>

            {/* Loss Colors: Soft Crimson Red Glow */}
            <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8A3324" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8A3324" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="miniGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="#ffffff"
            strokeOpacity="0.03"
            strokeDasharray="3 3"
          />
          <line
            x1={width / 2}
            y1="0"
            x2={width / 2}
            y2={height}
            stroke="#ffffff"
            strokeOpacity="0.03"
            strokeDasharray="3 3"
          />

          {/* Area Fill */}
          <path
            d={areaPath}
            fill={isGain ? "url(#gainGrad)" : "url(#lossGrad)"}
            className="transition-all duration-500 ease-in-out"
          />

          {/* Main Spline Curve */}
          <path
            d={linePath}
            fill="none"
            stroke={isGain ? "#C5A059" : "#8A3324"}
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#miniGlow)"
            className="transition-all duration-500 ease-in-out"
          />

          {/* Hover Vertical Guide & Circle Marker */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <>
              {/* Vertical Track Line */}
              <line
                x1={points[hoveredIndex].x}
                y1="0"
                x2={points[hoveredIndex].x}
                y2={height}
                stroke={isGain ? "#C5A059" : "#8A3324"}
                strokeOpacity="0.2"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Glow Dot */}
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r="6"
                fill={isGain ? "#C5A059" : "#8A3324"}
                fillOpacity="0.2"
              />
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r="3"
                fill="#ffffff"
                stroke={isGain ? "#C5A059" : "#8A3324"}
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* Glassmorphic Popup Tooltip */}
        <AnimatePresence>
          {hoveredIndex !== null && tooltipPos && aggregated[hoveredIndex] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                left: `${tooltipPos.x - 60}px`,
                top: `${tooltipPos.y - 90}px`, // Restored height offset with delta block
                transform: "translateX(-50%)",
              }}
              className="z-30 pointer-events-none flex flex-col p-2.5 rounded-xl bg-obsidian/85 border border-[#333] backdrop-blur-md shadow-2xl min-w-[120px] max-w-[150px] text-center"
            >
              {/* Tooltip Arrow */}
              <div className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-obsidian border-r border-b border-[#333]"></div>

              <span className="text-[9px] font-semibold text-platinum/50 uppercase tracking-widest block mb-0.5">
                {aggregated[hoveredIndex].label}
              </span>

              {/* Period Cashflow */}
              <div className="text-[10px] text-platinum/80 mb-0.5">
                Delta:{" "}
                <span
                  className={
                    aggregated[hoveredIndex].cashflow >= 0
                      ? "text-luxury-gold"
                      : "text-soft-crimson"
                  }
                >
                  {aggregated[hoveredIndex].cashflow >= 0 ? "+" : ""}
                  {aggregated[hoveredIndex].cashflow.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>

              {/* Cumulative Trend value */}
              <div className="text-[11px] font-serif font-bold text-platinum truncate">
                <span className="font-serif italic mr-1">{currency}</span>
                <span className="font-sans tabular-nums">
                  {trendValues[hoveredIndex].toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

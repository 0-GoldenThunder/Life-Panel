import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $transactions,
  $activeCurrency,
  $totalBalance,
} from "../../stores/lifeStore";
import { Icon } from "../ui/Icon";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import {
  aggregateLast30Days,
  aggregateLast12Months,
  bezierPath,
} from "../../lib/chartUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useHydrated } from "../../hooks/useHydrated";

export const GrowthMiniChart: React.FC = () => {
  const isHydrated = useHydrated();
  const transactions = useStore($transactions);
  const currency = useStore($activeCurrency);
  const [period, setPeriod] = useState<"month" | "year">("month");

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  if (!isHydrated) {
    return (
      <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl h-full relative overflow-hidden animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#1A1A1A] rounded-full"></div>
            <div className="h-3 w-24 bg-[#1A1A1A] rounded"></div>
          </div>
          <div className="h-4 w-16 bg-[#1A1A1A] rounded"></div>
        </div>
        <div className="flex-1 w-full h-full min-h-[80px] bg-[#141414]/50 rounded-xl border border-[#222]"></div>
      </div>
    );
  }

  const aggregated =
    period === "month"
      ? aggregateLast30Days(transactions, currency, 0)
      : aggregateLast12Months(transactions, currency, 0);

  let cumCash = 0;
  const trendValues = aggregated.map((p) => {
    cumCash += p.cashflow;
    return cumCash;
  });

  if (trendValues.length === 0) {
    trendValues.push(0, 0);
  }

  const finalTrendVal = trendValues[trendValues.length - 1];
  const isGain = finalTrendVal >= 0;

  const width = 420;
  const height = 90;
  // normalizePoints is implemented in chartUtils, assuming basic relative scaling here
  const normalizePointsLocal = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((val, idx) => ({
      x: values.length > 1 ? (idx / (values.length - 1)) * width : width / 2,
      y: height - ((val - min) / range) * height * 0.7 - height * 0.15,
    }));
  };

  const points = normalizePointsLocal(trendValues);
  const linePath = bezierPath(points);

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`
      : "";

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
      <div className="flex items-center justify-between mb-4 z-10">
        <a
          href="/growth"
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <Icon
            icon={TrendingUp}
            className="w-4 h-4 text-platinum/40 group-hover:text-platinum transition-colors"
          />
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors">
            Asset Growth
          </span>
        </a>

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

      <div className="flex-1 w-full h-full min-h-[80px] flex items-center justify-center relative select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="gmGainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5A059" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C5A059" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gmLossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8A3324" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8A3324" stopOpacity="0.0" />
            </linearGradient>
            <filter
              id="gmMiniGlow"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

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

          <path
            d={areaPath}
            fill={isGain ? "url(#gmGainGrad)" : "url(#gmLossGrad)"}
            className="transition-all duration-500 ease-in-out"
          />
          <path
            d={linePath}
            fill="none"
            stroke={isGain ? "#C5A059" : "#8A3324"}
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#gmMiniGlow)"
            className="transition-all duration-500 ease-in-out"
          />

          {hoveredIndex !== null && points[hoveredIndex] && (
            <>
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
                top: `${tooltipPos.y - 90}px`,
                transform: "translateX(-50%)",
              }}
              className="z-30 pointer-events-none flex flex-col p-2.5 rounded-xl bg-obsidian/85 border border-[#333] backdrop-blur-md shadow-2xl min-w-[120px] max-w-[150px] text-center"
            >
              <div className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-obsidian border-r border-b border-[#333]"></div>
              <span className="text-[9px] font-semibold text-platinum/50 uppercase tracking-widest block mb-0.5">
                {aggregated[hoveredIndex].label}
              </span>
              <div className="text-[10px] text-platinum/80 mb-0.5">
                Delta:{" "}
                <span
                  className={`font-sans font-semibold tabular-nums ${aggregated[hoveredIndex].cashflow >= 0 ? "text-luxury-gold" : "text-soft-crimson"}`}
                >
                  {aggregated[hoveredIndex].cashflow >= 0 ? "+" : ""}
                  {aggregated[hoveredIndex].cashflow.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="text-[11px] font-sans font-semibold tabular-nums text-platinum truncate">
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

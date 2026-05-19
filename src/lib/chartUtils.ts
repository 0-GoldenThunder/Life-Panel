import type { Transaction } from '../types/models';
import { convertCurrency } from '../stores/lifeStore';

export interface Point {
  x: number;
  y: number;
}

export interface ChartDataPoint {
  label: string;      // E.g., "May 18" or "Nov 2025"
  date: Date;
  income: number;
  expense: number;
  cashflow: number;   // income - expense
  balance: number;    // cumulative running balance
}

/**
 * Generates a smooth cubic bezier SVG path string for a set of Points.
 * Computes control points based on a cubic spline interpolation, creating a D3-like natural wave.
 */
export const bezierPath = (points: Point[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  const getControlPoints = (current: Point, previous: Point, next: Point, reverse: boolean): [number, number] => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.12; // Controls the curve intensity (0.1 - 0.2 works best)
    const angle = Math.atan2(n.y - p.y, n.x - p.x) + (reverse ? Math.PI : 0);
    const length = Math.sqrt(Math.pow(n.x - p.x, 2) + Math.pow(n.y - p.y, 2)) * smoothing;
    const x = current.x + Math.cos(angle) * length;
    const y = current.y + Math.sin(angle) * length;
    return [x, y];
  };

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const next = points[i + 1];
    const cp1 = getControlPoints(p, points[i - 1], next, false);
    const cp2 = getControlPoints(next, p, points[i + 2], true);
    d += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${next.x},${next.y}`;
  }
  return d;
};

/**
 * Normalizes coordinates into a standard bounding box (e.g. width x height)
 */
export const normalizePoints = (
  values: number[], 
  width: number, 
  height: number, 
  paddingY = 0.15,
  minValOverride?: number,
  maxValOverride?: number
): Point[] => {
  if (values.length === 0) return [];
  
  const minVal = minValOverride !== undefined ? minValOverride : Math.min(...values);
  const maxVal = maxValOverride !== undefined ? maxValOverride : Math.max(...values);
  const range = (maxVal - minVal) || 1;
  const padding = height * paddingY;
  const drawableHeight = height - padding * 2;

  return values.map((val, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
    const y = height - padding - (((val - minVal) / range) * drawableHeight);
    return { x, y };
  });
};

/**
 * Aggregates daily transaction statistics for the last 30 days
 */
export const aggregateLast30Days = (
  transactions: Transaction[], 
  activeCurrency: string,
  startBalance: number
): ChartDataPoint[] => {
  const points: ChartDataPoint[] = [];
  const now = new Date();
  
  // Create 30 days of dates starting from 29 days ago up to today
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    
    points.push({
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      date: d,
      income: 0,
      expense: 0,
      cashflow: 0,
      balance: 0,
    });
  }

  // Filter valid transactions
  const validTxs = transactions.filter(tx => !tx._deleted);

  // Group transactions into days
  validTxs.forEach(tx => {
    const txDate = new Date(tx.date);
    const dayPoint = points.find(p => 
      p.date.getDate() === txDate.getDate() &&
      p.date.getMonth() === txDate.getMonth() &&
      p.date.getFullYear() === txDate.getFullYear()
    );

    if (dayPoint) {
      const converted = convertCurrency(tx.amount, tx.currency || 'MYR', activeCurrency);
      if (tx.type === 'income') {
        dayPoint.income += converted;
      } else {
        dayPoint.expense += converted;
      }
    }
  });

  // Calculate cumulative net cashflow and running balances
  let runningBalance = startBalance;
  points.forEach(p => {
    p.cashflow = p.income - p.expense;
    runningBalance += p.cashflow;
    p.balance = runningBalance;
  });

  return points;
};

/**
 * Aggregates monthly transaction statistics for the last 12 months
 */
export const aggregateLast12Months = (
  transactions: Transaction[],
  activeCurrency: string,
  startBalance: number
): ChartDataPoint[] => {
  const points: ChartDataPoint[] = [];
  const now = new Date();

  // Create 12 months of dates starting from 11 months ago up to today
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);

    points.push({
      label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      date: d,
      income: 0,
      expense: 0,
      cashflow: 0,
      balance: 0,
    });
  }

  const validTxs = transactions.filter(tx => !tx._deleted);

  validTxs.forEach(tx => {
    const txDate = new Date(tx.date);
    const monthPoint = points.find(p => 
      p.date.getMonth() === txDate.getMonth() &&
      p.date.getFullYear() === txDate.getFullYear()
    );

    if (monthPoint) {
      const converted = convertCurrency(tx.amount, tx.currency || 'MYR', activeCurrency);
      if (tx.type === 'income') {
        monthPoint.income += converted;
      } else {
        monthPoint.expense += converted;
      }
    }
  });

  // Calculate cumulative running balances
  let runningBalance = startBalance;
  points.forEach(p => {
    p.cashflow = p.income - p.expense;
    runningBalance += p.cashflow;
    p.balance = runningBalance;
  });

  return points;
};

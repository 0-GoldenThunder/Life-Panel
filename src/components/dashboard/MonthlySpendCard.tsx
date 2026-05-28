import React from 'react';
import { useStore } from '@nanostores/react';
import { $transactions, $activeCurrency, $isDbReady } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { CreditCard } from 'lucide-react';
import { useHydrated } from '../../hooks/useHydrated';

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  MYR: 4.7,
  IDR: 16000,
};

const convertCurrency = (amount: number, fromCurrency: string, targetCurrency: string) => {
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const targetRate = EXCHANGE_RATES[targetCurrency] || 1;
  return (amount / fromRate) * targetRate;
};

export const MonthlySpendCard: React.FC = () => {
  const isHydrated = useHydrated();
  const transactions = useStore($transactions);
  const currency = useStore($activeCurrency);
  const isDbReady = useStore($isDbReady);

  if (!isHydrated) {
    return <div className="h-full w-full bg-[#0A0A0A]/50 border border-[#222] rounded-2xl animate-pulse"></div>;
  }

  // Compute spend for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthSpend = transactions
    .filter(t => 
      !t._deleted && 
      t.type === 'expense' && 
      new Date(t.date).getMonth() === currentMonth &&
      new Date(t.date).getFullYear() === currentYear
    )
    .reduce((sum, tx) => sum + convertCurrency(tx.amount, tx.currency || 'MYR', currency), 0);

  return (
    <a href="/transactions" className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl h-full group hover:border-luxury-gold/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-500 relative cursor-pointer">
      <div className="flex items-center gap-2 mb-2">
        <Icon icon={CreditCard} className="w-4 h-4 text-platinum/40 group-hover:text-platinum transition-colors" />
        <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors">
          Spend This Month
        </span>
      </div>
      
      <div className="mt-auto flex items-baseline gap-2">
        <span className="text-2xl font-serif font-medium text-platinum truncate tabular-nums">{currency}</span>
        <span className="text-2xl font-sans font-medium tracking-tight text-platinum truncate tabular-nums">
          {thisMonthSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </a>
  );
};

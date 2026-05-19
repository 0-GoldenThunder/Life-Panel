import React from 'react';
import { useStore } from '@nanostores/react';
import { $personalBalance, $businessBalance, $activeCurrency, $transactions } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { Wallet, Briefcase, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FinanceScope } from '../../types/models';

interface ScopeHeaderProps {
  scope: FinanceScope;
}

export const ScopeHeader: React.FC<ScopeHeaderProps> = ({ scope }) => {
  const personalBalance = useStore($personalBalance);
  const businessBalance = useStore($businessBalance);
  const currency = useStore($activeCurrency);
  const transactions = useStore($transactions);

  const balance = scope === 'personal' ? personalBalance : businessBalance;
  const isPersonal = scope === 'personal';

  // Compute a simple growth metric (e.g., total income this month)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthIncome = transactions
    .filter(t => 
      !t._deleted && 
      t.financeScope === scope &&
      t.type === 'income' && 
      new Date(t.date).getMonth() === currentMonth &&
      new Date(t.date).getFullYear() === currentYear
    )
    .reduce((sum, tx) => sum + tx.amount, 0); // Simplified for MVP

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon={isPersonal ? Wallet : Briefcase} className="w-4 h-4 text-platinum/40" />
          <span className="text-xs font-semibold tracking-widest text-platinum uppercase">
            Net {isPersonal ? 'Personal' : 'Business'} Balance
          </span>
        </div>
        
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-2xl font-serif font-medium text-platinum truncate tabular-nums">{currency}</span>
          <span className={cn(
            "text-4xl md:text-5xl font-sans tracking-tight truncate",
            balance < 0 ? "text-soft-crimson glow-error" : "text-luxury-gold glow-gold"
          )}>
            {Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon={TrendingUp} className="w-4 h-4 text-platinum/40" />
          <span className="text-xs font-semibold tracking-widest text-platinum uppercase">
            Income This Month
          </span>
        </div>
        
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-2xl font-serif font-medium text-platinum truncate tabular-nums">{currency}</span>
          <span className="text-4xl md:text-5xl font-sans tracking-tight truncate text-platinum">
            {thisMonthIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

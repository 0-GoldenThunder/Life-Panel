import React from 'react';
import { useStore } from '@nanostores/react';
import { $transactions, $totalBalance } from '../stores/lifeStore';
import { DeliberateVoid } from './ui/DeliberateVoid';
import { cn } from '../lib/utils';
import type { Transaction } from '../types/models';

export const FiscalCommandCenter: React.FC = () => {
  const transactions = useStore($transactions);
  const totalBalance = useStore($totalBalance);

  const activeTxs = transactions.filter(t => !t._deleted).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }).slice(0, 5); // Show latest 5

  return (
    <div className="flex flex-col h-full">
      {/* Pulse Metric Widget */}
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-sm text-platinum/60">Pulse</span>
        <span className={cn(
          "text-3xl font-serif tracking-tight",
          totalBalance < 0 ? "text-soft-crimson glow-error" : "text-luxury-gold glow-gold"
        )}>
          ${totalBalance.toFixed(2)}
        </span>
      </div>

      <div className="grow">
        {activeTxs.length === 0 ? (
          <DeliberateVoid type="bento" />
        ) : (
          <div className="space-y-4">
            {activeTxs.map((tx: Transaction) => (
              <div key={tx.id} className="flex items-center justify-between p-3 border-b border-[#222] last:border-0 hover:bg-[#111] transition-colors rounded-lg cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-sm text-platinum font-medium">{tx.category}</span>
                  {tx.note && <span className="text-xs text-platinum/40">{tx.note}</span>}
                </div>
                <div className={cn(
                  "text-sm font-semibold",
                  tx.type === 'expense' ? "text-platinum/80" : "text-luxury-gold"
                )}>
                  {tx.type === 'expense' ? '-' : '+'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

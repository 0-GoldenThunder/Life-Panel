import React from 'react';
import { useStore } from '@nanostores/react';
import { $upcomingPayments, $activeCurrency, $isDbReady } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { CalendarClock } from 'lucide-react';

export const UpcomingPaymentsCard: React.FC = () => {
  const upcoming = useStore($upcomingPayments);
  const currency = useStore($activeCurrency);
  const isDbReady = useStore($isDbReady);
  
  // Just grabbing the first 3 for the summary card
  const displayItems = upcoming.slice(0, 3);

  return (
    <a href="/subscriptions" className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl h-full group hover:border-luxury-gold/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-500 relative cursor-pointer">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon={CalendarClock} className="w-4 h-4 text-platinum/40 group-hover:text-platinum transition-colors" />
        <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors">
          Upcoming (7 Days)
        </span>
      </div>
      
      <div className="flex-1 flex flex-col justify-end gap-3">
        {displayItems.length === 0 ? (
          <div className="text-sm text-platinum/40 italic pb-2">No upcoming payments.</div>
        ) : (
          displayItems.map(item => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="text-sm text-platinum font-medium truncate pr-2">{item.name}</span>
              <span className="text-sm font-sans font-semibold tabular-nums text-platinum/80 shrink-0">
                {currency} {item.displayAmount?.toFixed(2) || item.amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </a>
  );
};

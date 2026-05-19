import React from 'react';
import { useStore } from '@nanostores/react';
import { $events } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { CalendarDays, ArrowRight } from 'lucide-react';

export const UpcomingEventsCard: React.FC = () => {
  const events = useStore($events);

  // Filter for upcoming events/goals and sort by date
  const upcoming = events
    .filter(e => !e._deleted && e.status !== 'completed' && e.status !== 'archived')
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      // If no date, put it at the end
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    })
    .slice(0, 3);

  return (
    <a 
      href="/events"
      className="flex flex-col p-6 rounded-2xl bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl h-full group hover:border-luxury-gold/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-500 relative overflow-hidden cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon={CalendarDays} className="w-4 h-4 text-platinum/40 group-hover:text-platinum transition-colors" />
          <span className="text-xs font-semibold tracking-widest text-platinum/40 uppercase group-hover:text-platinum transition-colors">
            Events & Goals
          </span>
        </div>
        <Icon icon={ArrowRight} className="w-4 h-4 text-platinum/20 group-hover:text-platinum transition-colors translate-x-0 group-hover:translate-x-1" />
      </div>
      
      <div className="flex-1 flex flex-col justify-end gap-3">
        {upcoming.length === 0 ? (
          <div className="text-sm text-platinum/40 italic pb-2">No upcoming events.</div>
        ) : (
          upcoming.map(event => (
            <div key={event.id} className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${event.priority === 3 ? 'bg-luxury-gold glow-gold' : 'bg-platinum/40'}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-platinum font-medium truncate">{event.title}</span>
                {event.startDate && (
                  <span className="text-[10px] text-platinum/40 uppercase tracking-wider">
                    {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </a>
  );
};

import React from 'react';
import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { $events } from '../stores/lifeStore';
import { getDatabase } from '../db';
import { DeliberateVoid } from './ui/DeliberateVoid';
import { Icon } from './ui/Icon';
import { CheckCircle2, Circle, Clock, Calendar as CalendarIcon, Flag, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Event } from '../types/models';

interface EventGoalManagerProps {
  onEventClick?: (event: Event) => void;
  selectedDate?: Date | null;
}

export const EventGoalManager: React.FC<EventGoalManagerProps> = ({ onEventClick, selectedDate }) => {
  const events = useStore($events);
  
  // Filter out completed tasks or soft deleted, optionally filter by selectedDate
  let activeEvents = events.filter(e => !e._deleted && e.status !== 'completed');
  
  if (selectedDate) {
    activeEvents = activeEvents.filter(e => {
      if (!e.startDate) return false;
      const eventDate = new Date(e.startDate);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    });
  }

  activeEvents.sort((a, b) => {
    // Sort by priority (3 is highest) then by creation date
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleToggleComplete = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const db = getDatabase();
    const doc = await db.events.findOne(eventId).exec();
    if (doc) {
      await doc.patch({
        status: 'completed',
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const db = getDatabase();
    const doc = await db.events.findOne(eventId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        updatedAt: new Date().toISOString()
      });
    }
  };

  if (activeEvents.length === 0) {
    return <DeliberateVoid type="card" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {activeEvents.map((event: Event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => onEventClick?.(event)}
            className={cn(
              "group relative flex items-start gap-4 p-4 rounded-xl bg-[#0A0A0A]/50 border transition-all cursor-pointer",
              event.priority === 3 
                ? "border-luxury-gold/30 glow-gold" // High priority gets a slight gold glow
                : "border-[#222] hover:border-[#444]"
            )}
          >
            <button 
              onClick={(e) => handleToggleComplete(e, event.id)}
              className="mt-0.5 text-platinum/40 hover:text-luxury-gold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-luxury-gold rounded-full"
              title="Mark Completed"
            >
              <Icon icon={event.status === 'in_progress' ? Clock : Circle} className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-platinum truncate">{event.title}</h3>
              {event.description && (
                <p className="text-xs text-platinum/50 mt-1 line-clamp-2">{event.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-platinum/40 uppercase tracking-wider">
                {event.startDate && (
                  <span className="flex items-center gap-1">
                    <Icon icon={CalendarIcon} className="w-3 h-3" />
                    {new Date(event.startDate).toLocaleDateString()} {event.allDay ? '' : new Date(event.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Icon icon={Flag} className="w-3 h-3" />
                  {event.type}
                </span>
              </div>
            </div>
            
            <button 
              onClick={(e) => handleDelete(e, event.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-platinum/40 hover:text-soft-crimson transition-all self-center"
              title="Delete Event"
            >
              <Icon icon={Trash2} className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};


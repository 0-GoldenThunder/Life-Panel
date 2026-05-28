import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $events, $userSession } from '../../stores/lifeStore';
import { getDatabase } from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '../ui/Icon';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { Event, EventType, EventPriority } from '../../types/models';
import { EventGoalManager } from '../EventGoalManager';
import { cn } from '../../lib/utils';
import { useHydrated } from '../../hooks/useHydrated';

export const EventCalendar: React.FC = () => {
  const isHydrated = useHydrated();
  const events = useStore($events);
  
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('event');
  const [priority, setPriority] = useState<EventPriority>(2);
  const [allDay, setAllDay] = useState(true);
  const [time, setTime] = useState('12:00'); // Default time

  if (!isHydrated) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="h-[400px] bg-[#0A0A0A]/50 border border-[#222] rounded-2xl"></div>
      </div>
    );
  }

  // Calendar logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const activeEvents = events.filter(e => !e._deleted && e.status !== 'completed');

  const getEventsForDay = (day: number) => {
    return activeEvents.filter(e => {
      if (!e.startDate) return false;
      const eventDate = new Date(e.startDate);
      return (
        eventDate.getFullYear() === currentDate.getFullYear() &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getDate() === day
      );
    });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedDate) return;

    const db = getDatabase();
    const now = new Date().toISOString();
    
    // Construct the start date taking time into account if not all day
    const startDateObj = new Date(selectedDate);
    if (!allDay) {
      const [hours, minutes] = time.split(':').map(Number);
      startDateObj.setHours(hours, minutes, 0, 0);
    }
    
    const session = $userSession.get();
    const userId = session?.user?.id || 'default_user';

    await db.events.insert({
      id: uuidv4(),
      userId,
      title,
      description,
      status: 'pending',
      priority,
      type,
      allDay,
      startDate: startDateObj.toISOString(),
      endDate: null,
      createdAt: now,
      updatedAt: now,
    });
    
    setTitle('');
    setDescription('');
    setPriority(2);
    setType('event');
    setAllDay(true);
    setIsFormOpen(false);
  };


  // Calendar rendering
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="p-2 aspect-square" />);
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDay(d);
    const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentDate.getMonth();
    const isToday = new Date().getDate() === d && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
    
    days.push(
      <div 
        key={`day-${d}`} 
        onClick={() => handleDateClick(d)}
        className={cn(
          "p-2 min-h-[80px] border border-[#222] transition-colors cursor-pointer relative group flex flex-col gap-1",
          isSelected ? "bg-[#1A1A1A] border-platinum/30" : "bg-[#0A0A0A]/50 hover:bg-[#1A1A1A]",
          isToday ? "border-luxury-gold/30" : ""
        )}
      >
        <span className={cn(
          "text-sm font-semibold flex items-center justify-center w-6 h-6 rounded-full",
          isToday ? "bg-luxury-gold text-obsidian" : "text-platinum/60"
        )}>
          {d}
        </span>
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] no-scrollbar">
          {dayEvents.map((evt, i) => (
            <div key={evt.id || i} className={cn(
              "text-[9px] truncate px-1 rounded-sm flex items-center gap-1",
              evt.type === 'goal' ? "bg-soft-crimson/20 text-soft-crimson" : "bg-platinum/10 text-platinum"
            )}>
              <div className={cn("w-1 h-1 rounded-full", evt.priority === 3 ? "bg-luxury-gold" : "bg-platinum/40")} />
              {evt.title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between p-4 bg-[#0A0A0A]/50 border border-[#222] rounded-xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-platinum font-sans tracking-tight">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 text-platinum/50 hover:text-platinum hover:bg-[#1a1a1a] rounded-lg transition-colors">
              <Icon icon={ChevronLeft} className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 text-platinum/50 hover:text-platinum hover:bg-[#1a1a1a] rounded-lg transition-colors">
              <Icon icon={ChevronRight} className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-[#0A0A0A]/50 border border-[#222] rounded-xl backdrop-blur-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#222]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-xs font-semibold text-platinum/40 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days}
          </div>
        </div>
      </div>

      {/* Side Panel for Event List & CRUD */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4">
        <div className="flex items-center justify-between p-4 bg-[#0A0A0A]/50 border border-[#222] rounded-xl backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-platinum/60 uppercase tracking-widest">
            {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'All Events'}
          </h3>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-luxury-gold text-obsidian px-3 py-1.5 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors text-xs"
          >
            {isFormOpen ? (
              <><Icon icon={X} className="w-3 h-3" />Cancel</>
            ) : (
              <><Icon icon={Plus} className="w-3 h-3" />Add New</>
            )}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleAddEvent} className="bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl p-5 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none" placeholder="Event or goal name..." />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-platinum/50 uppercase tracking-wider">Type</label>
                <select value={type} onChange={e => setType(e.target.value as EventType)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none">
                  <option value="event">Event</option>
                  <option value="goal">Goal</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-platinum/50 uppercase tracking-wider">Priority</label>
                <select value={priority} onChange={e => setPriority(Number(e.target.value) as EventPriority)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none">
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="allDay" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="accent-luxury-gold" />
              <label htmlFor="allDay" className="text-sm text-platinum/80">All Day Event</label>
            </div>

            {!allDay && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-platinum/50 uppercase tracking-wider">Time</label>
                <input type="time" required={!allDay} value={time} onChange={e => setTime(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none w-[120px]" />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Notes</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none resize-none" placeholder="Details (optional)..." />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-luxury-gold text-obsidian px-6 py-2 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors text-sm w-full">
                Save {type === 'goal' ? 'Goal' : 'Event'}
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          <EventGoalManager selectedDate={selectedDate} />
        </div>
      </div>
    </div>
  );
};

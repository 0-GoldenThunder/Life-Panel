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

export const EventCalendar: React.FC = () => {
  const events = useStore($events);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('event');
  const [priority, setPriority] = useState<EventPriority>(2);
  const [allDay, setAllDay] = useState(true);
  const [time, setTime] = useState('12:00'); // Default time

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
    <div className="flex flex-col gap-8 w-full">
      {/* Calendar Area */}
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between p-5 bg-[#0A0A0A]/50 border border-[#222] rounded-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-serif text-platinum tracking-tight">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2.5 text-platinum/50 hover:text-platinum hover:bg-[#1a1a1a] rounded-xl transition-all hover:shadow-[0_0_15px_rgba(212,175,55,0.05)] border border-transparent hover:border-[#333]">
              <Icon icon={ChevronLeft} className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2.5 text-platinum/50 hover:text-platinum hover:bg-[#1a1a1a] rounded-xl transition-all hover:shadow-[0_0_15px_rgba(212,175,55,0.05)] border border-transparent hover:border-[#333]">
              <Icon icon={ChevronRight} className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-[#0A0A0A]/50 border border-[#222] rounded-2xl backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="grid grid-cols-7 border-b border-[#222] bg-[#111]/30">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-4 text-center text-xs font-semibold text-platinum/40 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days}
          </div>
        </div>
      </div>

      {/* Bottom Panel for Event List & CRUD */}
      <div className="w-full flex flex-col gap-4 bg-[#0A0A0A]/30 border border-[#222]/50 p-6 rounded-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-serif text-platinum flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold glow-gold"></span>
            Agenda for {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'All Events'}
          </h3>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 px-4 py-2 rounded-xl font-semibold hover:bg-luxury-gold hover:text-obsidian transition-all duration-300 text-sm shadow-[0_0_15px_rgba(212,175,55,0.1)]"
          >
            {isFormOpen ? (
              <><Icon icon={X} className="w-4 h-4" />Cancel</>
            ) : (
              <><Icon icon={Plus} className="w-4 h-4" />New Event</>
            )}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleAddEvent} className="bg-[#111]/80 border border-[#333] p-6 rounded-2xl flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-300 mb-4 shadow-2xl">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Event Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none transition-colors" placeholder="e.g. Quarterly Review..." />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Classification</label>
                <select value={type} onChange={e => setType(e.target.value as EventType)} className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none transition-colors appearance-none">
                  <option value="event">Calendar Event</option>
                  <option value="goal">Strategic Goal</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Priority Level</label>
                <select value={priority} onChange={e => setPriority(Number(e.target.value) as EventPriority)} className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none transition-colors appearance-none">
                  <option value={1}>Standard</option>
                  <option value={2}>Important</option>
                  <option value={3}>Critical</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center transition-colors", allDay ? "bg-luxury-gold border-luxury-gold" : "bg-[#050505] border-[#333] group-hover:border-luxury-gold/50")}>
                  {allDay && <Icon icon={CheckCircle2} className="w-3.5 h-3.5 text-obsidian" />}
                </div>
                <input type="checkbox" className="hidden" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
                <span className="text-sm font-medium text-platinum/80 group-hover:text-platinum transition-colors">All Day Event</span>
              </label>

              {!allDay && (
                <div className="flex items-center gap-3">
                  <div className="w-[1px] h-4 bg-[#333]"></div>
                  <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold ml-2">Time</label>
                  <input type="time" required={!allDay} value={time} onChange={e => setTime(e.target.value)} className="bg-[#050505] border border-[#222] rounded-lg px-3 py-1.5 text-platinum focus:border-luxury-gold outline-none w-[120px] transition-colors" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Additional Details</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none resize-none transition-colors" placeholder="Notes, links, or context..." />
            </div>

            <div className="flex justify-end pt-4 border-t border-[#222]/50">
              <button type="submit" className="bg-luxury-gold text-obsidian px-8 py-3 rounded-xl font-bold hover:bg-white transition-colors text-sm shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                {type === 'goal' ? 'Establish Goal' : 'Schedule Event'}
              </button>
            </div>
          </form>
        )}

        <div className="w-full">
          <EventGoalManager selectedDate={selectedDate} />
        </div>
      </div>
    </div>
  );
};

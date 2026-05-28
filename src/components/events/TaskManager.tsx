import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { $tasks, $userId } from '../../stores/lifeStore';
import { getDatabase } from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '../ui/Icon';
import { Plus, Trash2, CheckCircle2, Circle, Flag, Calendar, ListTodo, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Task, TaskPriority, TaskStatus } from '../../types/models';

export const TaskManager: React.FC = () => {
  const tasks = useStore($tasks);
  const userId = useStore($userId);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(2);
  const [dueDate, setDueDate] = useState('');

  // Filter State
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  const activeTasks = tasks.filter((t: Task) => !t._deleted);

  const filteredTasks = activeTasks.filter((t: Task) => {
    if (activeTab === 'active') return t.status !== 'completed';
    if (activeTab === 'completed') return t.status === 'completed';
    return true;
  }).sort((a: Task, b: Task) => {
    // High priority first, then due date
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const db = getDatabase();
    const now = new Date().toISOString();

    await db.tasks.insert({
      id: uuidv4(),
      userId: userId || 'default_user',
      title,
      description,
      status: 'pending',
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdAt: now,
      updatedAt: now,
    });

    setTitle('');
    setDescription('');
    setPriority(2);
    setDueDate('');
    setIsFormOpen(false);
  };

  const handleToggleComplete = async (id: string, currentStatus: TaskStatus) => {
    const db = getDatabase();
    const doc = await db.tasks.findOne(id).exec();
    if (doc) {
      const newStatus: TaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await doc.patch({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleDelete = async (id: string) => {
    const db = getDatabase();
    const doc = await db.tasks.findOne(id).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header and Controls */}
      <div className="flex items-center justify-between p-6 bg-[#0A0A0A]/50 border border-[#222] rounded-2xl backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-luxury-gold/10 rounded-lg">
            <Icon icon={ListTodo} className="w-5 h-5 text-luxury-gold glow-gold" />
          </div>
          <div>
            <h3 className="text-xl font-serif text-platinum tracking-tight">
              Personal Tasks
            </h3>
            <p className="text-xs text-platinum/40 uppercase tracking-widest mt-0.5">Manage your action items</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-[#111] p-1 rounded-xl border border-[#222]">
            {(['active', 'completed', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300",
                  activeTab === tab ? "bg-luxury-gold/10 text-luxury-gold shadow-[0_0_10px_rgba(212,175,55,0.1)]" : "text-platinum/40 hover:text-platinum hover:bg-[#1a1a1a]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-luxury-gold text-obsidian px-5 py-2.5 rounded-xl font-bold hover:bg-white transition-all duration-300 text-sm shadow-[0_0_15px_rgba(212,175,55,0.15)]"
          >
            {isFormOpen ? (
              <><Icon icon={X} className="w-4 h-4" />Cancel</>
            ) : (
              <><Icon icon={Plus} className="w-4 h-4" />New Task</>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex md:hidden bg-[#111] p-1 rounded-xl border border-[#222]">
        {(['active', 'completed', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 text-center",
              activeTab === tab ? "bg-luxury-gold/10 text-luxury-gold" : "text-platinum/40"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Quick Add Form */}
      {isFormOpen && (
        <form onSubmit={handleAddTask} className="bg-[#111]/80 border border-[#333] backdrop-blur-xl p-6 md:p-8 rounded-2xl flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Action Item</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none text-base transition-colors" 
              placeholder="What needs to be done?" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Priority Level</label>
              <select 
                value={priority} 
                onChange={e => setPriority(Number(e.target.value) as TaskPriority)} 
                className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none appearance-none transition-colors"
              >
                <option value={1}>Low - When Possible</option>
                <option value={2}>Medium - Important</option>
                <option value={3}>High - Urgent</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Target Date</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)} 
                className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none transition-colors" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">Context / Notes</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={2} 
              className="bg-[#050505] border border-[#222] rounded-xl px-4 py-3 text-platinum focus:border-luxury-gold outline-none resize-none transition-colors" 
              placeholder="Add details, links, or context..." 
            />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              className="bg-luxury-gold text-obsidian px-8 py-3 rounded-xl font-bold hover:bg-white transition-colors shadow-[0_0_20px_rgba(212,175,55,0.2)]"
            >
              Add to Checklist
            </button>
          </div>
        </form>
      )}

      {/* Task List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 min-h-[160px]">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="col-span-full p-12 text-center border border-[#222] rounded-2xl bg-[#0A0A0A]/30 text-platinum/40 text-sm flex flex-col items-center justify-center gap-3 backdrop-blur-md"
            >
              <Icon icon={CheckCircle2} className="w-12 h-12 opacity-20" />
              <p>No {activeTab === 'all' ? '' : activeTab} tasks currently in queue.</p>
            </motion.div>
          ) : (
            filteredTasks.map((task: Task) => {
              const isCompleted = task.status === 'completed';
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex flex-col p-5 rounded-2xl border transition-all duration-300 group backdrop-blur-md",
                    isCompleted
                      ? "bg-[#050505]/40 border-[#111] opacity-60"
                      : task.priority === 3
                      ? "bg-[#0A0A0A]/80 border-luxury-gold/30 hover:border-luxury-gold/60 shadow-[0_4px_20px_rgba(212,175,55,0.05)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.1)]"
                      : "bg-[#0A0A0A]/60 border-[#222] hover:border-[#333] hover:shadow-lg hover:bg-[#111]/80"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleComplete(task.id, task.status)}
                      className={cn(
                        "mt-1 transition-all duration-300 focus:outline-none shrink-0",
                        isCompleted 
                          ? "text-luxury-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" 
                          : "text-platinum/30 hover:text-luxury-gold hover:scale-110"
                      )}
                      title={isCompleted ? "Mark Pending" : "Mark Completed"}
                    >
                      <Icon icon={isCompleted ? CheckCircle2 : Circle} className="w-6 h-6" />
                    </button>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <span className={cn(
                          "font-semibold text-base text-platinum break-words leading-tight",
                          isCompleted && "line-through text-platinum/40"
                        )}>
                          {task.title}
                        </span>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-platinum/30 hover:text-soft-crimson hover:bg-soft-crimson/10 rounded-lg transition-all shrink-0"
                          title="Delete Task"
                        >
                          <Icon icon={Trash2} className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {task.description && !isCompleted && (
                        <p className="text-sm text-platinum/50 mt-2 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#222]/50 text-[10px] text-platinum/40 uppercase tracking-widest font-semibold">
                        <span className={cn(
                          "flex items-center gap-1.5",
                          task.priority === 3 && !isCompleted ? "text-luxury-gold glow-gold" : ""
                        )}>
                          <Icon icon={Flag} className="w-3.5 h-3.5" />
                          {task.priority === 1 ? 'Low' : task.priority === 2 ? 'Medium' : 'High'}
                        </span>
                        {task.dueDate && (
                          <span className={cn(
                            "flex items-center gap-1.5",
                            !isCompleted && new Date(task.dueDate) < new Date() ? "text-soft-crimson glow-error" : ""
                          )}>
                            <Icon icon={Calendar} className="w-3.5 h-3.5" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

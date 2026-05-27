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
    <div className="flex flex-col gap-4 w-full">
      {/* Header and Controls */}
      <div className="flex items-center justify-between p-4 bg-[#0A0A0A]/50 border border-[#222] rounded-xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Icon icon={ListTodo} className="w-5 h-5 text-luxury-gold glow-gold" />
          <h3 className="text-sm font-semibold text-platinum/60 uppercase tracking-widest">
            Personal Tasks
          </h3>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-1.5 bg-luxury-gold text-obsidian px-3 py-1.5 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors text-xs"
        >
          {isFormOpen ? (
            <><Icon icon={X} className="w-3.5 h-3.5" />Cancel</>
          ) : (
            <><Icon icon={Plus} className="w-3.5 h-3.5" />Add Task</>
          )}
        </button>
      </div>

      {/* Quick Add Form */}
      {isFormOpen && (
        <form onSubmit={handleAddTask} className="bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl p-5 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-platinum/50 uppercase tracking-wider">Task Title</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none text-sm" 
              placeholder="What needs to be done?" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Priority</label>
              <select 
                value={priority} 
                onChange={e => setPriority(Number(e.target.value) as TaskPriority)} 
                className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none text-sm"
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Due Date</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)} 
                className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none text-sm" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-platinum/50 uppercase tracking-wider">Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={2} 
              className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none resize-none text-sm" 
              placeholder="Add details..." 
            />
          </div>

          <button 
            type="submit" 
            className="bg-luxury-gold text-obsidian px-4 py-2 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors text-sm"
          >
            Create Task
          </button>
        </form>
      )}

      {/* Tabs / Filters */}
      <div className="flex bg-[#1A1A1A] p-1 rounded-lg border border-[#222] self-start">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200",
            activeTab === 'active' ? "bg-[#333] text-platinum" : "text-platinum/50 hover:text-platinum"
          )}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200",
            activeTab === 'completed' ? "bg-[#333] text-platinum" : "text-platinum/50 hover:text-platinum"
          )}
        >
          Completed
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200",
            activeTab === 'all' ? "bg-[#333] text-platinum" : "text-platinum/50 hover:text-platinum"
          )}
        >
          All
        </button>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2 min-h-[160px]">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="p-8 text-center border border-[#222] rounded-xl bg-[#0A0A0A]/30 text-platinum/40 text-sm"
            >
              No {activeTab === 'all' ? '' : activeTab} tasks found.
            </motion.div>
          ) : (
            filteredTasks.map((task: Task) => {
              const isCompleted = task.status === 'completed';
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex items-start justify-between p-4 rounded-xl border transition-all group",
                    isCompleted
                      ? "bg-[#050505]/50 border-[#111] opacity-50"
                      : task.priority === 3
                      ? "bg-[#0A0A0A]/50 border-luxury-gold/30 hover:border-luxury-gold/50 glow-gold"
                      : "bg-[#0A0A0A]/50 border-[#222] hover:border-[#333]"
                  )}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(task.id, task.status)}
                      className={cn(
                        "mt-0.5 transition-colors focus:outline-none",
                        isCompleted ? "text-luxury-gold" : "text-platinum/40 hover:text-luxury-gold"
                      )}
                      title={isCompleted ? "Mark Pending" : "Mark Completed"}
                    >
                      <Icon icon={isCompleted ? CheckCircle2 : Circle} className="w-5 h-5" />
                    </button>
                    
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "font-medium text-sm text-platinum break-words",
                        isCompleted && "line-through text-platinum/50"
                      )}>
                        {task.title}
                      </span>
                      {task.description && !isCompleted && (
                        <span className="text-xs text-platinum/50 mt-1 block">
                          {task.description}
                        </span>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-platinum/40 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Icon icon={Flag} className="w-3 h-3" />
                          {task.priority === 1 ? 'Low' : task.priority === 2 ? 'Medium' : 'High'}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Icon icon={Calendar} className="w-3 h-3" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-platinum/40 hover:text-soft-crimson transition-all self-center ml-2"
                    title="Delete Task"
                  >
                    <Icon icon={Trash2} className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

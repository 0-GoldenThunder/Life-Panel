import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $subscriptions, $inflows, $activeCurrency } from '../../stores/lifeStore';
import { getDatabase } from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '../ui/Icon';
import { Plus, Trash2, Repeat, CheckCircle2, Circle, X } from 'lucide-react';
import type { FinanceScope } from '../../types/models';

interface RecurringManagerProps {
  type: 'subscription' | 'inflow';
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({ type }) => {
  const items = useStore(type === 'subscription' ? $subscriptions : $inflows);
  const currency = useStore($activeCurrency);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [scope, setScope] = useState<FinanceScope>('personal');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const activeItems = items
    .filter((item: any) => !item._deleted)
    .sort((a: any, b: any) => new Date(a.nextBillingDate || 0).getTime() - new Date(b.nextBillingDate || 0).getTime());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !name) return;
    
    const db = getDatabase();
    const now = new Date();
    // Default next billing to 1 month from now
    const nextDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    
    const doc = {
      id: uuidv4(),
      userId: 'default_user',
      name: name,
      amount: parseFloat(amount),
      currency: currency,
      financeScope: scope,
      billingCycle: billingCycle,
      nextBillingDate: nextDate,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (type === 'subscription') {
      await db.subscriptions.insert(doc);
    } else {
      await db.inflows.insert(doc);
    }
    
    setAmount('');
    setName('');
    setIsFormOpen(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const db = getDatabase();
    const collection = type === 'subscription' ? db.subscriptions : db.inflows;
    const doc = await collection.findOne(id).exec();
    if (doc) {
      await doc.patch({
        isActive: !currentActive,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleDelete = async (id: string) => {
    const db = getDatabase();
    const collection = type === 'subscription' ? db.subscriptions : db.inflows;
    const doc = await collection.findOne(id).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        updatedAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 bg-luxury-gold text-obsidian px-4 py-2 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors"
        >
          <><Icon icon={Plus} className="w-4 h-4" />Add {type === 'subscription' ? 'Subscription' : 'Inflow'}</>
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleAdd} className="bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl p-6 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Form header with close button */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
            <span className="text-sm font-semibold text-platinum/60 uppercase tracking-widest">
              New {type === 'subscription' ? 'Subscription' : 'Inflow'}
            </span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 rounded-lg text-platinum/40 hover:text-platinum hover:bg-[#1a1a1a] transition-colors"
              title="Close"
            >
              <Icon icon={X} className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none" placeholder="e.g. Netflix" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Amount ({currency})</label>
              <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none" placeholder="0.00" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Cycle</label>
              <select value={billingCycle} onChange={e => setBillingCycle(e.target.value as 'monthly'|'yearly')} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Scope</label>
              <select value={scope} onChange={e => setScope(e.target.value as FinanceScope)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none">
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-lg text-platinum/50 hover:text-platinum hover:bg-[#1a1a1a] text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="bg-luxury-gold text-obsidian px-6 py-2 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors text-sm">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {activeItems.length === 0 ? (
          <div className="p-8 text-center border border-[#222] rounded-xl bg-[#0A0A0A]/30 text-platinum/40">
            No recurring {type === 'subscription' ? 'subscriptions' : 'inflows'} found.
          </div>
        ) : (
          activeItems.map((item: any) => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors group ${item.isActive ? 'bg-[#0A0A0A]/50 border-[#222] hover:border-[#333]' : 'bg-[#050505]/50 border-[#111] opacity-50'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleToggleActive(item.id, item.isActive)}
                  className="text-platinum/40 hover:text-luxury-gold transition-colors"
                >
                  <Icon icon={item.isActive ? CheckCircle2 : Circle} className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <span className={`font-medium ${item.isActive ? 'text-platinum' : 'text-platinum/50 line-through'}`}>{item.name}</span>
                  <div className="flex items-center gap-2 text-xs text-platinum/40">
                    <span className="flex items-center gap-1"><Icon icon={Repeat} className="w-3 h-3" /> {item.billingCycle}</span>
                    <span>•</span>
                    <span className="uppercase">{item.financeScope}</span>
                    {item.nextBillingDate && (
                      <>
                        <span>•</span>
                        <span>Next: {new Date(item.nextBillingDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <span className={`text-lg font-sans font-semibold tabular-nums ${!item.isActive ? 'text-platinum/50' : type === 'inflow' ? 'text-luxury-gold glow-gold' : 'text-soft-crimson glow-error'}`}>
                  <span className="font-serif italic mr-1">{type === 'inflow' ? '+' : '-'}{item.currency}</span><span className="font-sans tabular-nums">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-platinum/40 hover:text-soft-crimson transition-all"
                  title="Delete"
                >
                  <Icon icon={Trash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

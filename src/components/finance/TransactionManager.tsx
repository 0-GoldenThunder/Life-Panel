import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $transactions, $activeCurrency, $userSession, $isDbReady, convertCurrency } from '../../stores/lifeStore';
import { getDatabase } from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '../ui/Icon';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import type { FinanceScope } from '../../types/models';

interface TransactionManagerProps {
  forcedScope?: FinanceScope;
}

export const TransactionManager: React.FC<TransactionManagerProps> = ({ forcedScope }) => {
  const transactions = useStore($transactions);
  const currency = useStore($activeCurrency);
  const isDbReady = useStore($isDbReady);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  
  // If forcedScope is provided, we use it, otherwise we default to 'all'
  const [filterScope, setFilterScope] = useState<'all' | FinanceScope>(forcedScope || 'all');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [scope, setScope] = useState<FinanceScope>(forcedScope || 'personal');

  const activeTxs = transactions
    .filter(t => !t._deleted)
    .filter(t => filterType === 'all' || t.type === filterType)
    .filter(t => filterScope === 'all' || t.financeScope === filterScope)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const session = $userSession.get();
    const userId = session?.user?.id || 'default_user';

    await db.transactions.insert({
      id: uuidv4(),
      userId,
      amount: parseFloat(amount),
      currency: currency,
      financeScope: scope,
      type: type,
      category: category,
      note: note,
      date: now,
      createdAt: now,
      updatedAt: now,
    });
    
    setAmount('');
    setCategory('');
    setNote('');
    setIsFormOpen(false);
  };


  const handleDelete = async (id: string) => {
    const db = getDatabase();
    const tx = await db.transactions.findOne(id).exec();
    if (tx) {
      await tx.patch({
        _deleted: true,
        updatedAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-[#1A1A1A] p-1 rounded-lg border border-[#333]">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-[#333] text-platinum' : 'text-platinum/50 hover:text-platinum'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilterType('income')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'income' ? 'bg-luxury-gold/20 text-luxury-gold' : 'text-platinum/50 hover:text-platinum'}`}
          >
            Income
          </button>
          <button 
            onClick={() => setFilterType('expense')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'expense' ? 'bg-soft-crimson/20 text-soft-crimson' : 'text-platinum/50 hover:text-platinum'}`}
          >
            Expense
          </button>
        </div>

        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 bg-luxury-gold text-obsidian px-4 py-2 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors"
        >
          <><Icon icon={Plus} className="w-4 h-4" />Add Transaction</>
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleAddTransaction} className="bg-[#0A0A0A]/50 border border-[#222] backdrop-blur-xl p-6 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Form header with close button */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
            <span className="text-sm font-semibold text-platinum/60 uppercase tracking-widest">New Transaction</span>
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
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Type</label>
              <select value={type} onChange={e => setType(e.target.value as 'income'|'expense')} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            
            {!forcedScope && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-platinum/50 uppercase tracking-wider">Scope</label>
                <select value={scope} onChange={e => setScope(e.target.value as FinanceScope)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none">
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>
            )}

            <div className={`flex flex-col gap-1.5 ${forcedScope ? 'lg:col-span-2' : ''}`}>
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Amount ({currency})</label>
              <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none" placeholder="0.00" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-platinum/50 uppercase tracking-wider">Category</label>
              <input type="text" required value={category} onChange={e => setCategory(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none" placeholder="e.g. Groceries" />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-platinum/50 uppercase tracking-wider">Note (Optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-platinum focus:border-luxury-gold outline-none" placeholder="Details about this transaction..." />
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
              Save Transaction
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {!isDbReady ? (
          <div className="p-8 text-center border border-[#222] rounded-xl bg-[#0A0A0A]/30 text-platinum/40">
            <span className="animate-pulse">Loading...</span>
          </div>
        ) : activeTxs.length === 0 ? (
          <div className="p-8 text-center border border-[#222] rounded-xl bg-[#0A0A0A]/30 text-platinum/40">
            No transactions found.
          </div>
        ) : (
          activeTxs.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0A0A0A]/50 border border-[#222] hover:border-[#333] transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#1A1A1A] border ${tx.type === 'income' ? 'border-luxury-gold/30 text-luxury-gold' : 'border-soft-crimson/30 text-soft-crimson'}`}>
                  <Icon icon={tx.type === 'income' ? ArrowUpRight : ArrowDownRight} className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-platinum">{tx.category}</span>
                  <div className="flex items-center gap-2 text-xs text-platinum/40">
                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="uppercase">{tx.financeScope}</span>
                    {tx.note && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{tx.note}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <span className={`text-lg font-sans font-semibold tabular-nums ${tx.type === 'income' ? 'text-luxury-gold glow-gold' : 'text-soft-crimson glow-error'}`}>
                  <span className="font-serif mr-1">{tx.type === 'income' ? '+' : '-'}{currency}</span><span className="font-sans tabular-nums">{convertCurrency(tx.amount, tx.currency || 'MYR', currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                
                <button 
                  onClick={() => handleDelete(tx.id)}
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

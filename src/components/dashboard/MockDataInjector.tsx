import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $transactions, $subscriptions, $events } from '../../stores/lifeStore';
import { Icon } from '../ui/Icon';
import { Database, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, Subscription, Event } from '../../types/models';

export const MockDataInjector: React.FC = () => {
  const [injected, setInjected] = useState(false);
  const txs = useStore($transactions);

  // Check if we already have mock data (simple check)
  const hasMockData = txs.some(t => t.note === 'MOCK_DATA');

  const injectData = () => {
    const now = new Date();
    const mockTxs: Transaction[] = [];
    
    // Generate 365 days of organic transaction history
    for (let dayOffset = 365; dayOffset >= 0; dayOffset--) {
      const d = new Date();
      d.setDate(now.getDate() - dayOffset);
      const isoDate = d.toISOString();
      const dayOfMonth = d.getDate();
      const dayOfWeek = d.getDay(); // 0 is Sunday, 4 is Thursday, etc.
      
      // Personal Salary on 1st of every month
      if (dayOfMonth === 1) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: 5800,
          currency: 'MYR',
          financeScope: 'personal',
          type: 'income',
          category: 'Salary',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
      
      // Personal Rent on 2nd of every month
      if (dayOfMonth === 2) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: 1600,
          currency: 'MYR',
          financeScope: 'personal',
          type: 'expense',
          category: 'Rent',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
      
      // Business Client Retainer (Wave 1: around 5th)
      if (dayOfMonth === 5) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: parseFloat((2400 + Math.random() * 800).toFixed(2)),
          currency: 'USD',
          financeScope: 'business',
          type: 'income',
          category: 'Client Retainer',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }

      // Business Client Retainer (Wave 2: around 20th)
      if (dayOfMonth === 20) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: parseFloat((2600 + Math.random() * 1200).toFixed(2)),
          currency: 'USD',
          financeScope: 'business',
          type: 'income',
          category: 'Client Retainer',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
      
      // Business SaaS Services on 10th of every month
      if (dayOfMonth === 10) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: 290,
          currency: 'USD',
          financeScope: 'business',
          type: 'expense',
          category: 'Software Services',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
      
      // Weekly Groceries on Sundays
      if (dayOfWeek === 0) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: parseFloat((150 + Math.random() * 120).toFixed(2)),
          currency: 'MYR',
          financeScope: 'personal',
          type: 'expense',
          category: 'Groceries',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
      
      // Bi-weekly Social/Dining on Thursdays
      if (dayOfWeek === 4 && (dayOffset % 14 < 7)) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: parseFloat((100 + Math.random() * 180).toFixed(2)),
          currency: 'MYR',
          financeScope: 'personal',
          type: 'expense',
          category: 'Dining & Social',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
      
      // Occasional Business Marketing Campaign (every 2 months)
      if (dayOfMonth === 15 && d.getMonth() % 2 === 0) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: parseFloat((500 + Math.random() * 900).toFixed(2)),
          currency: 'USD',
          financeScope: 'business',
          type: 'expense',
          category: 'Marketing & Ads',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }

      // Passive income dividends on 25th of every month
      if (dayOfMonth === 25) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: parseFloat((500 + Math.random() * 400).toFixed(2)),
          currency: 'MYR',
          financeScope: 'personal',
          type: 'income',
          category: 'Passive Income',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }

      // Seasonal Big Expense: Annual server upgrade in August (August = Month index 7)
      if (d.getMonth() === 7 && dayOfMonth === 12) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: 3800,
          currency: 'USD',
          financeScope: 'business',
          type: 'expense',
          category: 'Server Upgrade',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }

      // Seasonal Big Gain: Annual client project bonus in November (November = Month index 10)
      if (d.getMonth() === 10 && dayOfMonth === 18) {
        mockTxs.push({
          id: uuidv4(),
          userId: 'mock',
          amount: 8200,
          currency: 'USD',
          financeScope: 'business',
          type: 'income',
          category: 'Project Milestone',
          note: 'MOCK_DATA',
          date: isoDate,
          createdAt: isoDate,
          updatedAt: isoDate,
        });
      }
    }

    const mockSubs: Subscription[] = [
      { id: uuidv4(), userId: 'mock', name: 'Adobe Creative Cloud', amount: 54.99, currency: 'USD', financeScope: 'business', billingCycle: 'monthly', nextBillingDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: uuidv4(), userId: 'mock', name: 'Netflix Premium', amount: 55, currency: 'MYR', financeScope: 'personal', billingCycle: 'monthly', nextBillingDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: uuidv4(), userId: 'mock', name: 'AWS Infrastructure', amount: 145, currency: 'USD', financeScope: 'business', billingCycle: 'monthly', nextBillingDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: uuidv4(), userId: 'mock', name: 'Spotify Premium', amount: 15.90, currency: 'MYR', financeScope: 'personal', billingCycle: 'monthly', nextBillingDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ];

    const mockEvents: Event[] = [
      { id: uuidv4(), userId: 'mock', title: 'Q3 Board Meeting', status: 'pending', priority: 3, type: 'event', allDay: false, startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), endDate: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), description: 'MOCK_DATA' },
      { id: uuidv4(), userId: 'mock', title: 'Launch Marketing Campaign', status: 'in_progress', priority: 2, type: 'goal', allDay: true, startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), endDate: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), description: 'MOCK_DATA' },
      { id: uuidv4(), userId: 'mock', title: 'Quarterly Tax Review', status: 'pending', priority: 1, type: 'event', allDay: false, startDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), endDate: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), description: 'MOCK_DATA' },
    ];

    $transactions.set(mockTxs); // Overwrite completely to keep performance high and avoid duplication
    $subscriptions.set(mockSubs);
    $events.set(mockEvents);
    
    setInjected(true);
  };

  const clearData = () => {
    $transactions.set($transactions.get().filter(t => t.note !== 'MOCK_DATA'));
    $subscriptions.set($subscriptions.get().filter(s => s.userId !== 'mock'));
    $events.set($events.get().filter(e => e.description !== 'MOCK_DATA'));
    setInjected(false);
  };

  return (
    <div className="flex items-center gap-2">
      {hasMockData || injected ? (
        <button 
          onClick={clearData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-soft-crimson/10 text-soft-crimson hover:bg-soft-crimson/20 border border-soft-crimson/20 transition-colors text-xs font-medium focus:outline-none"
        >
          <Icon icon={Trash2} className="w-3.5 h-3.5" />
          Clear Mock Data
        </button>
      ) : (
        <button 
          onClick={injectData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-platinum/60 hover:text-luxury-gold border border-[#333] hover:border-luxury-gold/30 transition-colors text-xs font-medium focus:outline-none"
        >
          <Icon icon={Database} className="w-3.5 h-3.5" />
          Inject Mock Data
        </button>
      )}
    </div>
  );
};

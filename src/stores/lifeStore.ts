import { atom, computed } from 'nanostores';
import type { Session } from '@supabase/supabase-js';
import type { Event, Transaction, Subscription, Inflow, Task } from '../types/models';
import { supabase } from '../lib/supabase';

/**
 * Shared reactive atoms that any React Island can subscribe to.
 * This ensures "Pro Max" synchronicity across the UI.
 */
export const $events = atom<Event[]>([]);
export const $tasks = atom<Task[]>([]);
export const $transactions = atom<Transaction[]>([]);
export const $subscriptions = atom<Subscription[]>([]);
export const $inflows = atom<Inflow[]>([]);

export const $userSession = atom<Session | null>(null);
export const $userId = atom<string | null>(null);


// UI State Atoms
export const $isSyncing = atom<boolean>(false);
export const $syncError = atom<string | null>(null); // null = healthy
export const $lastSyncTime = atom<Date | null>(null);
export const $activeCurrency = atom<string>('IDR'); // Default currency
export const $isDbReady = atom<boolean>(false); // True after initDatabase() resolves

// Mock Exchange Rates relative to USD for MVP
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  MYR: 4.7,
  IDR: 16000,
};

// Helper to convert any amount from its source currency to the target currency
export const convertCurrency = (amount: number, fromCurrency: string, targetCurrency: string) => {
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const targetRate = EXCHANGE_RATES[targetCurrency] || 1;
  // Convert to USD first, then to target
  return (amount / fromRate) * targetRate;
};

// Summary Stats (Computed values derived from stores)
export const $personalBalance = computed(
  [$transactions, $inflows, $activeCurrency],
  (transactions, inflows, activeCurrency) => {
    const personalTxs = transactions.filter(t => !t._deleted && t.financeScope === 'personal');
    return personalTxs.reduce((sum, tx) => {
      const convertedAmount = convertCurrency(tx.amount, tx.currency || 'MYR', activeCurrency);
      return sum + (tx.type === 'income' ? convertedAmount : -convertedAmount);
    }, 0);
  }
);

export const $businessBalance = computed(
  [$transactions, $inflows, $activeCurrency],
  (transactions, inflows, activeCurrency) => {
    const businessTxs = transactions.filter(t => !t._deleted && t.financeScope === 'business');
    return businessTxs.reduce((sum, tx) => {
      const convertedAmount = convertCurrency(tx.amount, tx.currency || 'MYR', activeCurrency);
      return sum + (tx.type === 'income' ? convertedAmount : -convertedAmount);
    }, 0);
  }
);

export const $totalBalance = computed(
  [$personalBalance, $businessBalance],
  (personal, business) => personal + business
);

export const $totalMonthlyOutflow = computed(
  [$subscriptions, $activeCurrency],
  (subscriptions, activeCurrency) => {
    const activeSubs = subscriptions.filter(s => !s._deleted && s.isActive);
    return activeSubs.reduce((sum, sub) => {
      const convertedAmount = convertCurrency(sub.amount, sub.currency || 'MYR', activeCurrency);
      return sum + convertedAmount;
    }, 0); 
  }
);

export const $upcomingPayments = computed(
  [$subscriptions, $inflows, $activeCurrency], // Add $activeCurrency to deps to trigger re-renders
  (subscriptions, inflows, activeCurrency) => {
    // Return the items but we will let the UI handle the conversion or just return them as is
    // Wait, the UI uses the item.amount directly. We should return a view model with converted amounts.
    return subscriptions.filter(s => !s._deleted && s.isActive).map(sub => ({
      ...sub,
      displayAmount: convertCurrency(sub.amount, sub.currency || 'MYR', activeCurrency)
    }));
  }
);

export const signOutUser = async () => {
  // 1. Storage Lock Signal
  if (typeof window !== 'undefined') {
    localStorage.setItem('life_panel_logout_purge', 'true');
  }

  // 2. Halt replications and listeners
  const { haltActiveSyncAndListeners } = await import('../db');
  await haltActiveSyncAndListeners();

  // 3. Close & destroy database cleanly to release locks
  const { getDatabase } = await import('../db');
  try {
    const db = getDatabase();
    await db.destroy();
  } catch (err) {
    console.warn('[LifeManager] DB already destroyed or not initialized:', err);
  }

  // 4. Wait 500ms safety buffer for other tabs to complete lock release
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 5. Purge with Retry & Backoff (Dexie IndexedDB file delete)
  const { removeRxDatabase } = await import('rxdb');
  const { getRxStorageDexie } = await import('rxdb/plugins/storage-dexie');
  
  let purged = false;
  let delay = 500;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await removeRxDatabase('lifemanagerdb', getRxStorageDexie());
      purged = true;
      console.log(`[LifeManager] Database purged successfully on attempt ${attempt}`);
      break;
    } catch (err) {
      console.warn(`[LifeManager] Purge attempt ${attempt} failed:`, err);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      }
    }
  }

  if (!purged) {
    console.error('[LifeManager] Failed to purge IndexedDB after 3 attempts.');
  }

  // 6. Clear storage signal
  if (typeof window !== 'undefined') {
    localStorage.removeItem('life_panel_logout_purge');
  }

  // 7. Clear Supabase auth session
  await supabase.auth.signOut();

  // 8. Redirect to Login Screen
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};


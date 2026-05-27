import { addRxPlugin, createRxDatabase, type RxConflictHandler, type RxConflictHandlerInput } from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
addRxPlugin(RxDBMigrationSchemaPlugin);
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';
import { eventSchema, transactionSchema, subscriptionSchema, inflowSchema, taskSchema } from './schemas';
import { 
  $events, 
  $transactions, 
  $subscriptions, 
  $inflows, 
  $tasks,
  $isSyncing, 
  $syncError, 
  $isDbReady,
  $userSession
} from '../stores/lifeStore';
import { safeRefreshSession } from '../lib/authRefresh';
import { supabase } from '../lib/supabase';

const lwwConflictHandler: RxConflictHandler<any> = {
  isEqual: (a: any, b: any) => {
    return a.updatedAt === b.updatedAt && a.version === b.version;
  },
  resolve: async (input: RxConflictHandlerInput<any>) => {
    const localTime    = new Date(input.realMasterState.updatedAt).getTime();
    const remoteTime   = new Date(input.newDocumentState.updatedAt).getTime();
    const localVersion = input.realMasterState.version ?? 0;
    const remoteVersion= input.newDocumentState.version ?? 0;

    const remoteWins = remoteVersion !== localVersion
      ? remoteVersion > localVersion
      : remoteTime >= localTime;

    return remoteWins ? input.newDocumentState : input.realMasterState;
  }
};

const migrationStrategies = {};

// v0 → v1: added `currency` and `financeScope` to transactions, subscriptions, inflows.
const currencyMigration = {
  1: (oldDoc: any) => ({
    ...oldDoc,
    currency:     oldDoc.currency     ?? 'USD',
    financeScope: oldDoc.financeScope ?? 'personal',
  }),
};

let dbInstance: any = null;
let activeReplications: any[] = [];
let activeSubscriptions: any[] = [];

export const getDatabase = () => {
  if (!dbInstance) {
    throw new Error("Database not initialized yet.");
  }
  return dbInstance;
};

export const haltActiveSyncAndListeners = async () => {
  console.log('[LifeManager] Halting active replications and subscriptions...');
  // Cancel active replications
  for (const repl of activeReplications) {
    try {
      await repl.cancel();
    } catch (e) {
      console.warn('[LifeManager] Error cancelling replication:', e);
    }
  }
  activeReplications = [];

  // Unsubscribe from query listeners
  for (const sub of activeSubscriptions) {
    try {
      sub.unsubscribe();
    } catch (e) {
      console.warn('[LifeManager] Error unsubscribing:', e);
    }
  }
  activeSubscriptions = [];
  
  $isDbReady.set(false);
};

export const initDatabase = async () => {
  if (dbInstance) return dbInstance;

  try {
    await safeRefreshSession();
  } catch (err) {
    $isSyncing.set(false);
    console.warn('[LifeManager] Boot refresh skipped — operating offline.', err);
  }

  const db = await createRxDatabase({
    name: 'lifemanagerdb',
    storage: getRxStorageDexie(),
  });
  
  dbInstance = db;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    if (!isPersisted) {
      console.warn('[LifeManager] Storage persistence denied. Data may be evicted under pressure.');
    }
  }

  try {
    await db.addCollections({
      events:        { schema: eventSchema,        conflictHandler: lwwConflictHandler, migrationStrategies },
      transactions:  { schema: transactionSchema,  conflictHandler: lwwConflictHandler, migrationStrategies: currencyMigration },
      subscriptions: { schema: subscriptionSchema, conflictHandler: lwwConflictHandler, migrationStrategies: currencyMigration },
      inflows:       { schema: inflowSchema,       conflictHandler: lwwConflictHandler, migrationStrategies: currencyMigration },
      tasks:         { schema: taskSchema,         conflictHandler: lwwConflictHandler, migrationStrategies },
    });
  } catch (err: any) {
    const isSchemaError = err?.code === 'DB6' || err?.message?.includes('DB6');

    if (isSchemaError) {
      console.warn('[LifeManager] DB6 schema mismatch — wiping stale IndexedDB and reloading...');

      // Force-delete all IDB stores directly (no RxDB API — db may be partially init'd)
      const allDbs: IDBDatabaseInfo[] = await (indexedDB.databases?.() ?? Promise.resolve([]));
      await Promise.all(
        allDbs
          .filter(d => d.name?.startsWith('lifemanagerdb'))
          .map(d => new Promise<void>((res) => {
            const req = indexedDB.deleteDatabase(d.name!);
            req.onsuccess = () => res();
            req.onerror   = () => res();
          }))
      );

      window.location.reload();
      return;
    }

    throw err;
  }




  const session = $userSession.get();
  const userId = session?.user?.id || 'default_user';

  const startReplication = (collection: any, tableName: string) => {
    const replicationState = replicateSupabase({
      replicationIdentifier: `life_manager_supabase_repl_${userId}_${tableName}`,
      client: supabase,
      collection: collection,
      pull: {},
      push: {},
      live: true,
      retryTime: 5000,
      waitForLeadership: true,
      autoStart: true,
      tableName: tableName
    } as any);

    replicationState.error$.subscribe((err: any) => {
      if (err) {
        $syncError.set('sync_stalled');
        $isSyncing.set(false);
        console.warn(`[LifeManager] Replication stalled for ${tableName}:`, err);
      }
    });

    replicationState.active$.subscribe((isActive: boolean) => {
      if (isActive) {
        $syncError.set(null);
      }
      $isSyncing.set(isActive);
    });

    activeReplications.push(replicationState);
    return replicationState;
  };

  startReplication(db.events, 'events');
  startReplication(db.transactions, 'transactions');
  startReplication(db.subscriptions, 'subscriptions');
  startReplication(db.inflows, 'inflows');
  startReplication(db.tasks, 'tasks');

  const subEvents = db.events.find().$.subscribe((events: any) => {
    $events.set(events.map((doc: any) => doc.toJSON()));
  });
  activeSubscriptions.push(subEvents);

  const subTxs = db.transactions.find().$.subscribe((txs: any) => {
    $transactions.set(txs.map((doc: any) => doc.toJSON()));
  });
  activeSubscriptions.push(subTxs);

  const subSubs = db.subscriptions.find().$.subscribe((subs: any) => {
    $subscriptions.set(subs.map((doc: any) => doc.toJSON()));
  });
  activeSubscriptions.push(subSubs);

  const subInflows = db.inflows.find().$.subscribe((inflows: any) => {
    $inflows.set(inflows.map((doc: any) => doc.toJSON()));
  });
  activeSubscriptions.push(subInflows);

  const subTasks = db.tasks.find().$.subscribe((tasks: any) => {
    $tasks.set(tasks.map((doc: any) => doc.toJSON()));
  });
  activeSubscriptions.push(subTasks);

  $isDbReady.set(true);

  return db;
};

export const forceRefreshData = async () => {
  if (!dbInstance) return;
  
  $isSyncing.set(true);
  try {
    const [events, txs, subs, inflows, tasks] = await Promise.all([
      dbInstance.events.find().exec(),
      dbInstance.transactions.find().exec(),
      dbInstance.subscriptions.find().exec(),
      dbInstance.inflows.find().exec(),
      dbInstance.tasks.find().exec(),
    ]);

    $events.set(events.map((doc: any) => doc.toJSON()));
    $transactions.set(txs.map((doc: any) => doc.toJSON()));
    $subscriptions.set(subs.map((doc: any) => doc.toJSON()));
    $inflows.set(inflows.map((doc: any) => doc.toJSON()));
    $tasks.set(tasks.map((doc: any) => doc.toJSON()));

    for (const repl of activeReplications) {
      if (typeof repl.reSync === 'function') {
        repl.reSync();
      }
    }
  } catch (err) {
    console.warn('[LifeManager] Error during force refresh:', err);
  } finally {
    setTimeout(() => {
      $isSyncing.set(false);
    }, 500);
  }
};

// ── Multi-Tab Lock Contention Coordination ─────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('storage', async (event) => {
    if (event.key === 'life_panel_logout_purge' && event.newValue === 'true') {
      console.log('[LifeManager] Multi-tab logout signal received. Halting and releasing connection locks...');
      await haltActiveSyncAndListeners();
      if (dbInstance) {
        try {
          await dbInstance.destroy();
          dbInstance = null;
        } catch (err) {
          console.warn('[LifeManager] Failed to destroy DB cleanly in storage listener:', err);
        }
      }
    }
  });
}


import { createRxDatabase, type RxConflictHandler, type RxConflictHandlerInput } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';
import { eventSchema, transactionSchema, subscriptionSchema, inflowSchema } from './schemas';
import { $events, $transactions, $subscriptions, $inflows, $isSyncing, $syncError, $isDbReady } from '../stores/lifeStore';
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

let dbInstance: any = null;

export const getDatabase = () => {
  if (!dbInstance) {
    throw new Error("Database not initialized yet.");
  }
  return dbInstance;
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

  await db.addCollections({
    events: { schema: eventSchema, conflictHandler: lwwConflictHandler, migrationStrategies },
    transactions: { schema: transactionSchema, conflictHandler: lwwConflictHandler, migrationStrategies },
    subscriptions: { schema: subscriptionSchema, conflictHandler: lwwConflictHandler, migrationStrategies },
    inflows: { schema: inflowSchema, conflictHandler: lwwConflictHandler, migrationStrategies },
  });

  const startReplication = (collection: any, tableName: string) => {
    const replicationState = replicateSupabase({
      replicationIdentifier: `life_manager_supabase_repl_${tableName}`,
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

    return replicationState;
  };

  startReplication(db.events, 'events');
  startReplication(db.transactions, 'transactions');
  startReplication(db.subscriptions, 'subscriptions');
  startReplication(db.inflows, 'inflows');

  db.events.find().$.subscribe((events: any) => {
    $events.set(events.map((doc: any) => doc.toJSON()));
  });
  db.transactions.find().$.subscribe((txs: any) => {
    $transactions.set(txs.map((doc: any) => doc.toJSON()));
  });
  db.subscriptions.find().$.subscribe((subs: any) => {
    $subscriptions.set(subs.map((doc: any) => doc.toJSON()));
  });
  db.inflows.find().$.subscribe((inflows: any) => {
    $inflows.set(inflows.map((doc: any) => doc.toJSON()));
  });

  $isDbReady.set(true);

  return db;
};

-- ────────────────────────────────────────────────────────────────
-- Life Panel — Supabase PostgreSQL Schema Setup (Audit Refined)
-- ────────────────────────────────────────────────────────────────
-- Copy and run this script in your Supabase Project SQL Editor
-- (Dashboard → SQL Editor → New Query)
-- ────────────────────────────────────────────────────────────────

-- ── 1. CLEANUP / RESET (Optional) ───────────────────────────────
-- Uncomment if you want to perform a clean reinstall of the schemas
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS inflows CASCADE;

-- ── 2. TRIGGER FUNCTION FOR MODIFIED COLUMN ─────────────────────
-- RxDB's replication-supabase plugin relies on a monotonic column 
-- (by default named "_modified") to perform incremental pulls and pushes.
-- This function updates "_modified" to the current server timestamp.
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW._modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 3. EVENTS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
    type TEXT NOT NULL CHECK (type IN ('event', 'goal')),
    "allDay" BOOLEAN NOT NULL DEFAULT FALSE,
    "startDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    _deleted BOOLEAN NOT NULL DEFAULT FALSE,
    _modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indices for performance and replication pulls
CREATE INDEX IF NOT EXISTS idx_events_modified ON events(_modified DESC);
CREATE INDEX IF NOT EXISTS idx_events_userid ON events("userId");
CREATE INDEX IF NOT EXISTS idx_events_updated ON events("updatedAt");
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Attach modified trigger
DROP TRIGGER IF EXISTS trg_set_modified_events ON events;
CREATE TRIGGER trg_set_modified_events
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ── 4. TRANSACTIONS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    "financeScope" TEXT NOT NULL CHECK ("financeScope" IN ('personal', 'business')),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    note TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    _deleted BOOLEAN NOT NULL DEFAULT FALSE,
    _modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indices for performance and replication pulls
CREATE INDEX IF NOT EXISTS idx_transactions_modified ON transactions(_modified DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_userid ON transactions("userId");
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Attach modified trigger
DROP TRIGGER IF EXISTS trg_set_modified_transactions ON transactions;
CREATE TRIGGER trg_set_modified_transactions
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ── 5. SUBSCRIPTIONS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    "financeScope" TEXT NOT NULL CHECK ("financeScope" IN ('personal', 'business')),
    "billingCycle" TEXT NOT NULL CHECK ("billingCycle" IN ('monthly', 'yearly')),
    "nextBillingDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    _deleted BOOLEAN NOT NULL DEFAULT FALSE,
    _modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indices for performance and replication pulls
CREATE INDEX IF NOT EXISTS idx_subscriptions_modified ON subscriptions(_modified DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_userid ON subscriptions("userId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_billingdate ON subscriptions("nextBillingDate");

-- Attach modified trigger
DROP TRIGGER IF EXISTS trg_set_modified_subscriptions ON subscriptions;
CREATE TRIGGER trg_set_modified_subscriptions
BEFORE INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ── 6. INFLOWS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inflows (
    id TEXT PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    "financeScope" TEXT NOT NULL CHECK ("financeScope" IN ('personal', 'business')),
    type TEXT NOT NULL CHECK (type IN ('monthly_revenue', 'client_retainer', 'salary', 'passive_income', 'custom')),
    "nextExpectedDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    _deleted BOOLEAN NOT NULL DEFAULT FALSE,
    _modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indices for performance and replication pulls
CREATE INDEX IF NOT EXISTS idx_inflows_modified ON inflows(_modified DESC);
CREATE INDEX IF NOT EXISTS idx_inflows_userid ON inflows("userId");
CREATE INDEX IF NOT EXISTS idx_inflows_expecteddate ON inflows("nextExpectedDate");

-- Attach modified trigger
DROP TRIGGER IF EXISTS trg_set_modified_inflows ON inflows;
CREATE TRIGGER trg_set_modified_inflows
BEFORE INSERT OR UPDATE ON inflows
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ── 6b. TASKS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
    "dueDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    _deleted BOOLEAN NOT NULL DEFAULT FALSE,
    _modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indices for performance and replication pulls
CREATE INDEX IF NOT EXISTS idx_tasks_modified ON tasks(_modified DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_userid ON tasks("userId");
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Attach modified trigger
DROP TRIGGER IF EXISTS trg_set_modified_tasks ON tasks;
CREATE TRIGGER trg_set_modified_tasks
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ── 7. ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- We enable RLS on all tables to ensure strict privacy boundaries.
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ── 8. SECURE ACCESS POLICIES ───────────────────────────────────
-- Each user gets access ONLY to their own rows where the "userId"
-- matches their native Supabase Authentication UID (UUID).

-- Events Policy
DROP POLICY IF EXISTS "Users can manage their own events" ON events;
CREATE POLICY "Users can manage their own events" ON events
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Transactions Policy
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users can manage their own transactions" ON transactions
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Subscriptions Policy
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON subscriptions
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Inflows Policy
DROP POLICY IF EXISTS "Users can manage their own inflows" ON inflows;
CREATE POLICY "Users can manage their own inflows" ON inflows
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Tasks Policy
DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
CREATE POLICY "Users can manage their own tasks" ON tasks
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- ── 9. ENABLE REAL-TIME SYNC PUBLICATION ─────────────────────────
-- This adds the tables to the supabase_realtime publication. 
-- RxDB's replication-supabase plugin automatically listens to this publication
-- to stream live changes (WebSocket-based) when online.

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['events', 'transactions', 'subscriptions', 'inflows', 'tasks']) LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', t);
        END IF;
    END LOOP;
END;
$$;

-- ── 10. OPTIONAL: SOFT-DELETE PRUNING LIFECYCLE (CRON JOB) ───────
-- Highly recommended for active backend cleaning (e.g., pg_cron).
-- Wipes rows flagged as _deleted = true after a 30-day buffer, 
-- ensuring all offline clients have successfully replicated their deletion.
--
-- CREATE OR REPLACE FUNCTION purge_soft_deleted_records()
-- RETURNS VOID AS $$
-- BEGIN
--     DELETE FROM events WHERE _deleted = TRUE AND _modified < NOW() - INTERVAL '30 days';
--     DELETE FROM transactions WHERE _deleted = TRUE AND _modified < NOW() - INTERVAL '30 days';
--     DELETE FROM subscriptions WHERE _deleted = TRUE AND _modified < NOW() - INTERVAL '30 days';
--     DELETE FROM inflows WHERE _deleted = TRUE AND _modified < NOW() - INTERVAL '30 days';
--     DELETE FROM tasks WHERE _deleted = TRUE AND _modified < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;
--
-- -- Schedule to run every Sunday at midnight using pg_cron (if active)
-- -- SELECT cron.schedule('purge-soft-deleted-weekly', '0 0 * * 0', 'SELECT purge_soft_deleted_records()');


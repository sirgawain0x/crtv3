-- Notifications tables for Creative TV
-- Based on songchain-muse notification system

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    owner_id text NOT NULL,
    event_key text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    href text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz,
    UNIQUE(owner_id, event_key)
);

CREATE INDEX IF NOT EXISTS notifications_owner_created ON notifications(owner_id, created_at DESC);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id text PRIMARY KEY,
    owner_id text NOT NULL,
    endpoint text NOT NULL UNIQUE,
    keys jsonb NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Push deliveries table
CREATE TABLE IF NOT EXISTS push_deliveries (
    id text PRIMARY KEY,
    notification_id text NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    subscription_id text NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
    state text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    last_status integer,
    UNIQUE(notification_id, subscription_id)
);

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = owner_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid()::text = owner_id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access notifications" ON notifications
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can read own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid()::text = owner_id);

CREATE POLICY "Service role full access push_subscriptions" ON push_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for push_deliveries
CREATE POLICY "Users can read own push deliveries" ON push_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM push_subscriptions ps
            WHERE ps.id = push_deliveries.subscription_id
            AND ps.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Service role full access push_deliveries" ON push_deliveries
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT ON push_deliveries TO authenticated;

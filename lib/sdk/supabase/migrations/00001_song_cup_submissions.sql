-- Migration: create song_cup_submissions table
-- Stores every video uploaded through the Song Cup Grove/IPFS flow.

CREATE TABLE IF NOT EXISTS public.song_cup_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    grove_url TEXT NOT NULL,
    grove_hash TEXT,
    title TEXT,
    description TEXT,
    post_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_song_cup_submissions_wallet_address
    ON public.song_cup_submissions (wallet_address);

CREATE INDEX IF NOT EXISTS idx_song_cup_submissions_status
    ON public.song_cup_submissions (status);

CREATE INDEX IF NOT EXISTS idx_song_cup_submissions_created_at
    ON public.song_cup_submissions (created_at DESC);

-- Optional: enable RLS and allow anon insert from the app (the row is public for admin review).
ALTER TABLE public.song_cup_submissions ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated or anonymous client to insert a submission.
CREATE POLICY IF NOT EXISTS allow_insert_song_cup_submissions
    ON public.song_cup_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow anyone to read submissions; the admin page gates by wallet address client-side.
CREATE POLICY IF NOT EXISTS allow_select_song_cup_submissions
    ON public.song_cup_submissions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only the admin page/update service should update status; open to authenticated for app service role.
CREATE POLICY IF NOT EXISTS allow_update_song_cup_submissions
    ON public.song_cup_submissions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

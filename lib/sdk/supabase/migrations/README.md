# Song Cup Submissions Migration

This migration creates the `public.song_cup_submissions` table and secure Row-Level Security (RLS) policies for the Song Cup moderation workflow.

## How to apply

Copy the contents of `00001_song_cup_submissions.sql` into the **Supabase Dashboard → SQL Editor** and run it. The migration is idempotent — you can re-run it safely.

## Security model

- **Public SELECT**: only rows with `status = 'approved'` are visible to anonymous or authenticated users.
- **Owner SELECT**: authenticated users can also see their own rows (pending, approved, or rejected).
- **Admin SELECT/UPDATE**: members of `private.song_cup_admins` can see and update everything.
- **INSERT**: any authenticated user can insert a submission. This is intentional — rows are treated as untrusted until an admin reviews them.

> To prevent `wallet_address` spoofing at insert time, the app must set `app_metadata.wallet_address` server-side using the Supabase service role. Once that is wired up, the INSERT policy can be tightened to `WITH CHECK (LOWER(wallet_address) = LOWER((auth.jwt() -> 'app_metadata' ->> 'wallet_address')))`.

## Admin wallet

The seed admin wallets in the migration are:

- `0xdE4b0371BBa20602685916ceeE5B22025a811734`
- `0xa7383918cbd43a73d2391a09fdd429b832b2e2f6` (creative.eth)

Apply `00002_song_cup_vote_matchups.sql` for vote matchups, votes, and the second admin wallet.

```sql
INSERT INTO private.song_cup_admins (wallet_address)
VALUES ('0xYourAdminWalletHere')
ON CONFLICT (wallet_address) DO NOTHING;
```

For the admin check to work, that same wallet must be present in the signed-in user's `app_metadata.wallet_address`.

## Optional: Edge Function to set wallet claim

See `supabase/functions/set-wallet-claim/index.ts` for a helper Edge Function that securely writes the connected wallet address into `app_metadata.wallet_address` using the Supabase service role. Call it from your frontend right after the wallet connects.

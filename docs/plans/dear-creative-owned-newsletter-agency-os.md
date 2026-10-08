# Dear Creative: owned newsletter (Creative Platform + agency-os)

**Status:** Active build (supersedes Beehiiv/Buttondown as **platform** destination)  
**Repos:** `crtv3` (TV + public API + creator UI), `agency-os` (agents, campaigns, optional orchestration)

## Decision (G2 / product)

- **Per-creator newsletters** on Creative Platform: compose, list, send, public archive on TV.
- **listmonk** ([`sirgawain0x/listmonk`](https://github.com/sirgawain0x/listmonk)) for **lists, send, unsubscribes** (upstream-style fork; deploy Docker/Railway per agency-os §5).
- **Mailgun** as **SMTP relay inside listmonk** (and optional transactional mail from crtv3 until listmonk is live).
- **agency-os** (`docs/LISTMONK_INTEGRATION.md`, status: proposed): sync subscribers, suppressions, billing gate — **not** duplicate send logic in Python.
- **crtv3** Supabase `newsletter_*` tables: creator UX + TV archive mirror until `NEWSLETTER_PROVIDER=listmonk` adapter lands.
- **Beehiiv / Buttondown:** not the long-term platform path. Paragraph remains production for `news.creativeplatform.xyz` until owned send + TV listing are proven (same dual-run rule as before).
- **MeTokens:** optional `metoken_address` on a publication for author economics; independent of send provider.

## Architecture

```
Creators (TV) ──► crtv3 (compose UI, /news archive, TV feeds, MeTokens)
                      │
                      ├── Supabase newsletter_* (mirror / owned reader)
                      └── listmonk API (lists + campaigns + send)

listmonk ──SMTP──► Mailgun
agency-os ──HTTP──► listmonk (invite, suppress pull, billing gate phase 2)

Dear Creative TV: NEWSLETTER_PROVIDER=paragraph | creative | listmonk (future)
```

## `NEWSLETTER_PROVIDER`

| Value | Use |
|-------|-----|
| `paragraph` (default) | Production Dear Creative until cutover |
| `creative` | Issues from Supabase + public URLs on TV |
| `listmonk` (planned) | Issues/lists from listmonk API; canonical on `news.*` when DNS ready |

## G2 blockers (unchanged themes)

- Paragraph CSV export when migrating Dear Creative list
- DNS for `news.creativeplatform.xyz` after owned send proven
- Mailgun domain + API keys in Vercel
- DEARCRTV / Paragraph coins vs MeToken-native trade UI
- agency-os ↔ crtv3 auth for agent-published drafts

## PR sequence

1. Planning + Beehiiv doc marked superseded for **platform** (PR #364 lineage)
2. **This foundation:** schema, `lib/newsletter`, Mailgun helper, subscribe API, docs
3. Creator compose UI (`/creator/newsletter` or profile tab)
4. Wire `DearCreativePublications` to `creative` on preview; Paragraph in prod
5. agency-os webhook/agent tool to push drafts
6. Cutover DNS (G2 only)

See `docs/newsletter-platform.md` for env vars and API routes.

# Creative Platform newsletters (owned)

Creator newsletters on TV + Creative Platform identity; **send and list management** align with **listmonk** + **agency-os** (see below). PR #365 adds a thin **crtv3** layer (Supabase metadata, TV feeds, subscribe API) while Paragraph remains default in prod.

## Reference repos

| Repo | Role |
|------|------|
| [sirgawain0x/listmonk](https://github.com/sirgawain0x/listmonk) | Self-hosted newsletter manager (Go + Postgres). Fork tracks upstream [listmonk](https://listmonk.app); deploy `listmonk/listmonk` image or your fork build. |
| [sirgawain0x/agency-os](https://github.com/sirgawain0x/agency-os) | CRM + agents. **Spec (not fully built):** `docs/LISTMONK_INTEGRATION.md` — listmonk as separate Railway service, HTTP API, suppression sync, per-customer accounts (UC7). |

## Mailgun vs listmonk

- **listmonk** owns subscribers, campaigns, unsubscribes, bounces, and the send UI/API.
- **Mailgun** (or SES/Postmark) is the **SMTP relay** configured *inside listmonk* — same pattern agency-os documents for `news.*` sending domains. You do not need two parallel send stacks unless crtv3 only sends transactional welcome mail before listmonk is live.
- agency-os **does not** mention Mailgun in `.env.example`; it specifies a **transactional relay** for listmonk (SES/Postmark). Mailgun is valid as that relay if G2 prefers it.

## Recommended target architecture

```
Creators / agents
    │
    ├─► crtv3 — compose UX, /news/* archive, TV listings, MeToken CTAs
    │         Supabase newsletter_* (publication + issue mirror) OR listmonk API reads
    │
    ├─► listmonk — lists, send, analytics (per creator or per org account)
    │         SMTP ──► Mailgun (mg.creativeplatform.xyz)
    │
    └─► agency-os — invite/suppress rules, billing gate (phase 2), agent drafts
```

**Dear Creative dual-run:** `NEWSLETTER_PROVIDER=paragraph` until listmonk send + TV `creative` listing are proven; do not move `news.creativeplatform.xyz` until G2 greens cutover.

## crtv3 today (PR #365 foundation)

```env
NEWSLETTER_PROVIDER=paragraph   # | creative
NEXT_PUBLIC_DEAR_CREATIVE_NEWSLETTER_SLUG=dear-creative
NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL=https://tv.creativeplatform.xyz

# Short-term welcome/transactional from crtv3 (optional)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_FROM=

# Future listmonk integration
LISTMONK_URL=
LISTMONK_API_USER=
LISTMONK_API_TOKEN=
```

| Route | Purpose |
|-------|---------|
| `POST /api/newsletter/subscribe` | Upsert in Supabase; welcome via Mailgun if configured |
| `GET /api/newsletter/publications/[slug]/issues` | Public JSON for TV (`creative` provider) |

**Next integration PR:** `NEWSLETTER_PROVIDER=listmonk` adapter — `GET /api/campaigns` / public archive RSS from listmonk; subscribe via `POST /api/subscribers` per agency-os contract.

## Schema (crtv3 Supabase)

`supabase/migrations/20261008120000_create_newsletter_tables.sql` — publications, issues, subscribers. Long-term, either:

1. **Mirror:** crtv3 stores display metadata; listmonk is source of truth for subs/send, or  
2. **listmonk-only subs:** drop duplicate `newsletter_subscribers` once listmonk API is wired.

## agency-os tasks (from their spec)

Build order there: L1 compose → L2 HTTP client → L4 suppressions → L5 list rules → L6 pull job. Creative Platform can reuse the same listmonk instance with lists like `creative: Dear Creative` and `acct <creator>: <name>` for per-creator UC7.

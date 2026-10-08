# Creative Platform newsletters (owned)

Creator-owned newsletters: data in Supabase, send via Mailgun, listings on TV via `NEWSLETTER_PROVIDER`.

## agency-os

- Repo: `sirgawain0x/agency-os` (Python). Channels today: Smartlead, SMTP, Lob mail — **not Mailgun in `.env.example`**.
- Newsletter **one-to-many** is specified in `docs/LISTMONK_INTEGRATION.md` (Listmonk). Creative Platform instead stores lists in **`newsletter_*`** tables and sends with **Mailgun from crtv3**.
- Future: agency-os agents POST drafts to crtv3 (internal API TBD).

## Environment (`crtv3`)

```env
# paragraph (default) | creative
NEWSLETTER_PROVIDER=paragraph
NEXT_PUBLIC_DEAR_CREATIVE_NEWSLETTER_SLUG=dear-creative
NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL=https://tv.creativeplatform.xyz

MAILGUN_API_KEY=
MAILGUN_DOMAIN=mg.creativeplatform.xyz
MAILGUN_FROM=Dear Creative <news@mg.creativeplatform.xyz>
```

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/newsletter/subscribe` | POST | `{ publicationSlug, email }` — upsert subscriber, optional Mailgun welcome |
| `/api/newsletter/publications/[slug]/issues` | GET | Public JSON feed (creative provider data) |

## Schema

See `supabase/migrations/20261008120000_create_newsletter_tables.sql`.

- `newsletter_publications` — per creator (`owner_address`, optional `metoken_address`)
- `newsletter_issues` — draft / published
- `newsletter_subscribers` — service-role only from API

## Dual-run

Keep `NEWSLETTER_PROVIDER=paragraph` in production until owned send and TV listing are validated; use `creative` on preview after seeding Dear Creative publication rows.

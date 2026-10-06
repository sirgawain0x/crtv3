# Dear Creative: Paragraph → Buttondown migration plan

**Status:** Planning only (G2 cutover gate, 2026-10-06)  
**Repo:** Creative TV (`crtv3`) — `tv.creativeplatform.xyz`  
**Newsletter today:** Paragraph custom domain `news.creativeplatform.xyz` (Dear Creative)

## Goals (locked by G2)

1. Move **email send + list** from Paragraph to **Buttondown** (Free → 100 subscribers, then low-cost paid). Use **Creative Platform AI agents** for drafting/heavy lift — not vendor AI as a reason to stay on Paragraph/Buttondown.
2. Build an **owned newsletter path** on Creative Platform now (product wiring later).
3. **TV episode listing** on `tv.creativeplatform.xyz` must stay in sync with newsletter issues; update at cutover (same content surfaced today via Paragraph).
4. **Export Paragraph subscriber CSV** as part of migration.
5. **Do not** change DNS, delete Paragraph, or merge redirect/cutover PRs until G2 explicitly approves.

**Out of scope for this doc / first implementation PRs:** Home hero subtext reword (separate queued backlog item).

---

## A) Current Paragraph integration in `crtv3`

### Summary

Creative TV does **not** host newsletter signup or send. It **lists issues** and **embeds Paragraph post URLs** in a modal iframe. Server actions use `@paragraph-com/sdk` + `PARAGRAPH_API_KEY`. A separate **DEARCRTV coin** flow uses Paragraph’s **coins API** (buy/sell/quote), not Buttondown.

There is **no RSS**, **no CMS field**, and **no Supabase table** for newsletter episodes in this repo.

### File inventory

| Path | Role |
|------|------|
| `lib/paragraph-client.ts` | Instantiates `ParagraphAPI` with `PARAGRAPH_API_KEY`; throws at import if key missing. |
| `app/actions/paragraph.ts` | Server actions: resolve publication by domain `news.creativeplatform.xyz`, fetch posts, subscriber count, coin data, buy/sell/quote via `public.api.paragraph.com`. Cached publication ID (1h). |
| `components/home-page/DearCreativePublications.tsx` | Home “LATEST ARTICLES”: `getPublicationPosts(3)`, optional subscriber count + coin when wallet connected; links + modal to `https://news.creativeplatform.xyz/{slug}`. |
| `components/home-page/NewsletterModal.tsx` | Full-height iframe to Paragraph post URL; includes `DearCreativeTradeButton`. |
| `components/home-page/DearCreativeTradeButton.tsx` | DEARCRTV (`0x81ce…3292`) buy/sell via Paragraph coin APIs + smart account `execute` on Uniswap Universal Router. |
| `components/home-page/ViewDearCreativeChartButton.tsx` | DexScreener link only; **not imported** anywhere (dead code today). |
| `components/home-page/NonLoggedInView.tsx` | Renders `DearCreativePublications` on home (`app/page.tsx` always uses this view). |
| `app/news/music/page.tsx` | Client-side `ParagraphAPI()` (no API key): all posts, filter title/body contains `"music"`; same Paragraph URLs + `NewsletterModal`. |
| `components/navbar/CreativePlatformAppsDrawer.tsx` | App grid link **News** → `https://news.creativeplatform.xyz`. |
| `package.json` | Dependency `@paragraph-com/sdk`. |
| `.env.example` | `PARAGRAPH_API_KEY` under “Scripts / Paragraph”. |
| `scripts/explore-paragraph-data.ts` | Dev script: public API exploration for domain/posts. |
| `scripts/explore-paragraph-more.ts` | Dev script: subscribers API probe. |
| `scripts/explore-paragraph-coins.ts` | Dev script: coins API. |
| `scripts/test-quote.ts`, `scripts/test-buy-args.ts` | Dev scripts for coin quote/buy endpoints. |

### URLs and env

- **Publication domain (hardcoded):** `news.creativeplatform.xyz` in `app/actions/paragraph.ts` and `app/news/music/page.tsx`.
- **Post reader URLs (hardcoded):** `https://news.creativeplatform.xyz/${slug}` in `DearCreativePublications.tsx`, `app/news/music/page.tsx`, and `NewsletterModal` `postUrl` prop.
- **Paragraph HTTP API:** `https://public.api.paragraph.com/api/v1/...` (posts/publication, coins, subscribers/count).
- **Secrets:** `PARAGRAPH_API_KEY` (server-only for posts count, coins, trading args).

### UX surfaces

| Surface | Behavior |
|---------|----------|
| Home (`/`) | Grid of 3 latest Paragraph posts; “Read all issues” → external news domain. |
| `/news/music` | Filtered Paragraph posts + trade button. |
| Apps drawer | External link to news subdomain. |
| Newsletter signup | **None in-repo** — assumed on Paragraph hosted site. |

### Post shape used by UI (Paragraph)

Fields referenced in components: `id`, `slug`, `title`, `subtitle`, `imageUrl` / `cover_image`, `publishedAt` (numeric epoch ms), `markdown` (music filter only).

---

## B) What must change for Buttondown / owned reader

Separate **two concerns**:

### 1) Email stack (send + list) — mostly off-TV

- Buttondown holds subscribers, sends issues, provides **RSS** and **REST API** for issues.
- Import Paragraph CSV into Buttondown before first send on new stack.
- Creative Platform agents produce drafts; humans publish in Buttondown (or via API automation in a later PR).

### 2) TV listing + read experience — in `crtv3`

| Current | Target (near-term) |
|---------|-------------------|
| `getPublicationPosts` → Paragraph SDK | `getNewsletterIssues()` → Buttondown API or RSS (server-side, cached) |
| Links to `news.creativeplatform.xyz/{slug}` | Owned reader URLs (see below) until DNS cutover |
| `NewsletterModal` iframe → Paragraph | iframe or owned `/news/[slug]` page rendering HTML from feed/API |
| `getSubscriberCount` → Paragraph API | Buttondown API subscriber count **or** drop metric until API wired |
| `app/news/music/page.tsx` direct SDK | Same shared data layer as home; tag/filter strategy TBD (Buttondown tags vs title filter) |

### Paragraph coin / DEARCRTV (decision needed)

`DearCreativeTradeButton` and coin helpers in `app/actions/paragraph.ts` depend on **Paragraph coins API**, not on where posts are hosted.

Options for G2:

- **A)** Keep Paragraph API **read-only** for coin endpoints until token metadata/trading moves elsewhere.
- **B)** Remove trade UI from newsletter modal and link only to DexScreener (`ViewDearCreativeChartButton` pattern).
- **C)** Replace quote/buy args with direct on-chain/DEX integration (larger scope).

Migration PRs should **not** assume coin removal unless G2 chooses B/C.

### Navigation

- `CreativePlatformAppsDrawer` **News** href should eventually point to owned canonical URL (e.g. `https://news.creativeplatform.xyz` after DNS **or** `https://tv.creativeplatform.xyz/news` interim).

---

## C) Thin owned stack sketch (in-repo)

```
┌─────────────────────────────────────────────────────────────┐
│  Buttondown (send + list + issue archive + RSS/API)         │
└───────────────┬─────────────────────────────┬───────────────┘
                │ CSV import (once)              │ issues feed
                ▼                                ▼
         Subscribers                      crtv3 server layer
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
         DearCreativePublications      /news/music (filter)      optional /news/[slug]
         NewsletterModal embed         shared lib                owned reader (SSR)
                    │
                    ▼
         Signup: Buttondown embed / API route POST /api/newsletter/subscribe
                 (tv + future creativeplatform.xyz product surfaces)
```

**Near-term preference:** Buttondown for send + list.

**Episode feed for TV:**

1. **RSS** (`fetch` + parse on server, `unstable_cache`, 5–15 min revalidate) — no extra vendor cost, good for listing.
2. **Buttondown API** — subscriber count, draft preview, tags; requires `BUTTONDOWN_API_KEY`.

**Later (optional):** Resend/Mailgun + owned DB mirroring issues for product features (paywalls, cross-app memory). Not required for parity with today’s TV listing.

**Suggested module layout (implementation PR 2):**

- `lib/newsletter/types.ts` — `NewsletterIssue { id, slug, title, subtitle, publishedAt, imageUrl, canonicalUrl, bodyHtml? }`
- `lib/newsletter/providers/buttondown.ts` — RSS and/or API adapter
- `lib/newsletter/providers/paragraph.ts` — wrap existing actions during dual-run
- `lib/newsletter/index.ts` — `getIssues()` driven by `NEWSLETTER_PROVIDER=paragraph|buttondown`
- `app/actions/newsletter.ts` — replace direct `paragraph` imports from UI

**Env (future):**

- `BUTTONDOWN_API_KEY` (server)
- `BUTTONDOWN_USERNAME` or newsletter id / RSS URL
- `NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL` — canonical issue base for links
- `NEWSLETTER_PROVIDER` — feature flag for dual-run

---

## D) Migration checklist (execution — G2 gated)

### Pre-cutover

- [ ] G2: Paragraph admin access → **export subscriber CSV**
- [ ] G2: Create Buttondown newsletter; verify Free → paid tier path
- [ ] G2: Import CSV; confirm consent / compliance copy
- [ ] Map historical slugs: Paragraph `slug` → Buttondown issue URLs (redirect table if slugs differ)
- [ ] Implement `crtv3` provider + owned reader or embed targets on **staging**
- [ ] Dual-run (optional): `NEWSLETTER_PROVIDER=buttondown` on preview while production stays `paragraph`
- [ ] Validate `/` listing and `/news/music` against Buttondown feed
- [ ] Decide DEARCRTV / coin UI per section B

### Cutover (G2 explicit approval only)

- [ ] DNS: `news.creativeplatform.xyz` → Buttondown custom domain **or** CNAME to owned Vercel route (G2 decision)
- [ ] Redirect strategy: Paragraph URLs → new canonical (301 map for top issues if slugs change)
- [ ] Update `NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL` + Apps drawer link
- [ ] Flip `NEWSLETTER_PROVIDER=buttondown` in production
- [ ] Send “we moved” issue from Buttondown
- [ ] Smoke: home grid, music page, modal, apps drawer, OG/share links if any

### Post-cutover

- [ ] Monitor bounces/unsubs in Buttondown
- [ ] Keep Paragraph read-only for coin API if option A
- [ ] Document rollback: revert env to `paragraph`, restore DNS to Paragraph

### Rollback

1. Revert DNS to Paragraph.
2. Set `NEWSLETTER_PROVIDER=paragraph`.
3. Redeploy previous TV build if needed.

---

## E) Recommended PR sequence

| # | PR | Changes | Merge gate |
|---|-----|---------|------------|
| **1** | Planning doc | `docs/plans/dear-creative-buttondown-migration.md` only | Anytime |
| **2** | Newsletter abstraction | Types, provider interface, Paragraph adapter extracted from UI; env flag default `paragraph` | Safe — no user-visible switch |
| **3** | Buttondown provider + signup | Server fetch RSS/API; `BUTTONDOWN_*` env; optional `/api/newsletter/subscribe`; Buttondown embed component | Preview + G2 review |
| **4** | Owned reader routes | `/news/[slug]` or improve modal to use owned URL; link builder uses `NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL` | Preview |
| **5** | **Cutover** | DNS docs/runbook only in repo; production env flip; redirect middleware for old Paragraph slugs; Apps drawer URL | **G2 only** |
| **6** | Paragraph deprecation | Remove SDK from post paths; keep or remove coin stack per G2 | After stable cutover |

**Explicitly not in PR 1–4:** DNS changes, production redirects from `news.creativeplatform.xyz`, Paragraph account deletion.

---

## F) Blockers requiring G2

| Blocker | Why |
|---------|-----|
| DNS access for `news.creativeplatform.xyz` | Cutover hosting (Buttondown vs `tv`/`news` on Vercel) |
| Paragraph login + subscriber export | List migration |
| Buttondown account + API key / custom domain | Send stack + TV feed |
| **Canonical URL policy** | Keep `news.` subdomain vs `tv.creativeplatform.xyz/news` |
| DEARCRTV / Paragraph coins API | Trade button may keep Paragraph dependency after editorial migration |
| Stripe / paid newsletter copy | If signup CTAs or paywall copy changes on TV |
| Slug compatibility | Whether old Paragraph links must 301 permanently |
| Dual-run duration | Single flip vs parallel publishing |

---

## Appendix: Testing notes

- Home listing: logged-out and logged-in (subscriber count currently wallet-gated).
- `lib/paragraph-client.ts` throws without `PARAGRAPH_API_KEY` — any server import fails local dev without key; Buttondown path should avoid importing Paragraph client when provider is `buttondown`.
- Music filter is naive string match on `"music"` — confirm Buttondown tagging strategy before replicating behavior.

---

## References

- G2 context: 2026-10-06 (migrate to Buttondown, owned path, TV sync, CSV export, planning queued).
- External: [Buttondown](https://buttondown.email), [aa-sdk](https://github.com/alchemyplatform/aa-sdk) (unrelated to newsletter; TV wallet flows).

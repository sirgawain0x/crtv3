# Dear Creative: Paragraph → Beehiiv migration plan

**Status:** Planning only (G2 cutover gate)  
**Retarget locked:** 2026-10-06, 2:17 PM ET — **Beehiiv** is the destination (not Buttondown)  
**Repo:** Creative TV (`crtv3`) — `tv.creativeplatform.xyz`  
**Newsletter today:** Paragraph custom domain `news.creativeplatform.xyz` (Dear Creative)

> **Doc rename:** Replaces `dear-creative-buttondown-migration.md` (Buttondown was superseded by G2 retarget).

## Goals (locked by G2)

1. Move **email send + list** from Paragraph to **Beehiiv**. Use **Creative Platform AI agents** for drafting/heavy lift — not vendor AI as the reason to stay on Paragraph/Beehiiv.
2. **Monetization:** Beehiiv Ad Network (residual ad revenue already visible); Paragraph yielded $0. Free tier to **2,500** subscribers; **Ad Network requires Lite+** plan.
3. Build an **owned newsletter path** on Creative Platform now (product wiring later).
4. **TV episode listing** on `tv.creativeplatform.xyz` must stay in sync with newsletter issues; update when cutover is approved (same content surfaced today via Paragraph).
5. **Export Paragraph subscriber CSV** when needed for list migration.
6. **Do not** change DNS, delete Paragraph, flip `news.creativeplatform.xyz`, or merge cutover PRs until G2 explicitly approves **and** dual-run criteria below are met.

**Out of scope for this doc / first implementation PRs:** Home hero subtext reword (separate queued backlog item).

### Destination explicitly NOT Buttondown

G2 may have started Buttondown signup (confirm-email possibly pending). **Buttondown is paused/cancelled as a path** — do not implement Buttondown providers, env vars, or cutover runbooks. Use **Beehiiv only**.

---

## Dual-run rule (G2)

**Do not point `news.creativeplatform.xyz` at Beehiiv until:**

- At least one (or agreed test) **Beehiiv send** completes cleanly, and  
- **Beehiiv ads** behave as expected on published posts (Lite+ Ad Network).

Until then:

- **Production** keeps Paragraph for the public news domain and `NEWSLETTER_PROVIDER=paragraph` (default).
- **Preview/staging** may use `NEWSLETTER_PROVIDER=beehiiv` against Beehiiv publication URL/API to validate TV listings and embeds.
- TV may show Beehiiv-sourced issues in non-prod without moving DNS.

---

## A) Current Paragraph integration in `crtv3`

### Summary

Creative TV does **not** host newsletter signup or send. It **lists issues** and **embeds Paragraph post URLs** in a modal iframe. Server actions use `@paragraph-com/sdk` + `PARAGRAPH_API_KEY`. A separate **DEARCRTV coin** flow uses Paragraph’s **coins API** (buy/sell/quote), independent of email host.

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
| Newsletter signup | **None in-repo** — assumed on Paragraph hosted site today. |

### Post shape used by UI (Paragraph)

Fields referenced in components: `id`, `slug`, `title`, `subtitle`, `imageUrl` / `cover_image`, `publishedAt` (numeric epoch ms), `markdown` (music filter only).

---

## B) What must change for Beehiiv / owned reader

Separate **two concerns**:

### 1) Email stack (send + list + ads) — mostly off-TV

- Beehiiv holds subscribers, sends issues, runs **Ad Network** (Lite+).
- Import Paragraph CSV into Beehiiv when G2 confirms list migration approach.
- Creative Platform agents produce drafts; humans publish in Beehiiv (API automation optional later).

### 2) TV listing + read experience — in `crtv3`

| Current | Target (near-term) |
|---------|-------------------|
| `getPublicationPosts` → Paragraph SDK | `getNewsletterIssues()` → Beehiiv API and/or publication RSS (server-side, cached) |
| Links to `news.creativeplatform.xyz/{slug}` | Beehiiv post URLs on staging; **unchanged in prod** until DNS dual-run exit |
| `NewsletterModal` iframe → Paragraph | iframe to Beehiiv web post or owned `/news/[slug]` |
| `getSubscriberCount` → Paragraph API | Beehiiv API **or** omit until wired |
| `app/news/music/page.tsx` direct SDK | Shared `lib/newsletter` layer; filter via Beehiiv tags/sections vs title `"music"` |

### Paragraph coin / DEARCRTV (G2 decision)

`DearCreativeTradeButton` and coin helpers depend on **Paragraph coins API**, not email host.

- **A)** Keep Paragraph API **read-only** for coin endpoints after editorial migration.  
- **B)** Remove trade UI; DexScreener only.  
- **C)** Direct on-chain/DEX integration (larger scope).

Implementation PRs should **not** remove coin UI unless G2 chooses B/C.

### Navigation

- Apps drawer **News** href stays `news.creativeplatform.xyz` until G2 DNS green; then Beehiiv custom domain or owned route.

---

## C) Thin owned stack sketch (in-repo)

```
┌─────────────────────────────────────────────────────────────┐
│  Beehiiv (send + list + Ad Network Lite+ + web archive)   │
└───────────────┬─────────────────────────────┬───────────────┘
                │ CSV import (when approved)       │ posts API/RSS
                ▼                                ▼
         Subscribers                      crtv3 server layer
         (dual-run: Paragraph              NEWSLETTER_PROVIDER
          still owns news. DNS)            paragraph | beehiiv
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
         DearCreativePublications      /news/music (filter)      optional /news/[slug]
         NewsletterModal embed         shared lib                owned reader (SSR)
                    │
                    ▼
         Signup: Beehiiv embed / API route POST /api/newsletter/subscribe
                 (tv + future creativeplatform.xyz surfaces)
```

**Episode feed for TV:**

1. **Beehiiv API** (preferred for slug, image, metadata) — `BEEHIIV_API_KEY`, publication id.  
2. **RSS / public feed** if sufficient for listing-only (cache with `unstable_cache`).

**Later (optional):** Resend/Mailgun + owned DB — not required for TV parity.

**Suggested module layout (implementation PR 2):**

- `lib/newsletter/types.ts` — `NewsletterIssue { id, slug, title, subtitle, publishedAt, imageUrl, canonicalUrl, bodyHtml? }`
- `lib/newsletter/providers/beehiiv.ts` — API/RSS adapter
- `lib/newsletter/providers/paragraph.ts` — wrap existing actions during dual-run
- `lib/newsletter/index.ts` — `getIssues()` driven by `NEWSLETTER_PROVIDER=paragraph|beehiiv`
- `app/actions/newsletter.ts` — replace direct `paragraph` imports from UI

**Env (future):**

- `BEEHIIV_API_KEY` (server)
- `BEEHIIV_PUBLICATION_ID` (or slug)
- `NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL` — canonical issue base (staging: Beehiiv URL; prod: unchanged until cutover)
- `NEWSLETTER_PROVIDER` — `paragraph` in production until G2 cutover

---

## D) Migration checklist (execution — G2 gated)

### Pre-cutover (dual-run)

- [ ] G2: Beehiiv login, plan (**Lite+** for Ad Network), publication setup
- [ ] G2: Paragraph admin → **subscriber CSV export** if importing list
- [ ] Import CSV to Beehiiv; consent/compliance review
- [ ] **Prove send + ads** on Beehiiv (test issue; verify ad placement/revenue reporting)
- [ ] Map slugs: Paragraph → Beehiiv post URLs
- [ ] Implement `crtv3` Beehiiv provider on **preview**; keep prod on Paragraph
- [ ] Validate `/` and `/news/music` against Beehiiv feed on staging
- [ ] DEARCRTV / coin UI decision (section B)

### Cutover (G2 explicit approval only — after dual-run exit)

- [ ] DNS: `news.creativeplatform.xyz` → Beehiiv custom domain or approved hosting (G2 green)
- [ ] Redirect Paragraph URLs → canonical Beehiiv posts (301 map if needed)
- [ ] Production `NEWSLETTER_PROVIDER=beehiiv`
- [ ] Update `NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL` + Apps drawer if canonical changes
- [ ] “We moved” send from Beehiiv
- [ ] Smoke: home grid, music page, modal, ads on web posts, apps drawer

### Post-cutover

- [ ] Monitor deliverability, unsubscribes, ad metrics in Beehiiv
- [ ] Paragraph: read-only for coins if option A; decommission editorial when safe
- [ ] Rollback: DNS back to Paragraph, `NEWSLETTER_PROVIDER=paragraph`, redeploy prior build

---

## E) Recommended PR sequence

| # | PR | Changes | Merge gate |
|---|-----|---------|------------|
| **1** | Planning doc | `docs/plans/dear-creative-beehiiv-migration.md` (this file) | Anytime |
| **2** | Newsletter abstraction | Types, provider interface, Paragraph adapter; `NEWSLETTER_PROVIDER` default `paragraph` | Safe |
| **3** | Beehiiv provider + signup | Beehiiv API/RSS; `BEEHIIV_*` env; embed or `/api/newsletter/subscribe` | Preview + G2 review |
| **4** | Owned reader routes | `/news/[slug]` or modal targets; canonical URL helper | Preview only |
| **5** | **Cutover** | Runbook; prod env flip; redirects — **not** until send+ads proven | **G2 only** |
| **6** | Paragraph deprecation | Remove SDK from post paths; coins per G2 | After stable cutover |

**Not in PR 1–4:** DNS, production flip of `news.creativeplatform.xyz`, Paragraph deletion, Buttondown work.

---

## F) Blockers requiring G2

| Blocker | Why |
|---------|-----|
| **Beehiiv login + plan (Lite+)** | Ad Network + production send |
| **Paragraph CSV export** | Subscriber migration if required |
| **DNS cutover green** | When `news.creativeplatform.xyz` leaves Paragraph |
| **Dual-run exit criteria** | Clean Beehiiv send + ads before DNS |
| **DEARCRTV / Paragraph coins API** | Trade button may retain Paragraph dependency |
| **Canonical URL policy** | `news.` subdomain on Beehiiv vs interim TV routes |
| Stripe / paid copy | If signup CTAs change on TV |
| Slug / 301 strategy | Legacy Paragraph links |

---

## Appendix: Testing notes

- Home listing: logged-out and logged-in (subscriber count wallet-gated today).
- When `NEWSLETTER_PROVIDER=beehiiv`, avoid importing `lib/paragraph-client.ts` on code paths that do not need coins.
- Music filter: naive `"music"` string — align with Beehiiv tags/sections.

---

## References

- G2 retarget: 2026-10-06 2:17 PM ET — Beehiiv (monetization, 2.5k free tier, Ad Network Lite+).
- Prior plan filename: `dear-creative-buttondown-migration.md` (obsolete).
- [Beehiiv](https://www.beehiiv.com/) — send, ads, API docs for implementation PRs.

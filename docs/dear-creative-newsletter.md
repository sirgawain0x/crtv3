# Dear Creative newsletter signup strip

Marketing CTA that links out to the Dear Creative newsletter (`news.creativeplatform.xyz`). No in-app signup API — the strip is a styled external link.

## Surfaces

| Page | Variant | Component mount |
|------|---------|-----------------|
| Home (logged-out hero) | `full-width` | `components/home-page/NonLoggedInView.tsx` |
| Discover video detail | `compact` | `app/discover/[id]/page.tsx` |

Component: `components/dear-creative/NewsletterSignupStrip.tsx`.

## Copy and URL (single source of truth)

All strings live in `lib/dear-creative/newsletter-signup-copy.ts`:

- `DEAR_CREATIVE_NEWSLETTER_SIGNUP_URL` — includes `?src=ctv` for attribution
- Headline, body, and button label constants (used by the strip and tests)

Change copy in that file only; do not duplicate strings in page components.

## Variants

- **`full-width`** — border-y band, max-width container, default button size.
- **`compact`** — bordered card row for sidebars / narrow columns, smaller typography and `sm` button.

Both variants expose `data-testid="newsletter-signup-strip-{variant}"` for tests (`NewsletterSignupStrip.test.tsx`).

## Related Dear Creative UI

Publication feeds and chart actions use `app/actions/dear-creative.ts` and `lib/dear-creative/*`; they are separate from the newsletter strip and are not documented here.

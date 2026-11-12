# Story Protocol API routes

HTTP surface under `app/api/story/` for NFT minting, IP registration, livestream clips, and RPC helpers. SDK logic lives in `lib/sdk/story/`.

## Security model (server-side signing)

As of the **server signing hard-disable** (`POST /api/story/mint`, `POST /api/story/transfer`, `GET /api/story/funding-wallet`):

| Route | Behavior |
|-------|----------|
| `POST /api/story/mint` | **503** `{ "error": "Story is disabled" }` — no private key or SDK load |
| `POST /api/story/transfer` | **503** — same |
| `GET /api/story/funding-wallet` | **404** — address probe removed |

These routes exist so old clients fail fast instead of hitting signing code paths. Vitest guards assert env vars like `STORY_PROTOCOL_PRIVATE_KEY` are **not** consulted on these handlers.

**Preferred mint path:** `POST /api/story/prepare-mint` returns unsigned tx fields; the creator wallet signs and submits (often via `POST /api/story/rpc-proxy`). Optional `NEXT_PUBLIC_STORY_POLICY_ID` sponsors gas via Alchemy when txs are sent as UserOperations.

`STORY_PROTOCOL_PRIVATE_KEY` may still be required for routes that prepare Story SDK calls server-side (collection setup in `prepare-mint`, livestream registration, derivative mint, license mint). It is **not** used to sign and broadcast on the disabled mint/transfer endpoints.

## Route inventory

| Method | Path | Auth / guards | Role |
|--------|------|---------------|------|
| GET | `/api/story/mint-configured` | — | `{ configured }` — true when `STORY_PROTOCOL_PRIVATE_KEY` is set (UI gate only; does not imply `/mint` works) |
| POST | `/api/story/mint` | — | **Disabled** — see above |
| POST | `/api/story/prepare-mint` | Wallet auth, BotID, strict rate limit | Build unsigned mint/register tx for client signing; `recipient` must equal `creatorAddress` |
| POST | `/api/story/rpc-proxy` | — | Server-side Story RPC proxy (hides Alchemy key) |
| GET | `/api/story/funding-wallet` | — | **Removed** (404) |
| POST | `/api/story/transfer` | — | **Disabled** (503) |
| GET | `/api/story/license-terms` | Standard rate limit | Read PIL terms via SDK (`videoAssetId` or `ipId` + `licenseTermsId`); needs `STORY_PROTOCOL_PRIVATE_KEY` for SDK client |
| GET | `/api/story/ip-status` | — | Story APIs infringement status; needs `STORY_API_KEY` |
| POST | `/api/story/mint-license` | Wallet auth | License token mint; signs with funding wallet |
| POST | `/api/story/register-stream` | Wallet auth | Broadcaster livestream → IP + PIL (live clips) |
| POST | `/api/story/mint-derivative` | Wallet auth | Viewer clip → derivative IP |
| POST | `/api/story/factory/deploy-collection` | Wallet auth, BotID | Factory `onlyOwner` deploy (`FACTORY_OWNER_PRIVATE_KEY`) |

Live clip UI: `components/Live/ClipCreator.tsx` → `mint-derivative`. Upload NFT step: `components/Videos/Upload/NFTMintingStep.tsx` still calls **`/api/story/mint`** (will 503 until wired to `prepare-mint` + client sign).

## Environment variables

| Variable | Scope | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_STORY_NETWORK` | Client | `testnet` (1315) or `mainnet` (1514) |
| `NEXT_PUBLIC_STORY_RPC_URL` | Client | Story RPC |
| `NEXT_PUBLIC_STORY_ALCHEMY_API_KEY` | Client | Optional public Alchemy key |
| `STORY_ALCHEMY_API_KEY` | Server | RPC proxy upstream |
| `NEXT_PUBLIC_STORY_POLICY_ID` | Client | Alchemy gas sponsorship for creator-signed flow |
| `STORY_PROTOCOL_PRIVATE_KEY` | Server | SDK prep / license mint / stream routes — **not** for disabled mint/transfer |
| `FACTORY_OWNER_PRIVATE_KEY` | Server | Factory collection deploy |
| `NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS` | Client | Optional factory address |
| `STORY_API_KEY` | Server | `ip-status` Story REST API |

See [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md#story-protocol-configuration-optional) and [STORY_PROTOCOL_INTEGRATION.md](../STORY_PROTOCOL_INTEGRATION.md) for product-level integration notes.

## Operational pitfalls

1. **`mint-configured` vs upload mint** — Upload shows the NFT step when the key is set, but **`POST /api/story/mint` always 503**. Operators may see "configured" env yet failed mints; fix is client migration to `prepare-mint`, not rotating the funding key alone.
2. **Funding wallet UI** — `NFTMintingStep` may still call `/api/story/funding-wallet` for balance checks when `NEXT_PUBLIC_STORY_POLICY_ID` is unset; that endpoint is 404. Prefer policy-based sponsorship or client balance on Story chain.
3. **Rate limits** — Mint-related POSTs use `rateLimiters.strict` (see production readiness docs).
4. **BotID** — `prepare-mint`, `mint`, `mint-derivative`, factory deploy, and related POSTs are in deep-analysis BotID routes (`instrumentation-client.ts`).

## Related code

- SDK: `lib/sdk/story/` (`client.ts`, `spg-service.ts`, `capture-transport.ts`)
- Hooks: `lib/hooks/story/useNftMintingConfigured.ts`
- Legacy guide: `STORY_PROTOCOL_INTEGRATION.md` (upload flow narrative; cross-check route table here)

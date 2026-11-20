# MeToken market trade indexing

**TL;DR:** Market stats use whole-token trade amounts and hub-aware collateral decimals. The new finalized-block indexer is disabled until `METOKEN_TRADE_INDEXER_ENABLED=true` is explicitly configured. This change does not backfill or enable production writes by itself.

## What changes

- The daily market sync converts collateral with the hub's decimals (USDC has six); MeToken supply remains eighteen-decimal wei.
- The market API ignores transfers and creation records when summing trade volume. Recorded zero collateral stays zero.
- Price history snapshots the period's opening state before replaying trades. ALL starts at actual history; the latest point uses the existing live-market resolver. Staging's existing token search and supply conversions are preserved.
- Mint/Burn indexing reads the configured Diamond on Base through a **server-side** HTTPS RPC, up to 50,000 blocks per invocation, ending at a finalized block. Historical event collateral addresses determine decimals, including after a hub change.
- New event rows use a deterministic UUID derived from chain, Diamond, transaction hash and log index. The existing primary key and conflict-ignore upsert deduplicate concurrent workers while retaining multiple events in one transaction. Decimal strings preserve the on-chain amount's precision in numeric DB columns.
- Existing random-ID UI records are matched by token, transaction, side, wallet and amounts. Conflicting or ambiguous records stop the window for reconciliation; matching legacy records are retained, including their existing timestamp. This is not an automatic repair of old records.
- All ranges and new event timestamps must be readable before any inserts. Range-limit errors split; throttling backs off without multiplying ranges. Errors do not expose RPC URLs.

## Preview

Configure `METOKEN_INDEXER_RPC_URL` with a suitable private HTTPS endpoint. Alternatively the indexer accepts the existing server-only `BASE_RPC_URL`, `ALCHEMY_RPC_URL`, or `ALCHEMY_API_KEY`. It does not reuse a browser key restricted by origin and does not silently switch to a public RPC.

```sh
npx tsx scripts/backfill-metoken-trades.ts --from 100000 --to 101000
```

This is read-only by default. It reads chain logs and database identities, and reports candidate rows. `--apply` additionally requires the explicit enable flag. No credentials belong in command arguments or committed output. The script's result is private operational data.

## Activation and rollback

1. Review and approve the deployment, RPC usage and data-write rollout separately. Verify the five-minute cron is supported by the existing hosting plan; do not upgrade billing implicitly.
2. Back up the shared database and reconcile legacy duplicates and failed preview windows. Stop any older backfill writer and drain older deployments before enabling this writer. A process running older code is not controlled by the new flag.
3. Preview a bounded finalized window. Keep a private record of covered block intervals; a successful recent window does not prove complete 7D/30D history. There is no persistent scan cursor in this version. Cover older gaps with explicit consecutive windows and advance the operator's checkpoint only after success.
4. Set `METOKEN_TRADE_INDEXER_ENABLED=true` only in the approved environment. The authenticated transaction API then returns 202 after receipt verification for trade reports, deferring ledger writes to chain indexing instead of creating competing UI rows. Other transaction types retain their existing behavior.
5. The cron requires a non-empty `CRON_SECRET` and an exact bearer match. It rejects invalid or oversized windows. The manual script requires `--apply` for writes. Neither path sends blockchain transactions.
6. Disable the flag to stop new index writes and restore the legacy UI-ledger path. Rows already written remain; roll back data only with a separately reviewed, event-specific plan.

The rolling default window overlaps recent runs; outages longer than that window need explicit backfill. Unknown MeTokens are reported and skipped. Post-trade market refresh failures are reported for retry, while committed event rows remain deduplicated.

## Limits of the charts

Historical prices are vault TVL divided by supply, reconstructed from the recorded Mint/Burn ledger. Missing historical trades, collateral changes outside those events, or legacy timestamp errors limit the reconstruction. These changes do not claim complete historical coverage or provide execution-price candles. Live trade tickers, new chart ranges and sparklines are separate UI work.

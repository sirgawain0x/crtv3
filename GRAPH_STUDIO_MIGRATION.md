# Graph Studio Migration Runbook

This runbook migrates from Goldsky (`metokens` + `reality-eth`) to one merged Graph Studio subgraph: `creative-platform`.

## 1) Prepare and Deploy

1. Export deploy key:
   - `export GRAPH_STUDIO_DEPLOY_KEY=...`
2. Deploy merged subgraph:
   - `VERSION_LABEL=v0.0.1 ./scripts/graph-studio/deploy-creative-platform.sh`
3. In Graph Studio, copy the query endpoint and set:
   - `GRAPH_STUDIO_CREATIVE_PLATFORM_URL=...`

## 2) Parity Validation

Set:
- `GOLDSKY_METOKENS_URL=https://api.goldsky.com/api/public/<project>/subgraphs/metokens/1.0.2/gn`
- `GOLDSKY_REALITY_ETH_URL=https://api.goldsky.com/api/public/<project>/subgraphs/reality-eth/1.0.0/gn`
- `GRAPH_STUDIO_CREATIVE_PLATFORM_URL=<studio-query-url>`

Run:
- `tsx scripts/graph-studio/parity-check.ts`

## 3) Cutover

1. Safe mode (recommended first):
   - `SUBGRAPH_PROVIDER_MODE=dual`
2. Full cutover:
   - `SUBGRAPH_PROVIDER_MODE=studio`
3. Rollback:
   - `SUBGRAPH_PROVIDER_MODE=goldsky`

## 4) Post-Cutover Cleanup

- Remove old Goldsky-only assumptions in docs/runbooks.
- Keep Goldsky endpoints available temporarily as emergency rollback.

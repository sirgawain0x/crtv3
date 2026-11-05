# Creator Stock Picks — MeToken stock-backing spike (INCOMPLETE)

**Status:** Explicitly incomplete. Fork integration and hub registration are **future work**, not done in PR1.

## o1 token sourcing (official)

| Network | Evidence | Result |
|---------|----------|--------|
| Base mainnet (8453) | [base-stock-quotes.json](https://docs.o1.exchange/launchpad/reference/base-stock-quotes.json), [stock-paired launches catalog](https://docs.o1.exchange/launchpad/create/stock-paired-launches#base-stock-token-catalog) | 8-decimal stock quotes; chainId **8453** in JSON |
| Base Sepolia (84532) | `base-sepolia-stock-quotes.json` → **404**; [alpha-tokens](https://docs.o1.exchange/api/alpha-tokens) `networkId=84532` → **`[]`** | **No verified Sepolia catalog** — Creative TV fails closed |

## MeToken / diamond (provisional)

- Base diamond address in repo: `0xba5502db2aC2cBff189965e991C07109B14eB3f5` (`deployments/metokens/base.json`).
- Whether bytecode matches upstream meTokens-core: **not proven** in PR1.
- `registerController()` holder on Base: **provisional** (prior read `0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260` — re-verify before any admin action).
- Stock-backed hub: would require **new** `HubFacet.register` + approved vault; **never** mutate hub 2 (USDC / CRTVAI).

## Future work (out of PR1)

- Anvil/Hardhat fork tests for subscribe/mint with 8-decimal mock collateral.
- Sepolia MeTokens diamond + `registerController` discovery.
- Counsel + G2 before mainnet hubs or production enablement.

# MeToken stock collateral: fork feasibility

This is a local-only experiment, not a stock integration or deployment. It forks Base mainnet at block **55666312**, impersonates the current register controller inside the fork, and registers a new hub using an eight-decimal mock ERC-20 and the existing approved USDC hub vault. It does not mutate the upstream chain or need a private key. The mock does not implement B20 corporate actions, real issuer policies, or an oracle.

Run with Foundry and an archive-capable Base RPC endpoint:

```sh
BASE_RPC_URL=https://mainnet.base.org forge test --root tests/metoken-stock-fork -vv
```

An RPC provider can rate-limit or lack historical state; use another Base archive RPC if needed. RPC credentials should be passed through the environment and never committed.

## Observations at the pinned block

- Registering a separate hub for the mock asset, subscribing, minting, and redeeming succeeded with `refundRatio=800000`, `baseY=224`, and `reserveWeight=500000`. These are **test parameters**, not a recommendation for a real hub or its economics.
- With the mock's transfers blocked, both a buy and a redemption reverted. The failed redemption left the holder's MeToken balance and vault collateral unchanged; the holder could retry after transfers resumed.
- Using the repository's existing stable-hub defaults (`refundRatio=800000`, `baseY=224`, `reserveWeight=32`), subscribing with 100 mock stock units reverted. The transfer was rolled back. The root cause and the valid parameter ranges need investigation; do not reuse these defaults for stock collateral based on this experiment.
- Hub 2 was not modified. The test **reuses its vault**, so it does not establish vault-level isolation between assets or endorse this architecture for production.

## Remaining work

Verify the exact deployed implementation and its curve behavior; test realistic amounts, rounding, fees, and non-owner redemptions across several collateral decimals. Test an issuer's actual B20 policies, multipliers, pauses, and transfer permissions, including account-specific restrictions. Determine whether the protocol enforces any price or eligibility checks on-chain; this test adds none. Separately validate oracle freshness, market hours, UX and jurisdictional eligibility, and obtain legal and security review before any mainnet registration or enablement.

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

## Curve and real-token investigation (2026-11-10)

- A fork test calls the deployed curve's zero-supply quote directly with raw amounts of `10^6`, `10^8`, and `10^18`. All three revert for a newly registered hub using the repository defaults (`baseY=224`, `reserveWeight=32`); all three return a positive quote with this experiment's `reserveWeight=500000`. This behavior is not specific to an eight-decimal token or a failed vault transfer.
- At the pinned block, the existing USDC hub 2 reports `baseY=1000000` and `reserveWeight=500000`, and its zero-supply quote for `10^6` succeeds. The repository's proposed defaults are therefore not evidence of the live hub's curve parameters.
- **Likely root cause, based on the checked-in source, not a verified bytecode-to-source match:** `_viewMeTokensMintedFromZero` calculates `exp(ln(10^18) / (32 / 1,000,000))`, whose argument is approximately 1,295,204. The checked-in ABDK quadruple-precision `pow_2` returns positive infinity for a sufficiently large exponent; later conversion of infinity to `uint256` reverts. This is consistent with the fork results, but verify the deployed facet bytecode and trace before treating the source-level explanation as proven. No alternative weight is approved for production.
- Coinbase's public [Tokenized Stocks API](https://docs.base.org/sdks/tokenized-stocks/overview) identified AAPLc (`0xb200000000000000000000C2e324d24d7eEcd1fb`) as an eight-decimal Base token. Direct read-only Base RPC calls at block 55666312 returned `decimals=8`, `symbol=AAPLc`, and `uiMultiplier=1e18`. Its documented Chainlink AAPL feed also returned `latestRoundData`. These reads do **not** establish eligibility, safe transfers, liquidity, or a production-ready price.
- The installed Anvil 1.5.1-stable fork returned `OpcodeNotFound` for the same AAPLc `decimals()` call, while the direct Base RPC call succeeded. Therefore this Anvil environment cannot establish B20 transfer or vault compatibility. Base's B20-enabled Foundry build can execute this precompile; see the opt-in real-token test below. Base documents these tokens as native B20 precompiles in its [integration guide](https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks).
- Coinbase documents that its tokenized stocks are available only in eligible jurisdictions outside the US. AAPLc is a technical research candidate only; no issuer has been approved for US access or for this product.

## Real B20 fork test

The opt-in test uses Base's Foundry release `v1.1.0` (binary reports `1.6.0-v1.1.0`, commit `6130ccf6af0b3399777aee3876486e2ba9ebb38f`) with its Base precompiles enabled. Obtain the toolchain from the official [base-anvil project](https://github.com/base/base-anvil/blob/base-anvil-fork/docs/base.md), and confirm its pinned Base implementation matches the chain upgrade under investigation before interpreting results as production evidence.

```sh
RUN_B20_FORK=true FOUNDRY_BASE=true BASE_RPC_URL=https://mainnet.base.org base-forge test --root tests/metoken-stock-fork --match-contract RealB20ForkTest -vv
```

At block 55666312, AAPLc's eight-decimal token, a historical liquidity pool balance, and the registered hub were used to run creator subscription, buyer mint, and buyer redemption successfully on the fork. The test impersonates the pool and register controller **only inside the fork**. It reuses the approved USDC vault and uses experimental curve values; it neither proves separate vault isolation nor tests real user eligibility, actual market liquidity, all token restrictions, corporate actions, production curve economics, or version parity with the live chain. The standard Forge run skips this opt-in test.

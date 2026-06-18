# USDC Hub Setup for MeTokens (Base)

Only **Hub 1 (DAI)** is registered on the MeTokens Diamond today. USDC support requires an on-chain hub registration before the app can offer it in the hub selector.

## Current on-chain state (Base)

| Hub | Asset | Vault | Status |
|-----|-------|-------|--------|
| 1 | DAI `0x50c572…` | `0xff6Eb470…` | Active |
| 2+ | — | — | Not registered |

## What the app already supports

- Hub-aware collateral parsing (DAI 18 decimals, USDC 6 decimals)
- Hub selector in MeToken creation (lists only **active** hubs from chain)
- Subgraph `Hub` entity from `Register` events
- Admin script: `scripts/register-usdc-hub.ts`

## Steps to enable USDC (protocol admin)

These steps follow [meTokens-core](https://github.com/meTokens/meTokens-core) Hardhat tasks:

### 1. Deploy / register a USDC vault

```bash
# In meTokens-core repo, on Base:
yarn hardhat add-vault \
  --diamond 0xba5502db2aC2cBff189965e991C07109B14eB3f5 \
  --registry <VaultRegistry> \
  --vault <NewUSDCVault> \
  --network base
```

Use the same curve parameters as Hub 1 unless you have reason to change them (`baseY: 224`, `reserveWeight: 32`, `refundRatio: 50%`).

### 2. Register the USDC hub on the Diamond

```bash
USDC_VAULT_ADDRESS=0xYourVault \
DIAMOND_OWNER_PRIVATE_KEY=0x... \
npx tsx scripts/register-usdc-hub.ts
```

Or call `register(owner, asset, vault, refundRatio, baseY, reserveWeight, encodedVaultArgs)` on the Diamond from any admin wallet.

USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### 3. Redeploy subgraph (v1.0.3+)

The subgraph now indexes `Hub` and `MeTokenBalance` entities. After deploy, sync the Turbo pipeline:

```bash
cd subgraphs/creative-platform
yarn codegen && yarn build
# Deploy to Graph Studio / Goldsky as metokens 1.0.3
turbo pipeline apply pipeline-metokens-balances.yaml
```

### 4. Verify in the app

- Open **Create MeToken** — Hub selector should show **Hub 2 — USDC**
- Portfolio uses `meTokenBalances(where: { user })` instead of scanning all tokens

## Subgraph balance index

`MeTokenBalance` is updated from:

- `Subscribe` → credits owner `minted`
- `Mint` → credits `recipient`
- `Burn` → debits `burner`

On-chain `balanceOf` in the app verifies indexed values. P2P transfers after initial mint are reconciled via the on-chain read in `useMeTokenHoldings`.

Query example:

```graphql
{
  meTokenBalances(where: { user: "0x...", balance_gt: 0 }) {
    meToken
    balance
  }
}
```

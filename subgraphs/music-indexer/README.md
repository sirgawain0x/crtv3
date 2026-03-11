# Universal Music Indexer Subgraph

Indexes on-chain music (ERC-721/1155) from Catalog, Sound, Mint Songs, Royal, EulerBeat, and Zora. Goldsky indexes the data; Creative TV queries it at `/music`.

## Networks

- **Ethereum mainnet:** Catalog, Sound factory, Royal factory, EulerBeat, Zora + dynamic collections from factories.
- **Polygon:** Mint Songs factory + dynamic collections.

## Contract registry

Static registry: `contracts-registry.json`. To discover more contracts from factories:

```bash
export ETHERSCAN_API_KEY="your_key"
# Optional: POLYGONSCAN_API_KEY for Polygon; if unset, ETHERSCAN_API_KEY is used (Etherscan API V2 supports Polygon and 60+ EVM chains)
python3 scripts/music-contracts-scraper.py
# Output: subgraphs/music-indexer/music_contracts_registry.json
```

Options: `--eth-only`, `--poly-only`, `-o path/to/output.json`.

## Build and deploy

### Prerequisites

- Node.js and Yarn
- [Goldsky CLI](https://docs.goldsky.com) (`goldsky login`)

### Install and codegen

```bash
cd subgraphs/music-indexer
yarn install
yarn codegen          # Ethereum (default)
yarn codegen:poly     # Polygon (run before building Polygon)
```

### Build

```bash
yarn build            # Ethereum
yarn build:poly       # Polygon (after codegen:poly)
```

### Deploy to Goldsky

```bash
yarn deploy:eth       # music-eth/1.0.0
yarn deploy:poly      # music-poly/1.0.0 (builds from subgraph.poly.yaml, deploys build/)
```

If a deployment with that name and version already exists, Goldsky will fail with "A deployment with this name & version already exists". To **replace** it (delete then redeploy):

```bash
yarn replace:eth      # delete music-eth/1.0.0, then deploy
yarn replace:poly     # delete music-poly/1.0.0, then deploy
```

Create a merged/cross-chain endpoint in the Goldsky dashboard if desired, then set `GOLDSKY_MUSIC_INDEXER_SUBGRAPH_NAME` (and optionally version) in Creative TV.

## Schema

**MusicTrack:** `id`, `title`, `artist`, `audioUrl`, `imageUrl`, `metadataUri`, `platform`, `chain`, `createdAt`, `owner`, `contract`, `tokenId`. Metadata can be resolved from `metadataUri` on the frontend (Creative TV uses Grove for IPFS).

## Files

- `schema.graphql` – entity definition
- `subgraph.yaml` / `subgraph.eth.yaml` – Ethereum manifest
- `subgraph.poly.yaml` – Polygon manifest
- `src/mapping.eth.ts` – Ethereum handlers
- `src/mapping.poly.ts` – Polygon handlers
- `abis/*.json` – contract ABIs

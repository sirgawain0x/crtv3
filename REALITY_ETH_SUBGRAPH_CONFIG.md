# Reality.eth Subgraph Configuration

## Contract Information for Base Network

### Contract Address
```
0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8
```

### Start Block (Deployment Block)
```
26260675
```

### Network
- **Chain ID:** 8453 (Base)
- **Token:** ETH (native token)
- **Version:** 3.0

### Contract ABI

The ABI is available from the `@reality.eth/contracts` package. The ABI file is located at:

```
node_modules/@reality.eth/contracts/abi/solc-0.8.6/RealityETH-3.0.abi.json
```

**To copy the ABI for your subgraph:**

```bash
# Copy the ABI file to your subgraph's abis directory
cp node_modules/@reality.eth/contracts/abi/solc-0.8.6/RealityETH-3.0.abi.json ./abis/RealityETH-3.0.json
```

**Or access it programmatically:**

```javascript
const realityEthContracts = require('@reality.eth/contracts');
const config = realityEthContracts.realityETHConfig(8453, 'ETH', '3.0');
const instance = realityEthContracts.realityETHInstance(config);
const abi = instance.abi; // Array of 58 ABI entries
```

## Subgraph Configuration

### subgraph.yaml Example

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: RealityETH
    network: base
    source:
      address: "0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8"
      abi: RealityETH
      startBlock: 26260675
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      abis:
        - name: RealityETH
          file: ./abis/RealityETH-3.0.abi.json
      entities:
        - Question
        - Answer
      eventHandlers:
        - event: LogNewQuestion(indexed bytes32,indexed bytes32,address,uint256,uint256,uint256,uint256,uint256,bytes32,string,uint256,uint256)
          handler: handleNewQuestion
        - event: LogNewAnswer(indexed bytes32,indexed bytes32,address,uint256,uint256,uint256,uint256,uint256,bytes32,string,uint256,uint256)
          handler: handleNewAnswer
        - event: LogFinalize(indexed bytes32,bytes32)
          handler: handleFinalize
      file: ./src/mapping.ts
```

### Key Events to Index

1. **LogNewQuestion** - When a new question is created
2. **LogNewAnswer** - When an answer is submitted
3. **LogFinalize** - When a question is finalized
4. **LogClaim** - When bonds are claimed

### Arbitrators

The contract has two default arbitrators configured:
- `0x05295972F75cFeE7fE66E6BDDC0435c9Fd083D18` - Kleros (Oracle court)
- `0xd04f24364687dBD6db67D2101faE59e91a6e605B` - Kleros arbitrator (Precog)

## Quick Reference

| Field | Value |
|-------|-------|
| **Contract Address** | `0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8` |
| **Start Block** | `26260675` |
| **Network** | Base (8453) |
| **Token** | ETH |
| **Version** | 3.0 |
| **ABI Source** | `@reality.eth/contracts` package |

## Getting the ABI File

To extract the ABI for your subgraph:

```bash
# Option 1: Copy from node_modules (recommended)
cp node_modules/@reality.eth/contracts/abi/solc-0.8.6/RealityETH-3.0.abi.json ./abis/RealityETH-3.0.json

# Option 2: Use the package programmatically
node -e "const c = require('@reality.eth/contracts'); const i = c.realityETHInstance(c.realityETHConfig(8453, 'ETH', '3.0')); require('fs').writeFileSync('./abis/RealityETH-3.0.json', JSON.stringify(i.abi, null, 2));"
```

**Note:** The ABI contains 58 entries including all contract functions and events.

## Verification

You can verify the contract on BaseScan:
- **BaseScan:** https://basescan.org/address/0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8

---

**Last Updated:** 2025-01-XX  
**Source:** `@reality.eth/contracts` package deployment file

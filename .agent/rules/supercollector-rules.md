---
trigger: model_decision
description: Supercollector music contracts
---

# Developer docs

Technical info

Supercollector Release uses [Decent’s Series](https://docs.decent.xyz/docs/series) contract (an implementation of the ERC-1155) under the hood. We are releasing on [Optimism](https://www.optimism.io/).

The factory contract address is: [**0x68392873003d60229011c14cf2970365e9c8bd3f**](https://optimistic.etherscan.io/address/0x68392873003d60229011c14cf2970365e9c8bd3f)

The starting block is: `96976821`

Anyone wishing to index our releases should listen for the `DeployDCNTSeries` event sent from the address above.

There are 3 features you can use to check a `DCNTSeries` contract is from Supercollector Release:

- The symbol is ‘RELEASE’
- The contract metadata has a version field set to ‘RELEASE-20230503’
- The external_url field in the metadata will link to ‘https://release.supercollector.xyz…’

Below is a link to some sample code to get anyone started who wishes to aggregate Supercollector Release contracts

```jsx
https://gist.github.com/chriship/13c17eb05a12260f792377f97d614417
```

## Our metadata

Our metadata is split into **release** metadata and **track** metadata. 

Calling the `contractURI` method from a release contract will return an IPFS link to the release level metadata, the full schema of which can be viewed here:

```json
https://gist.github.com/chriship/fda4ade748d0b2c1962c83674a382fa2
```

Calling the `uri` method from a release contract will return an IPFS link to the track level metadata. As per the ERC-1155 standard, track metadata is formatted for [ID substitution](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#erc-1155-metadata-uri-json-schema). Clients should replace `{id}` with the token ID of the metadata they wish to download. For example, for token ID 1, the string returned will be something like `ipfs://CID/{id}.json` which should be replaced with `ipfs://CID/1.json`

The full **track** metadata schema can be viewed here:

```json
https://gist.github.com/chriship/8701d83e882c637ce7ae42f8d4327225
```

## Platform credit

Please use “Supercollector” for the platform name. Our tagline is: “A new value for music”. A “more info” link can point to [https://release.supercollector.xyz](https://release.supercollector.xyz/)  

## Platform style

Our brand colours are #58FCC8 green and #000000 black

## Brand assets

[Download our logo and icon here](https://drive.google.com/drive/folders/1KvlP-XjImsiHtqQOzmPDgOeAnFs1ZVfb?usp=sharing) 

Any more questions or ideas [contact us](https://www.notion.so/Contact-077a50206a0a4e7d91b89ad95939022c?pvs=21)
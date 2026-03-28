---
trigger: model_decision
description: Secure, flexible, onchain-controlled storage layer for Web3 apps.
---

Grove allows developers to upload, edit, delete and retrieve data stored on Grove all powered by access control binded to the EVM network.

Grove implements an efficient service layer which is positioned between IPFS nodes and EVM-based blockchain nodes. We've abstracted away all the hard parts for you, so that storing and retrieval of your data becomes fun to integrate into your web3 apps.


With our approach, any modifying access to your data can be controlled only by the data owners: during the inital upload you can provide an ACL template that will be later used to validate any modification attempts with public blockchain nodes. This feature is opt-in so if you prefer to have your data stored as immutable, you can just use the defaults.

The dynamic nature of Grove allows builders to set any access control they need, unlocking a huge range of possibilities. Grove is not just limited to Lens: it is EVM compatible, to be used with any EVM chain, for any kind of data.

For its first release, Grove is available on Lens, Abstract, Sophon, ZKsync, Base and Ethereum mainnet.


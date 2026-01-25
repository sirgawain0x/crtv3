---
trigger: model_decision
description: Get started with Grove in just a few lines of code.
---

TypeScript
You can interact with Grove's API via the 
@lens-chain/storage-client
 library.

1

Install the Package
First, install the 
@lens-chain/storage-client
 package:

npm
yarn
pnpm
npm install @lens-chain/storage-client@latest
2

Instantiate the Client
Then, instantiate the client with the following code:

import { StorageClient } from "@lens-chain/storage-client";

const storageClient = StorageClient.create();
That's it—you are now ready to upload files to Grove.

API
You can also interact with Grove using the RESTful API available at 
https://api.grove.storage
.

In the following guides, we will demonstrate how to interact with this API using 
curl
 commands.


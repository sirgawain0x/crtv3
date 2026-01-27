---
trigger: model_decision
description: Get started with the Lens TypeScript SDK.
---

TypeScript
Get started with the Lens TypeScript SDK.

The Lens TypeScript SDK is a low-level API client for interacting with the Lens API. It provides a lightweight abstraction over the bare GraphQL API and is suitable for server-to-server communication or very bespoke client-side integrations where the Lens React SDK is not suitable.

Designed with a modular, functional approach, this SDK draws inspiration from the viem client-actions architecture. It structures functionality into distinct, reusable actions, each focused on a specific API feature.

Getting Started
To get started, follow the steps below.

1

Install SDK
First, install the 
@lens-protocol/client
 package using your package manager of choice.

npm
yarn
pnpm
npm install @lens-protocol/client@canary
2

Define Fragments
Next, define the structure of the data for the key entities in your application by creating GraphQL fragments that customize the data you retrieve.

This step is critical to keeping your queries efficient and focused, helping you avoid overfetching unnecessary data.

See the example below for a few common fragments.

fragments/accounts.ts
fragments/posts.ts
fragments/images.ts
import { graphql, MediaImageFragment, UsernameFragment } from "@lens-protocol/react";

export const AccountMetadataFragment = graphql(
  `
    fragment AccountMetadata on AccountMetadata {
      name
      bio

      thumbnail: picture(
        request: { preferTransform: { fixedSize: { height: 128, width: 128 } } }
      )
      picture
    }
  `,
  [MediaImageFragment]
);

export const AccountFragment = graphql(
  `
    fragment Account on Account {
      __typename
      username {
        ...Username
      }
      address
      metadata {
        ...AccountMetadata
      }
    }
  `,
  [UsernameFragment, AccountMetadataFragment]
);
Throughout this documentation, you’ll explore additional fragments and fields that you may want to tailor to your needs.

See the Custom Fragments best-practices guide for more information.

3

TypeScript Definitions
Then, create an 
index.ts
 where you extend the TypeScript definitions for the entities you are customizing.

fragments/index.ts
import type { FragmentOf } from "@lens-protocol/client";

import { AccountFragment, AccountMetadataFragment } from "./accounts";
import { PostMetadataFragment } from "./posts";
import { MediaImageFragment } from "./images";

declare module "@lens-protocol/client" {
  export interface Account extends FragmentOf<typeof AccountFragment> {}
  export interface AccountMetadata
    extends FragmentOf<typeof AccountMetadataFragment> {}
  export interface MediaImage extends FragmentOf<typeof MediaImageFragment> {}
  export type PostMetadata = FragmentOf<typeof PostMetadataFragment>;
}

export const fragments = [
  AccountFragment,
  PostMetadataFragment,
  MediaImageFragment,
];
4

Create a PublicClient
Finally, create an instance of the 
PublicClient
 pointing to the desired environment.

client.ts (Mainnet)
client.ts (Testnet)
import { PublicClient, mainnet } from "@lens-protocol/client";

import { fragments } from "./fragments";

export const client = PublicClient.create({
  environment: mainnet,
  fragments,
});
That's it—you can now use the 
@lens-protocol/client/actions
 to interact with the Lens API.

Additional Options
Below are some additional options you can pass to the 
PublicClient.create
 method.

Origin Header
The Authentication Flow requires request to be made with the HTTP Origin header. If you are logging in from an environment (e.g. Node.js) other than a browser, you need to set the 
origin
 option when creating the client.

client.ts
import { PublicClient, mainnet } from "@lens-protocol/client";

import { fragments } from "./fragments";

export const client = PublicClient.create({
  environment: mainnet,
  fragments,
  origin: "https://myappdomain.xyz",
});
Server API Key
If you need higher rate limits for server-to-server usage of the Lens API, you can generate a Server API Key for your application in the Lens Developer Dashboard. Provide this key when creating the client.

DO NOT use the Server API Key in a client-side context. It is meant for server-to-server communication only.

client.ts
import { PublicClient, mainnet } from "@lens-protocol/client";

import { fragments } from "./fragments";

export const client = PublicClient.create({
  environment: mainnet,
  fragments,
  apiKey: "<SERVER-API-KEY>",
});
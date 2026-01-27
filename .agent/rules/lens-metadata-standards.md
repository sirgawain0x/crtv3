---
trigger: model_decision
description: This guide explain how Metadata objects are created and managed in Lens.
---

Metadata Standards
This guide explain how Metadata objects are created and managed in Lens.

Lens Metadata Standards, introduced in LIP-2, are a set of self-describing object specifications. These standards ensure that the data includes all the necessary information for validation within itself.

Create Metadata Object
You can construct Metadata objects in two ways:

By utilizing the 
@lens-protocol/metadata
 package

Manually, with the help of a dedicated JSON Schema

TS/JS
JSON Schema
Install the 
@lens-protocol/metadata
 package with its required peer dependencies.

npm
yarn
pnpm
yarn add zod @lens-protocol/metadata@latest
Below, we provide few practical examples for creating Metadata objects. Throughout this documentation, we will detail the specific Metadata objects required for various use cases.

Text-only Post Metadata
Account Metadata
App Metadata
import { textOnly } from "@lens-protocol/metadata";

const metadata = textOnly({
  content: `GM! GM!`,
});
Localize Post Metadata
You can specify the language of a Post's content using the 
locale
 field in the metadata.

The 
locale
 values must follow the 
<language>-<region>
 format, where:

<language>
 is a lowercase ISO 639-1 language code

<region>
 is an optional uppercase ISO 3166-1 alpha-2 country code

You can provide either just the language code, or both the language and country codes. Here are some examples:

en
 represents English in any region

en-US
 represents English as used in the United States

en-GB
 represents English as used in the United Kingdom

TS/JS
JSON Schema
If not specified, the 
locale
 field in all 
@lens-protocol/metadata
 helpers will default to 
en
.

Example
import { textOnly } from "@lens-protocol/metadata";

const metadata = textOnly({
  content: `Ciao mondo!`,
  locale: "it",
});
While this example uses the 
textOnly
 helper, the same principle applies to all other metadata types.

Host Metadata Objects
We recommend using Grove to host your Metadata objects as a cheap and secure solution. However, developers are free to store Metadata anywhere, such as IPFS, Arweave, or AWS S3, as long as the data is publicly accessible via a URI and served with the 
Content-Type: application/json
 header.

In this documentation, examples will often use an instance of Grove's 
StorageClient
 to upload Metadata objects.

storage-client.ts
import { StorageClient, testnet } from "@lens-chain/storage-client";

export const storageClient = StorageClient.create(testnet);
You can also upload media files to the same hosting solution, then reference their URIs in the Metadata prior to uploading it.

Query Metadata Media
Many metadata fields reference media objects such as images, audio, and video files. The content at those URIs is fetched and snapshotted by the Lens API as part of the indexing process.

By default, when you query those fields, the Lens API returns the snapshot URLs. However, you can also request the original URIs.

MediaImage
MediaAudio
MediaVideo
AccountMetadata
GroupMetadata
AppMetadata
fragment MediaImage on MediaImage {
  __typename
  altTag
  item # Snapshot URL
  original: item(request: { useOriginal: true })
  license
  type
  width
  height
}
Additionally, when you get snapshot URLs of images, you can request different sizes of the image through an 
ImageTransform
 object.

ImageTransform
input ImageTransform @oneOf {
  fixedSize: FixedSizeTransform
  widthBased: WidthBasedTransform
  heightBased: HeightBasedTransform
}

# Resize image to a fixed size, cropping if necessary
input FixedSizeTransform {
  width: Int! # px
  height: Int! # px
}

# Maintain aspect ratio by adjusting height based on width
input WidthBasedTransform {
  width: Int! # px
}

# Maintain aspect ratio by adjusting width based on height
input HeightBasedTransform {
  height: Int! # px
}
See the following example:

MediaImage
AccountMetadata
fragment MediaImage on MediaImage {
  # …

  tall: item(request: { preferTransform: { heightBased: { height: 600 } } })

  large: item(request: { preferTransform: { widthBased: { width: 2048 } } })

  thumbnail: item(
    request: { preferTransform: { fixedSize: { height: 128, width: 128 } } }
  )
}
Refresh Metadata Objects
In some cases, you may need to refresh the cached content of a Metadata object in the Lens API.

Let's go through an example. Suppose you have a Post object with a Metadata object hosted on Grove that you want to update without submitting a transaction, as described in the edit Post guide.

Post
import { Post } from "@lens-protocol/client";

const post: Post = {
  id: "42",
  contentUri: "lens://323c0e1cceb…",
  metadata: {
    content: "Good morning!",
  },

  // …
};
Assuming you have the necessary permissions to update the content of the Post, you can update the Metadata object hosted on Grove as follows.

Example
acl.ts
storage.ts
viem.ts
import { textOnly } from "@lens-protocol/metadata";

import { acl } from "./acl";
import { storageClient } from "./storage";
import { signer } from "./viem";

const updates = textOnly({
  content: `Good morning!`,
});

const response = await storageClient.updateJson(
  post.contentUri
  newData,
  signer,
  { acl }
);
The process described here works with any hosting solution that allows you to update the content at a given URI.

TypeScript
1

Initiate a Metadata Refresh
First, use the 
refreshMetadata
 action to initiate the refresh process.

Refresh Metadata
client.ts
import { refreshMetadata } from "@lens-protocol/client";
import { client } from "./client";

const result = await refreshMetadata(client, { entity: { post: post.id } });
This process is asynchronous and may take a few seconds to complete.

2

Wait for the Refresh to Complete
Then, if necessary, use the for the Lens API to update the Metadata object.

Refresh Metadata
import { waitForMetadata } from "@lens-protocol/client";

// …

const result = await refreshMetadata(client, {
  entity: { post: post.id },
}).andThen(({ id }) => waitForMetadata(client, id));
That's it—any Lens API request involving the given Post will now reflect the updated Metadata object.
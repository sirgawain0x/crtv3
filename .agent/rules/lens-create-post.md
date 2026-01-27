---
trigger: model_decision
description: This guide will walk you through the process of creating a Post.
---

Create a Post
This guide will walk you through the process of creating a Post.

Lens Post content, including text, images, videos, and more, is stored in what's known as Post Metadata. This metadata is a JSON file linked to the Lens Post via its public URI.

Your First Post
To create a Post on Lens, follow these steps.

You MUST be authenticated as Account Owner or Account Manager to post on Lens.

1

Create Post Metadata
First, construct a Post Metadata object with the necessary content.

TS/JS
JSON Schema
The Post Metadata Standard is part of the Lens Metadata Standards and covers various content types. Below are the most common ones.

Text-Only
Audio
import { audio, MediaAudioMimeType } from "@lens-protocol/metadata";

const metadata = audio({
  title: "Great song!",
  audio: {
    item: "https://example.com/song.mp3",
    type: MediaAudioMimeType.MP3,
    artist: "John Doe",
    cover: "https://example.com/cover.png",
  },
});
Image
import {
  image,
  MediaImageMimeType,
  MetadataLicenseType,
} from "@lens-protocol/metadata";

const metadata = image({
  title: "Touch grass",
  image: {
    item: "https://example.com/image.png",
    type: MediaImageMimeType.PNG,
    altTag: "Me touching grass",
    license: MetadataLicenseType.CCO,
  },
});
Video
import {
  MetadataLicenseType,
  MediaVideoMimeType,
  video,
} from "@lens-protocol/metadata";

const metadata = video({
  title: "Great video!",
  video: {
    item: "https://example.com/video.mp4",
    type: MediaVideoMimeType.MP4,
    cover: "https://example.com/thumbnail.png",
    duration: 123,
    altTag: "The video of my life",
    license: MetadataLicenseType.CCO,
  },
  content: `
  In this video I will show you how to make a great video.

  And maybe I will show you how to make a great video about making a great video.
  `,
});
Article
import { article } from "@lens-protocol/metadata";

const metadata = article({
  title: "Great Question"
  content: `
    ## Heading

    My article is great

    ## Question

    What is the answer to life, the universe and everything?

    ## Answer

    42

    ![The answer](https://example.com/answer.png)
  `,
  tags: ["question", "answer"],
});
Others
There are also helpers for more specialized content types:

checkingIn - to share your location with your community

embed - to share embeddable resources such as games or mini-apps

event - for sharing physical or virtual events

link - for sharing a link

liveStream - for scheduling a live stream event

mint - for sharing a link to mint an NFT

space - for organizing a social space

story - for sharing audio, image, or video content in a story format

threeD - for sharing a 3D digital asset

transaction - for sharing an interesting on-chain transaction

shortVideo - for publications where the main focus is a short video

Used to describe content that is text-only, such as a message or a comment.

Text-only
import { textOnly } from "@lens-protocol/metadata";

const metadata = textOnly({
  content: `GM! GM!`,
});
See 
textOnly(input): TextOnlyMetadata
 reference doc.

2

Upload Post Metadata
Then, upload the Post Metadata object to a public URI.

import { textOnly } from "@lens-protocol/metadata";
import { storageClient } from "./storage-client";

const metadata = textOnly({
  content: `GM! GM!`,
});

const { uri } = await storageClient.uploadAsJson(metadata);

console.log(uri); // e.g., lens://4f91ca…
This example uses Grove storage to host the Metadata object. See the Lens Metadata Standards guide for more information on hosting Metadata objects.

3

Create the Post
TypeScript
GraphQL
React
Then, use the 
post
 action to create a Lens Post.

Simple Post
Post with Rules
import { uri } from "@lens-protocol/client";
import { post } from "@lens-protocol/client/actions";

const result = await post(sessionClient, { contentUri: uri("lens://4f91ca…") });
To learn more about how to use Post Rules, see the Post Rules guide.

4

Handle Result
TypeScript
GraphQL
React
Finally, handle the result using the adapter for the library of your choice:

viem
ethers
import { handleOperationWith } from "@lens-protocol/client/viem";

// …

const result = await post(sessionClient, {
  contentUri: uri("lens://4f91ca…"),
}).andThen(handleOperationWith(walletClient));
The Lens SDK example here leverages a functional approach to chaining operations using the 
Result<T, E>
 object. See the Error Handling guide for more information.

See the Transaction Lifecycle guide for more information on how to determine the status of the transaction.

Posting on a Custom Feed
Whenever you are creating a root Post (i.e., not a Comment or Quote) on a Custom Feed, you need to verify that the logged-in Account has the necessary requisites to post on that Feed.

As with Global Feeds, you MUST be authenticated as Account Owner or Account Manager to post on a Custom Feed.

1

Check Feed Rules
First, inspect the 
feed.operations.canPost
 field to determine whether the logged-in Account is allowed to post on the Custom Feed.

Check Rules
switch (feed.operations.canPost.__typename) {
  case "FeedOperationValidationPassed":
    // Posting is allowed
    break;

  case "FeedOperationValidationFailed":
    // Posting is not allowed
    console.log(feed.operations.canPost.reason);
    break;

  case "FeedOperationValidationUnknown":
    // Validation outcome is unknown
    break;
}
Where:

FeedOperationValidationPassed
: The logged-in Account can post on the Custom Feed.

FeedOperationValidationFailed
: Posting is not allowed. The 
reason
 field explains why, and 
unsatisfiedRules
 lists the unmet requirements.

FeedOperationValidationUnknown
: The Custom Feed has one or more unknown rules requiring ad-hoc verification. The 
extraChecksRequired
 field provides the addresses and configurations of these rules.

Treat the 
FeedOperationValidationUnknown
 as failed unless you intend to support the specific rules. See Feed Rules for more information.

2

Create the Post
Then, if allowed, post on the Custom Feed.

For simplicity, we will omit the details on creating and uploading Post Metadata.

TypeScript
GraphQL
React
Post on Custom Feed
import { evmAddress, postId, uri } from "@lens-protocol/client";
import { post } from "@lens-protocol/client/actions";

const result = await post(sessionClient, {
  contentUri: uri("lens://4f91ca…"),
  commentOn: {
    post: postId("42"), // the post to comment on
  },
  feed: evmAddress("0x1234…"), // the custom feed address
});
Continue as you would with a regular Post on the Global Feed.

Commenting on a Post
The process of commenting on a Post is similar to creating a Post so we will focus on the differences.

You MUST be authenticated as Account Owner or Account Manager to comment on Lens.

1

Check Parent Rules
First, inspect the 
post.operations.canComment
 field to determine whether the logged-in Account is allowed to comment on a given post. Some posts may have restrictions on who can comment on them.

Comments cannot have their own Post Rules. Instead, they inherit the rules of the root post (either a Post or a Quote) in the thread. The operations field of a comment reflects the rules of the root post.

Check Rules
switch (post.operations.canComment.__typename) {
  case "PostOperationValidationPassed":
    // Commenting is allowed
    break;

  case "PostOperationValidationFailed":
    // Commenting is not allowed
    console.log(post.operations.canComment.reason);
    break;

  case "PostOperationValidationUnknown":
    // Validation outcome is unknown
    break;
}
Where:

PostOperationValidationPassed
: The logged-in Account can comment on the Post.

PostOperationValidationFailed
: Commenting is not allowed. The 
reason
 field explains why, and 
unsatisfiedRules
 lists the unmet requirements.

PostOperationValidationUnknown
: The Post or its Feed (for custom Feeds) has one or more unknown rules requiring ad-hoc verification. The 
extraChecksRequired
 field provides the addresses and configurations of these rules.

Treat the 
PostOperationValidationUnknown
 as failed unless you intend to support the specific rules. See Post Rules for more information.

2

Create Comment
Then, if allowed, create a Comment on the Post.

Cross-feed commenting is currently not supported. If you find this feature valuable, please let us know by opening an issue.

For simplicity, we will omit the details on creating and uploading Post Metadata.

TypeScript
GraphQL
React
Example
import { postId, uri } from "@lens-protocol/client";
import { post } from "@lens-protocol/client/actions";

const result = await post(sessionClient, {
  contentUri: uri("lens://4f91ca…"),
  commentOn: {
    post: postId("42"), // the post to comment on
  },
});
Continue as you would with a regular Post.

Quoting a Post
The process of quoting a Post is similar to creating a Post so we will focus on the differences.

You MUST be authenticated as Account Owner or Account Manager to quote on Lens.

1

Check Post Rules
First, inspect the 
post.operations.canQuote
 field to determine whether the logged-in Account is allowed to quote a given Post. Some posts may have restrictions on who can quote them.

Check Rules
switch (post.operations.canQuote.__typename) {
  case "PostOperationValidationPassed":
    // Quoting is allowed
    break;

  case "PostOperationValidationFailed":
    // Quoting is not allowed
    console.log(post.operations.canQuote.reason);
    break;

  case "PostOperationValidationUnknown":
    // Validation outcome is unknown
    break;
}
Where:

PostOperationValidationPassed
: The logged-in Account can quote the Post.

PostOperationValidationFailed
: Quoting is not allowed. The 
reason
 field explains why, and 
unsatisfiedRules
 lists the unmet requirements.

PostOperationValidationUnknown
: The Post or its Feed (for custom Feeds) has one or more unknown rules requiring ad-hoc verification. The 
extraChecksRequired
 field provides the addresses and configurations of these rules.

Treat the 
PostOperationValidationUnknown
 as failed unless you intend to support the specific rules. See Post Rules for more information.

2

Create Quote
Then, if allowed, create a Quote of the Post.

Cross-feed quoting is currently not supported. If you find this feature valuable, please let us know by opening an issue.

For simplicity, we will omit the details on creating and uploading Post Metadata.

TypeScript
GraphQL
React
Quote
Quote with Rules
import { postId, uri } from "@lens-protocol/client";
import { post } from "@lens-protocol/client/actions";

const result = await post(sessionClient, {
  contentUri: uri("lens://4f91ca…"),
  quoteOf: {
    post: postId("42"), // the post to quote
  },
});
To learn more about how to use Post Rules, see the Post Rules guide.

Then, continue as you would with a regular Post.
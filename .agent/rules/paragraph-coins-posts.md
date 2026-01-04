---
trigger: model_decision
description: Paragraphs coins and publications
---

# Get coin by contract address
Source: https://paragraph.com/docs/api-reference/coins/get-coin-by-contract-address

paragraph-api/openapi.json get /v1/coins/contract/{contractAddress}
Retrieve information about a tokenized post using its contract address



# Get coin by ID
Source: https://paragraph.com/docs/api-reference/coins/get-coin-by-id

paragraph-api/openapi.json get /v1/coins/{id}
Retrieve information about a tokenized post using its unique ID



# Get coin quote by contract address
Source: https://paragraph.com/docs/api-reference/coins/get-coin-quote-by-contract-address

paragraph-api/openapi.json get /v1/coins/quote/contract/{contractAddress}
Retrieve a quote for the amount of the coin in exchange of ETH



# Get coin quote by ID
Source: https://paragraph.com/docs/api-reference/coins/get-coin-quote-by-id

paragraph-api/openapi.json get /v1/coins/quote/{id}
Retrieve a quote for the amount of coin in exchange of ETH



# Get coin's buy args by contract address
Source: https://paragraph.com/docs/api-reference/coins/get-coins-buy-args-by-contract-address

paragraph-api/openapi.json get /v1/coins/buy/contract/{contractAddress}
Retrieve the args needed to buy a coin using a wallet



# Get coin's buy args by ID
Source: https://paragraph.com/docs/api-reference/coins/get-coins-buy-args-by-id

paragraph-api/openapi.json get /v1/coins/buy/{id}
Retrieve the args needed to buy a coin using a wallet



# Get coin's sell args by contract address
Source: https://paragraph.com/docs/api-reference/coins/get-coins-sell-args-by-contract-address

paragraph-api/openapi.json get /v1/coins/sell/contract/{contractAddress}
Retrieve the args needed to sell a coin using a wallet that has it



# Get coin's sell args by ID
Source: https://paragraph.com/docs/api-reference/coins/get-coins-sell-args-by-id

paragraph-api/openapi.json get /v1/coins/sell/{id}
Retrieve the args needed to sell a coin using a wallet that has it



# Get popular coins
Source: https://paragraph.com/docs/api-reference/coins/get-popular-coins

paragraph-api/openapi.json get /v1/coins/list/popular
Retrieve popular coins



# List coin holders by contract address
Source: https://paragraph.com/docs/api-reference/coins/list-coin-holders-by-contract-address

paragraph-api/openapi.json get /v1/coins/contract/{contractAddress}/holders
Retrieve a paginated list of holders for a tokenized post



# List coin holders by ID
Source: https://paragraph.com/docs/api-reference/coins/list-coin-holders-by-id

paragraph-api/openapi.json get /v1/coins/{id}/holders
Retrieve a paginated list of holders for a coined post



# Create a new post
Source: https://paragraph.com/docs/api-reference/posts/create-a-new-post

paragraph-api/openapi.json post /v1/posts
Create a new post in your publication. The publication is identified by the API key provided in the Authorization header.

**Requirements:**
- `markdown` field is required and will be converted to TipTap JSON format
- `title` field is required

**Behavior:**
- The post will be created as published by default
- If `sendNewsletter` is true, an email will be sent to all subscribers



# Get post by ID
Source: https://paragraph.com/docs/api-reference/posts/get-post-by-id

paragraph-api/openapi.json get /v1/posts/{postId}
Retrieve detailed information about a specific post



# Get post by publication ID and post slug
Source: https://paragraph.com/docs/api-reference/posts/get-post-by-publication-id-and-post-slug

paragraph-api/openapi.json get /v1/publications/{publicationId}/posts/slug/{postSlug}
Retrieve a post using its publication ID and its URL-friendly slug



# Get post by publication slug and post slug
Source: https://paragraph.com/docs/api-reference/posts/get-post-by-publication-slug-and-post-slug

paragraph-api/openapi.json get /v1/publications/slug/{publicationSlug}/posts/slug/{postSlug}
Retrieve a post using its publication's slug and the post's slug. This is useful for building user-facing URLs.



# Get posts feed
Source: https://paragraph.com/docs/api-reference/posts/get-posts-feed

paragraph-api/openapi.json get /v1/posts/feed
Retrieve a curated, paginated list of posts.



# List posts in a publication
Source: https://paragraph.com/docs/api-reference/posts/list-posts-in-a-publication

paragraph-api/openapi.json get /v1/publications/{publicationId}/posts
Retrieve a paginated list of posts from a publication



# Get publication by custom domain
Source: https://paragraph.com/docs/api-reference/publications/get-publication-by-custom-domain

paragraph-api/openapi.json get /v1/publications/domain/{domain}
Retrieve publication details using its custom domain

# Get publication by ID
Source: https://paragraph.com/docs/api-reference/publications/get-publication-by-id

paragraph-api/openapi.json get /v1/publications/{publicationId}
Retrieve detailed information about a specific publication



# Get publication by slug
Source: https://paragraph.com/docs/api-reference/publications/get-publication-by-slug

paragraph-api/openapi.json get /v1/publications/slug/{slug}
Retrieve publication details using its URL-friendly slug. Optionally include an @ before the slug.

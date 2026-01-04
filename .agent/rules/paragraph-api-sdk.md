---
trigger: model_decision
description: Developers can interact with Paragraph data using a REST API or a TypeScript SDK, both of which are currently in alpha and provide access to publications, posts, coins, and user profiles
---

Using the TypeScript SDK
The SDK is a wrapper around the REST API designed for ease of use and type safety.
• Installation and Setup: Developers can install the SDK via npm using npm i @paragraph-com/sdk. It requires Node.js version 19 or higher.
• Initialization: To start, instantiate the ParagraphAPI class. Public endpoints do not require an API key, but protected endpoints (like creating posts) require an API key passed in the configuration.
• Common Patterns:
    ◦ Fetching Data: Use methods like api.publications.get({ slug }) to find publication IDs.
    ◦ Pagination: The SDK supports cursor-based pagination for listing posts, allowing developers to fetch subsequent pages by passing the cursor from the previous response.
    ◦ Specialized Queries: Developers can retrieve a specific object using the .single() method or fetch related data simultaneously, such as a coin and its holders, using Promise.all.
Interacting via the REST API
The REST API allows for direct HTTP requests to manage the lifecycle of Paragraph content.
• Authentication: Protected endpoints identify the publication using an API key provided in the Authorization header.
• Core Capabilities:
    ◦ Posts: Developers can programmatically create new posts by providing a title and markdown content. They can also retrieve detailed post info by ID or slug.
    ◦ Subscribers: The API supports adding individual subscribers (via email or wallet), listing active subscribers, and bulk-importing them from CSV files.
    ◦ Coins: There are dedicated endpoints to retrieve information about tokenized posts, fetch price quotes in ETH, and get the specific arguments needed to buy or sell coins using a wallet.
    ◦ Users: Detailed user profiles can be looked up using either a unique user ID or an Ethereum wallet address.
Alternative and On-Chain Methods
For more decentralized or real-time integrations, developers have additional options:
• Arweave Access: Because Paragraph offers permanent storage on Arweave, developers can permissionlessly fetch posts without using Paragraph's own API. This involves querying Arweave via GraphQL for transaction IDs and then using the Arweave JS SDK to retrieve the TipTap JSON or HTML content.
• On-Chain Events: Integrators can listen to Airlock (factory) events on the Base network to discover new Paragraph coins as they are launched. This is done by verifying if a coin's integrator address matches the Paragraph integrator address.
• AI-Assisted Development: Developers can provide the full documentation URL (https://paragraph.com/docs/llms-full.txt) to LLMs to give them complete knowledge of the API. There is also a Paragraph MCP server available to integrate documentation and API access directly into AI clients like Claude Code.
Important Constraints
• Rate Limiting: The API is rate-limited; developers must implement appropriate retry logic and can request limit increases via support.
• Breaking Changes: Because the API is in alpha, breaking changes may occur until the design is finalized.

--------------------------------------------------------------------------------
Analogy: Think of Paragraph’s infrastructure as a modular library. You can use the front desk (REST API) for direct requests, hire a dedicated assistant (TypeScript SDK) who speaks your language fluently to handle the paperwork, or if the building is closed, you can always check the public archives (Arweave) for a permanent record.
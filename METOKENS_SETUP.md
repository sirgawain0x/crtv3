# MeTokens Integration Setup

This document explains how to set up the MeTokens integration in your application.

## CORS Issue Resolution

The MeTokens subgraph endpoint has CORS restrictions that prevent direct access from browser applications. To resolve this, we've implemented a server-side API proxy.

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root and add the following:

```bash
# MeTokens Subgraph Configuration
SUBGRAPH_QUERY_KEY=your_subgraph_query_key_here
```

**Important:** You need to obtain the `SUBGRAPH_QUERY_KEY` from:
- The MeTokens team
- Satsuma dashboard
- Or by following the authentication documentation

### 2. API Proxy

The application includes an API proxy route at `/api/metokens-subgraph` that:
- Handles CORS issues by making server-side requests
- Embeds the query key directly in the URL path (as required by Satsuma)
- Forwards GraphQL queries to the MeTokens subgraph

### 3. Testing the Integration

To test if the MeTokens integration is working:

1. Make sure your `.env.local` file has the correct `SUBGRAPH_QUERY_KEY`
2. Restart your development server
3. Add the `MeTokensTest` component to any page to verify the connection

```tsx
import MeTokensTest from '@/components/UserProfile/MeTokensTest';

// Add this to your page
<MeTokensTest />
```

### 4. MeTokens Subgraph Endpoint

The subgraph endpoint format is:
```
https://subgraph.satsuma-prod.com/${QUERY_KEY}/creative-organization-dao--378139/metokens/api
```

Where `${QUERY_KEY}` is your actual query key from the `SUBGRAPH_QUERY_KEY` environment variable.

### 5. Available Queries

The MeTokens subgraph client supports:
- `getAllMeTokens()` - Get all MeTokens
- `getMeTokensByOwner(owner)` - Get MeTokens by owner address
- `getMeToken(id)` - Get specific MeToken by ID
- `getHub(id)` - Get hub information
- `getRecentMints()` - Get recent mint events
- `getRecentBurns()` - Get recent burn events

### 6. Error Handling

If you encounter errors:
1. Check that `SUBGRAPH_QUERY_KEY` is set correctly
2. Verify the subgraph endpoint is accessible
3. Check the browser console and server logs for detailed error messages

### 7. Contract Addresses (Base)

- MeTokenFactory: `0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B`
- Diamond: `0xba5502db2aC2cBff189965e991C07109B14eB3f5`

## Troubleshooting

### CORS Errors
If you still see CORS errors, ensure:
1. The API proxy is working correctly
2. The `SUBGRAPH_QUERY_KEY` is valid
3. Your development server is running

### Authentication Errors
If you get authentication errors (403 Forbidden):
1. Verify your `SUBGRAPH_QUERY_KEY` is correct
2. Check if the key has expired
3. Test your query key by visiting: `https://subgraph.satsuma-prod.com/${QUERY_KEY}/creative-organization-dao--378139/metokens/api`
4. Contact the MeTokens team for a new key if needed

### Network Errors
If you get network errors:
1. Check your internet connection
2. Verify the subgraph endpoint is accessible
3. Check if there are any firewall restrictions

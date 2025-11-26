# Environment Variables Setup Guide

This guide will help you set up the required environment variables for your application.

## Required Environment Variables

### 1. Alchemy Configuration

#### `NEXT_PUBLIC_ALCHEMY_API_KEY`
Your Alchemy API key for blockchain interactions and smart account functionality.

**How to get it:**
1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Log in or create an account
3. Create a new app or select an existing one:
   - Click "Create new app"
   - Select "Base" as the chain
   - Choose "Base Mainnet" as the network
4. Copy the API key from your app dashboard

**Documentation:** [How to Create Access Keys](https://docs.alchemy.com/docs/how-to-create-access-keys)

#### `NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID`
Your Alchemy Gas Manager policy ID for sponsoring user transaction fees.

**How to get it:**
1. Go to [Alchemy Gas Manager](https://dashboard.alchemy.com/gas-manager)
2. Click "Create new policy"
3. Configure your policy:
   - Set spending rules (daily/monthly limits)
   - Configure which operations to sponsor
   - Add allowlists if needed
4. Copy the Policy ID after creation

**Documentation:** [Gas Manager Services](https://docs.alchemy.com/docs/gas-manager-services)

### 2. Livepeer Configuration

#### `LIVEPEER_API_KEY`
Your Livepeer API key for video streaming and processing.

**How to get it:**
1. Go to [Livepeer Studio](https://livepeer.studio/dashboard/developers/api-keys)
2. Create a new API key
3. Copy the key

#### `LIVEPEER_WEBHOOK_ID`
Your Livepeer webhook ID for video processing callbacks.

**How to get it:**
1. In Livepeer Studio, go to Webhooks
2. Create a new webhook pointing to your application URL
3. Copy the webhook ID

### 3. Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
Your Supabase project URL.

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
Your Supabase anonymous/public key.

#### `SUPABASE_SERVICE_ROLE_KEY`
Your Supabase service role key (server-side only).

**How to get them:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the URL and keys

### 4. Subgraph Configuration (Goldsky)

The application uses **Goldsky** for blockchain indexing. No configuration is required as these are public endpoints:

- **MeTokens Subgraph**: `https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.1/gn`
  - Deployment ID: `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`
- **Creative TV Subgraph**: `https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/creative_tv/0.1/gn`
  - Deployment ID: `QmbDp8Wfy82g8L7Mv6RCAZHRcYUQB4prQfqchvexfZR8yZ`

**Note:** These endpoints are accessed via the API proxy at `/api/metokens-subgraph` to handle CORS.

### 5. Coinbase CDP Configuration (Onramp/Offramp)

#### `COINBASE_CDP_API_KEY_ID`
Your Coinbase Developer Platform (CDP) API Key ID for generating session tokens.

#### `COINBASE_CDP_API_KEY_SECRET`
Your Coinbase Developer Platform (CDP) Secret API Key for JWT authentication.

**How to get them:**
1. Go to [Coinbase Developer Platform Portal](https://portal.cdp.coinbase.com/)
2. Log in or create an account
3. Create a new project or select an existing one
4. Navigate to **API Keys** tab
5. Select **Secret API Keys** section
6. Click **Create API key**
7. Configure your key settings (IP allowlist recommended for security)
8. Download and securely store your API key
   - The API Key ID is displayed in the portal
   - The Secret API Key is only shown once during creation - save it securely

**Important Notes:**
- These keys are required for Coinbase Onramp/Offramp integration
- Session tokens are generated server-side using these credentials
- The Secret API Key must never be exposed to the client
- Session tokens expire after 5 minutes and are single-use

**Documentation:**
- [CDP API Key Authentication](https://docs.cdp.coinbase.com/api-reference/v2/authentication)
- [Session Token Authentication](https://docs.cdp.coinbase.com/onramp-&-offramp/session-token-authentication)

### 6. Optional Configuration

#### `NEXT_PUBLIC_SUPPORT_URL`
Your application's support URL.

## Setup Instructions

### For Development

1. Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

2. Add the following variables to `.env.local`:

```bash
# Alchemy Configuration
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID=your_gas_manager_policy_id_here

# Livepeer Configuration
LIVEPEER_API_KEY=your_livepeer_api_key
LIVEPEER_WEBHOOK_ID=your_livepeer_webhook_id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Coinbase CDP Configuration (Onramp/Offramp)
COINBASE_CDP_API_KEY_ID=your_cdp_api_key_id
COINBASE_CDP_API_KEY_SECRET=your_cdp_api_key_secret

# Optional
NEXT_PUBLIC_SUPPORT_URL=https://your-support-url.com

# Note: SUBGRAPH_QUERY_KEY is no longer needed - now using Goldsky public endpoints
```

3. Replace the placeholder values with your actual keys

4. Start the development server:

```bash
yarn dev
```

### For Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable with its value
4. Redeploy your application

## Security Best Practices

### ✅ DO:
- Use `.env.local` for local development (already in `.gitignore`)
- Store production keys in your deployment platform (Vercel, etc.)
- Rotate keys regularly (recommended: annually)
- Use different API keys for development and production
- Keep service role keys server-side only (no `NEXT_PUBLIC_` prefix)

### ❌ DON'T:
- Commit `.env.local` to version control
- Share keys in public channels
- Use production keys in development
- Hardcode keys in your source code

## Verifying Your Setup

To verify your environment variables are set correctly:

1. Check the API debug endpoint:
```bash
curl http://localhost:3000/api/swap/debug
```

2. Look for:
```json
{
  "hasApiKey": true,
  "hasPolicyId": true,
  "apiKeyPrefix": "your_key_prefix...",
  "policyIdPrefix": "your_policy_id_prefix..."
}
```

## Troubleshooting

### "Alchemy API key not configured" error
- Ensure `NEXT_PUBLIC_ALCHEMY_API_KEY` is set in `.env.local`
- Restart your development server after adding the variable
- Check that the key doesn't have any extra spaces or quotes

### "Alchemy paymaster policy ID not configured" error
- Ensure `NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID` is set in `.env.local`
- Verify the policy is active in your Alchemy Gas Manager dashboard
- Make sure the policy has sufficient funds/limits

### Variables not loading
- Ensure `.env.local` is in the project root directory
- Restart your development server
- Check that variable names match exactly (case-sensitive)

## Additional Resources

- [Alchemy Documentation](https://docs.alchemy.com/)
- [Account Kit Documentation](https://accountkit.alchemy.com/)
- [Gas Manager Best Practices](https://docs.alchemy.com/docs/gas-manager-services)
- [API Security Best Practices](https://docs.alchemy.com/docs/best-practices-when-using-alchemy)
- [Using API Keys in HTTP Headers](https://docs.alchemy.com/docs/how-to-use-api-keys-in-http-headers)


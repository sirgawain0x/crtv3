# Storacha IPFS Setup Guide

This guide explains how to set up Storacha for IPFS storage in this application.

## Overview

Storacha (formerly web3.storage) is a decentralized IPFS storage service. This application uses Storacha for uploading files (avatars, thumbnails, AI-generated images) to IPFS.

## Setup Methods

There are two ways to configure Storacha authentication:

### Method 1: Bring Your Own Delegations (Recommended for Backend/Serverless)

This is the recommended approach for Next.js API routes and server-side code.

#### Step 1: Install Storacha CLI

```bash
npm install -g @storacha/cli
```

#### Step 2: Login and Create Space

```bash
# Login with your email
storacha login your-email@example.com

# Create a space (if you haven't already)
storacha space create my-space

# Select the space you want to use
storacha space use <space_did>
```

#### Step 3: Generate Agent Key and Delegation

```bash
# Generate a new agent key (save the private key starting with "Mg...")
storacha key create

# Create a delegation from your CLI agent to the new agent
# Replace <did_from_key_create> with the DID from the previous command
storacha delegation create <did_from_key_create> --base64
```

#### Step 4: Set Environment Variables

Add these to your `.env.local` file (do NOT commit these to git):

```bash
# Storacha Agent Private Key (from `storacha key create`)
STORACHA_KEY=Mg...

# Storacha Delegation Proof (from `storacha delegation create`)
STORACHA_PROOF=eyJ...

# Optional: IPFS Gateway (defaults to w3s.link)
NEXT_PUBLIC_IPFS_GATEWAY=https://w3s.link/ipfs
```

**Important Security Notes:**
- `STORACHA_KEY` and `STORACHA_PROOF` should be **server-side only** (not prefixed with `NEXT_PUBLIC_`)
- Never commit these values to version control
- Store them securely in your deployment environment

### Method 2: Email-Based Login (For Persistent Environments)

This method works for persistent environments like browser applications or long-running processes.

#### Step 1: Set Environment Variable

Add to your `.env.local`:

```bash
# Storacha Email (for email-based login)
NEXT_PUBLIC_STORACHA_EMAIL=your-email@example.com

# Optional: IPFS Gateway
NEXT_PUBLIC_IPFS_GATEWAY=https://w3s.link/ipfs
```

#### Step 2: Complete Email Verification

When you first use the service, you'll receive an email confirmation link. Click it to complete the setup.

**Note:** This method requires email confirmation each time you set up a new agent, which makes it less suitable for serverless/backend environments.

## Gateway Configuration

The application uses `w3s.link` (Storacha's gateway) by default. You can override this with:

```bash
NEXT_PUBLIC_IPFS_GATEWAY=https://w3s.link/ipfs
```

Other available gateways:
- `https://storacha.link/ipfs` - Storacha's official gateway
- `https://gateway.pinata.cloud/ipfs` - Pinata gateway
- `https://dweb.link/ipfs` - Protocol Labs gateway
- `https://ipfs.io/ipfs` - Public IPFS gateway

## Usage

Once configured, the IPFS service is automatically initialized and ready to use:

```typescript
import { ipfsService } from '@/lib/sdk/ipfs/service';

// Upload a file
const result = await ipfsService.uploadFile(file);
if (result.success) {
  console.log('Uploaded to IPFS:', result.url);
  console.log('IPFS Hash:', result.hash);
}
```

## Troubleshooting

### "Storacha client not initialized"

- Ensure you've set either `STORACHA_KEY` + `STORACHA_PROOF` OR `NEXT_PUBLIC_STORACHA_EMAIL`
- For backend/serverless: Use Method 1 (KEY + PROOF)
- For persistent environments: Use Method 2 (EMAIL)

### Email confirmation timeout

- Email links expire after a certain time
- Re-run the login process if the link expires

### Payment plan required

- Storacha requires a payment plan to provision spaces
- Complete the payment plan selection when prompted

## Migration from Lighthouse

This application previously used Lighthouse for IPFS storage. The migration to Storacha provides:

- Better reliability and performance
- True IPFS gateways (w3s.link)
- Better suited for web3 applications
- More modern SDK with TypeScript support

## Additional Resources

- [Storacha Documentation](https://docs.storacha.network/)
- [Storacha Console](https://console.storacha.network/)
- [IPFS Gateway Checker](https://ipfs.github.io/public-gateway-checker/)


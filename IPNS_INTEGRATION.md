# IPNS (InterPlanetary Name System) Integration Guide

## Overview

IPNS (InterPlanetary Name System) is now integrated into the Lighthouse service, allowing you to create mutable pointers to IPFS content. Think of it as a dynamic domain name for your content on IPFS - while IPFS hashes are static and change when content changes, IPNS provides a static address that can be updated to point to new content.

## What is IPNS?

IPNS allows you to:
- Create a static IPNS key that never changes
- Point that key to different IPFS CIDs as content updates
- Share the IPNS address instead of updating links every time content changes
- Maintain permanent, updatable links to your content

## Basic Concepts

1. **IPNS Key**: A static identifier that you create once and reuse
   - `ipnsName`: A short identifier (e.g., "6cda213e3a534f8388665dee77a26458")
   - `ipnsId`: A full IPNS address (e.g., "k51qzi5uqu5dm6uvby6428rfpcv1vcba6hxq6vcu52qtfsx3np4536jkr71gnu")

2. **CID**: The IPFS hash of your content (changes when content changes)

3. **Mapping**: Link the IPNS key to a CID (can be updated as needed)

## Setup

### Environment Variables

IPNS uses the same Lighthouse API key as IPFS storage:

```bash
# Lighthouse API Key (same as IPFS storage)
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here
```

## Usage

### Step 1: Create an IPNS Key

Create a new IPNS key that will serve as your permanent address:

```typescript
import { LighthouseService } from '@/lib/sdk/ipfs/lighthouse-service';

const lighthouse = new LighthouseService({
  apiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY!,
});

// Create a new IPNS key
const keyResponse = await lighthouse.generateKey();

if (keyResponse.success && keyResponse.data) {
  console.log('IPNS Name:', keyResponse.data.ipnsName);
  console.log('IPNS ID:', keyResponse.data.ipnsId);
  
  // Save these values for future use
  const ipnsName = keyResponse.data.ipnsName;
  const ipnsId = keyResponse.data.ipnsId;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    ipnsName: "6cda213e3a534f8388665dee77a26458",
    ipnsId: "k51qzi5uqu5dm6uvby6428rfpcv1vcba6hxq6vcu52qtfsx3np4536jkr71gnu"
  }
}
```

### Step 2: Publish a CID to IPNS

After uploading content to IPFS and getting a CID, publish it to your IPNS key:

```typescript
// After uploading a file and getting a CID
const uploadResult = await lighthouse.uploadFile(file);
if (uploadResult.success && uploadResult.hash) {
  const cid = uploadResult.hash;
  
  // Publish the CID to your IPNS key
  const publishResult = await lighthouse.publishRecord(cid, ipnsName);
  
  if (publishResult.success && publishResult.data) {
    console.log('IPNS Name:', publishResult.data.Name);
    console.log('IPFS Path:', publishResult.data.Value);
    
    // Get the IPNS URL
    const ipnsUrl = lighthouse.getIPNSUrl(ipnsId);
    console.log('IPNS URL:', ipnsUrl);
    // https://gateway.lighthouse.storage/ipns/k51qzi5uqu5dm6uvby6428rfpcv1vcba6hxq6vcu52qtfsx3np4536jkr71gnu
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    Name: "k51qzi5uqu5dm6uvby6428rfpcv1vcba6hxq6vcu52qtfsx3np4536jkr71gnu",
    Value: "/ipfs/Qmd5MBBScDUV3Ly8qahXtZFqyRRfYSmUwEcxpYcV4hzKfW"
  }
}
```

### Step 3: Update IPNS Record (Point to New Content)

When you upload new content and get a new CID, update your IPNS key to point to it:

```typescript
// Upload new content
const newUploadResult = await lighthouse.uploadFile(newFile);
if (newUploadResult.success && newUploadResult.hash) {
  const newCid = newUploadResult.hash;
  
  // Update the IPNS key to point to the new CID
  // (Same key name, different CID)
  const updateResult = await lighthouse.updateRecord(newCid, ipnsName);
  
  if (updateResult.success) {
    console.log('IPNS updated successfully!');
    // The IPNS URL remains the same, but now points to new content
    const ipnsUrl = lighthouse.getIPNSUrl(ipnsId);
    console.log('Updated IPNS URL (still the same):', ipnsUrl);
  }
}
```

**Note**: `updateRecord` is the same as `publishRecord` - just publish a new CID to the same IPNS key.

### Step 4: Retrieve All IPNS Keys

Get all IPNS keys for your account:

```typescript
const keysResult = await lighthouse.getAllKeys();

if (keysResult.success && keysResult.data) {
  keysResult.data.forEach(key => {
    console.log('IPNS Name:', key.ipnsName);
    console.log('IPNS ID:', key.ipnsId);
    console.log('Current CID:', key.cid);
    console.log('Last Update:', new Date(key.lastUpdate || 0));
    console.log('IPNS URL:', lighthouse.getIPNSUrl(key.ipnsId));
  });
}
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      ipnsName: "6cda213e3a534f8388665dee77a26458",
      ipnsId: "k51qzi5uqu5dm6uvby6428rfpcv1vcba6hxq6vcu52qtfsx3np4536jkr71gnu",
      publicKey: "0xc88c729ef2c18baf1074ea0df537d61a54a8ce7b",
      cid: "Qmd5MBBScDUV3Ly8qahXtZFqyRRfYSmUwEcxpYcV4hzKfW",
      lastUpdate: 1684855771773
    }
  ]
}
```

### Step 5: Remove an IPNS Key

Remove an IPNS key when you no longer need it:

```typescript
const removeResult = await lighthouse.removeKey(ipnsName);

if (removeResult.success) {
  console.log('IPNS key removed successfully');
  console.log('Remaining keys:', removeResult.data?.Keys);
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    Keys: [
      {
        Name: "3090a315e92c495ea36444f2bbaeefaf",
        Id: "k51qzi5uqu5dm8gfelll8own1epd9osmlig49il5mmphkrcxbnhydkmx101x15"
      }
    ]
  }
}
```

## Complete Example: Dynamic Content Updates

Here's a complete example showing how to use IPNS for dynamic content:

```typescript
import { LighthouseService } from '@/lib/sdk/ipfs/lighthouse-service';

const lighthouse = new LighthouseService({
  apiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY!,
});

// Step 1: Create IPNS key (do this once)
let ipnsName: string;
let ipnsId: string;

const keyResult = await lighthouse.generateKey();
if (keyResult.success && keyResult.data) {
  ipnsName = keyResult.data.ipnsName;
  ipnsId = keyResult.data.ipnsId;
  
  // Save these for future use (database, config, etc.)
  console.log('Created IPNS key:', { ipnsName, ipnsId });
}

// Step 2: Upload initial content
const file = new File(['Hello World'], 'hello.txt');
const uploadResult = await lighthouse.uploadFile(file);
if (uploadResult.success && uploadResult.hash) {
  const cid = uploadResult.hash;
  
  // Step 3: Publish to IPNS
  const publishResult = await lighthouse.publishRecord(cid, ipnsName);
  if (publishResult.success) {
    const ipnsUrl = lighthouse.getIPNSUrl(ipnsId);
    console.log('Content available at:', ipnsUrl);
    // Share this URL with users - it never changes!
  }
}

// Later, when content needs to be updated:
// Step 4: Upload new content
const newFile = new File(['Hello Updated World'], 'hello.txt');
const newUploadResult = await lighthouse.uploadFile(newFile);
if (newUploadResult.success && newUploadResult.hash) {
  const newCid = newUploadResult.hash;
  
  // Step 5: Update IPNS to point to new content
  const updateResult = await lighthouse.updateRecord(newCid, ipnsName);
  if (updateResult.success) {
    // The IPNS URL stays the same, but now points to new content
    const ipnsUrl = lighthouse.getIPNSUrl(ipnsId);
    console.log('Content updated at:', ipnsUrl);
    // Same URL, different content!
  }
}
```

## Use Cases

### 1. Dynamic Website Content
Update your website content without changing the URL:
```typescript
// Initial deployment
const htmlFile = new File(['<html>...</html>'], 'index.html');
const upload = await lighthouse.uploadFile(htmlFile);
await lighthouse.publishRecord(upload.hash, ipnsName);

// Update website later
const updatedHtmlFile = new File(['<html>New content...</html>'], 'index.html');
const newUpload = await lighthouse.uploadFile(updatedHtmlFile);
await lighthouse.updateRecord(newUpload.hash, ipnsName);
// Same IPNS URL, updated content!
```

### 2. Mutable Metadata
Update metadata without changing the reference:
```typescript
// Initial metadata
const metadata = { version: 1, data: 'initial' };
const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json');
const upload = await lighthouse.uploadFile(metadataFile);
await lighthouse.publishRecord(upload.hash, ipnsName);

// Update metadata
const updatedMetadata = { version: 2, data: 'updated' };
const updatedFile = new File([JSON.stringify(updatedMetadata)], 'metadata.json');
const newUpload = await lighthouse.uploadFile(updatedFile);
await lighthouse.updateRecord(newUpload.hash, ipnsName);
```

### 3. Versioned Content
Keep a permanent link while updating versions:
```typescript
// Create IPNS key for versioned content
const keyResult = await lighthouse.generateKey();
const versionKey = keyResult.data!.ipnsName;

// Version 1
const v1Content = new File(['Version 1'], 'content.txt');
const v1Upload = await lighthouse.uploadFile(v1Content);
await lighthouse.publishRecord(v1Upload.hash, versionKey);

// Version 2 (same IPNS key, different CID)
const v2Content = new File(['Version 2'], 'content.txt');
const v2Upload = await lighthouse.uploadFile(v2Content);
await lighthouse.updateRecord(v2Upload.hash, versionKey);
```

## API Reference

### `generateKey(): Promise<IPNSKeyResponse>`
Creates a new IPNS key.

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    ipnsName: string;
    ipnsId: string;
  };
  error?: string;
}
```

### `publishRecord(cid: string, keyName: string): Promise<IPNSPublishResult>`
Publishes a CID to an IPNS key.

**Parameters:**
- `cid` - The IPFS hash (CID) to publish (can be in various formats: `ipfs://...`, `/ipfs/...`, or just the hash)
- `keyName` - The IPNS key name (ipnsName) to publish to

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    Name: string;  // IPNS ID
    Value: string; // IPFS path (/ipfs/...)
  };
  error?: string;
}
```

### `updateRecord(cid: string, keyName: string): Promise<IPNSPublishResult>`
Updates an IPNS key to point to a new CID. (Same as `publishRecord`)

**Parameters:**
- `cid` - The new IPFS hash (CID)
- `keyName` - The IPNS key name to update

**Returns:** Same as `publishRecord`

### `getAllKeys(): Promise<IPNSListResponse>`
Retrieves all IPNS keys for the account.

**Returns:**
```typescript
{
  success: boolean;
  data?: Array<{
    ipnsName: string;
    ipnsId: string;
    publicKey?: string;
    cid?: string;
    lastUpdate?: number;
  }>;
  error?: string;
}
```

### `removeKey(keyName: string): Promise<IPNSRemoveResponse>`
Removes an IPNS key.

**Parameters:**
- `keyName` - The IPNS key name (ipnsName) to remove

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    Keys: Array<{
      Name: string;
      Id: string;
    }>;
  };
  error?: string;
}
```

### `getIPNSUrl(ipnsId: string): string`
Gets the IPNS gateway URL for a key.

**Parameters:**
- `ipnsId` - The IPNS ID (not the name)

**Returns:** The IPNS gateway URL (e.g., `https://gateway.lighthouse.storage/ipns/k51...`)

### `getIPNSUrlByName(ipnsName: string): Promise<string | null>`
Gets the IPNS gateway URL for a key by name (requires lookup).

**Parameters:**
- `ipnsName` - The IPNS name

**Returns:** Promise with IPNS gateway URL or null if key not found

## Accessing Content via IPNS

Once published, content can be accessed via:

1. **Lighthouse Gateway**:
   ```
   https://gateway.lighthouse.storage/ipns/{ipnsId}
   ```

2. **Other IPFS Gateways** (if supported):
   ```
   https://ipfs.io/ipns/{ipnsId}
   https://dweb.link/ipns/{ipnsId}
   ```

The IPNS address always resolves to the latest CID you've published to it.

## Best Practices

1. **Store IPNS Keys**: Save `ipnsName` and `ipnsId` in your database/config for reuse
2. **Reuse Keys**: Create keys once and reuse them for the same logical content
3. **Version Control**: Use separate IPNS keys for different types of content
4. **Update Strategically**: Only update IPNS when content actually changes
5. **Backup Keys**: Keep track of your IPNS keys - losing them means losing the permanent address

## Integration with Existing Services

IPNS works seamlessly with the existing storage strategy:

```typescript
import { ipfsService } from '@/lib/sdk/ipfs/service';
import { LighthouseService } from '@/lib/sdk/ipfs/lighthouse-service';

// Upload using hybrid storage (Lighthouse + Storacha + Filecoin)
const uploadResult = await ipfsService.uploadFile(file);

if (uploadResult.success && uploadResult.hash) {
  // Create IPNS pointer to the uploaded content
  const lighthouse = new LighthouseService({
    apiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY!,
  });
  
  // Get or create IPNS key (store ipnsName for reuse)
  let ipnsName = await getStoredIPNSName(); // Your function to retrieve stored key
  if (!ipnsName) {
    const keyResult = await lighthouse.generateKey();
    ipnsName = keyResult.data!.ipnsName;
    await storeIPNSName(ipnsName); // Your function to store the key
  }
  
  // Publish CID to IPNS
  await lighthouse.publishRecord(uploadResult.hash, ipnsName);
  
  // Now you have both:
  // - Permanent IPFS CID: uploadResult.hash
  // - Mutable IPNS address: lighthouse.getIPNSUrl(ipnsId)
}
```

## Troubleshooting

### Key Creation Fails
- Verify your Lighthouse API key is valid
- Check network connectivity
- Review server logs for detailed errors

### Publishing Fails
- Ensure the CID exists on IPFS
- Verify the keyName is correct (use ipnsName, not ipnsId)
- Check that the CID format is valid

### IPNS URL Not Resolving
- IPNS resolution can take a few seconds after publishing
- Verify the ipnsId is correct
- Try accessing via different IPFS gateways
- Check that the CID still exists on IPFS

## File Retrieval

### Retrieve Files from IPFS

You can retrieve files from IPFS using their CIDs:

```typescript
// Browser/Client-side: Retrieve as Blob
const result = await lighthouse.retrieveFile(cid);

if (result.success && result.blob) {
  // Use the blob (e.g., create object URL, display image, etc.)
  const objectUrl = URL.createObjectURL(result.blob);
  console.log('Content Type:', result.contentType);
  
  // Example: Display as image
  const img = document.createElement('img');
  img.src = objectUrl;
  document.body.appendChild(img);
  
  // Example: Download file
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = 'filename.ext';
  a.click();
}

// Server-side (Node.js): Download to file
const downloadResult = await lighthouse.downloadFile(cid, './path/to/file.ext');

if (downloadResult.success) {
  console.log('File saved to:', downloadResult.filePath);
  console.log('File size:', downloadResult.size);
  console.log('Content type:', downloadResult.contentType);
}
```

### File Retrieval Methods

#### `retrieveFile(cid: string): Promise<{ success: boolean; blob?: Blob; contentType?: string; error?: string }>`

Retrieves a file from IPFS as a Blob (browser-compatible).

**Parameters:**
- `cid` - The IPFS Content Identifier (CID) in any format

**Returns:**
```typescript
{
  success: boolean;
  blob?: Blob;
  contentType?: string;
  error?: string;
}
```

#### `downloadFile(cid: string, filePath: string): Promise<{ success: boolean; filePath?: string; size?: number; contentType?: string; error?: string }>`

Downloads a file from IPFS to disk (Node.js only).

**Parameters:**
- `cid` - The IPFS Content Identifier (CID)
- `filePath` - The file path to save to

**Returns:**
```typescript
{
  success: boolean;
  filePath?: string;
  size?: number;
  contentType?: string;
  error?: string;
}
```

**Note**: This method can only be used in Node.js environments. For browser environments, use `retrieveFile` instead.

## Filecoin Deal Status

### Check Filecoin Deal Status

All files uploaded to Lighthouse automatically get Filecoin deals created. Check the status:

```typescript
const dealStatusResult = await lighthouse.getDealStatus(cid);

if (dealStatusResult.success && dealStatusResult.data) {
  dealStatusResult.data.forEach(deal => {
    console.log('Deal ID:', deal.dealId);
    console.log('Status:', deal.dealStatus);
    console.log('Storage Provider (Miner):', deal.miner);
    console.log('Start Epoch:', deal.startEpoch);
    console.log('End Epoch:', deal.endEpoch);
    console.log('Chain Deal ID:', deal.chainDealID);
    console.log('Piece CID:', deal.pieceCID);
    console.log('Payload CID:', deal.payloadCid);
    console.log('Provider Collateral:', deal.providerCollateral);
    console.log('Deal UUID:', deal.dealUUID);
    
    // Check deal on Filfox
    const filfoxUrl = `https://filfox.info/en/deal/${deal.chainDealID}`;
    console.log('View on Filfox:', filfoxUrl);
  });
}
```

### Deal Status Response

```typescript
{
  success: true,
  data: [
    {
      pieceCID: "QmPCM9nLb4CdtWH9M5iD4oi32ARtaFxgUfgr1eMViU8dfZ",
      payloadCid: "bafkreiemizfwgot67q5mfsejmgwotaoegd3v536l2liy5oubpjhbaawfku",
      pieceSize: 512,
      carFileSize: 256,
      dealId: 74606268,
      miner: "f01771403",
      content: 74,
      dealStatus: "Sealing: Proving",
      startEpoch: 3714464,
      endEpoch: 4232864,
      publishCid: "bafy2bzacedupiqlo732qxawhctakxtfjyljuwjvndih22wqkkdhon4fsnsopa",
      dealUUID: "10ed5a44-1d76-425f-af70-270a78fefb6f",
      providerCollateral: "7.568 mFIL",
      chainDealID: 74606268
    }
  ]
}
```

### Deal Status Parameters Explained

- **chainDealID**: Use this to search deals on Filfox, Starboard, etc.
  - Example: https://filfox.info/en/deal/23410543
- **storageProvider/miner**: The miner that has stored the aggregated CAR file
- **startEpoch**: Epoch on Filecoin chain when the deal is started
- **endEpoch**: Epoch on Filecoin chain when the deal will end
- **dealStatus**: Current status of deal (e.g., "Sealing: Proving", "Active", etc.)
- **dealUUID**: UUID for the given deal
- **pieceCID**: Piece CID of aggregated CAR (includes padding added at the end of the file to make total file size 2^n)
- **payloadCid**: Payload CID of aggregated CAR (does not include padding)

### Deal Status Method

#### `getDealStatus(cid: string): Promise<FilecoinDealStatusResponse>`

Checks the Filecoin deal status for a CID.

**Parameters:**
- `cid` - The IPFS Content Identifier (CID) to check deals for

**Returns:**
```typescript
{
  success: boolean;
  data?: FilecoinDealStatus[];
  error?: string;
}
```

**Note**: Filecoin deals can take up to 2 days to be created after upload.

## Next Steps

1. **Create IPNS Keys**: Generate keys for your content that needs to be updated
2. **Store Keys**: Save IPNS keys in your database for reuse
3. **Publish Content**: Upload content and publish CIDs to IPNS keys
4. **Update Content**: Update IPNS records when content changes
5. **Share IPNS URLs**: Share IPNS addresses instead of changing CIDs
6. **Retrieve Files**: Download files from IPFS using CIDs
7. **Check Deal Status**: Monitor Filecoin deal status for your uploads

IPNS provides a powerful way to maintain permanent, updatable links to your IPFS content, while Filecoin deals ensure long-term archival storage!

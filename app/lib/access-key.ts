import crypto from 'crypto';

// Generate an access key for the given address and asset ID
export function generateAccessKey(
  address: string, 
  assetId: string
): string {
  const secret = process.env.ACCESS_KEY_SECRET || '';
  const timestamp = Date.now();
  
  const payload = JSON.stringify({
    address,
    assetId,
    timestamp
  });

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Validate the generated access key
export function validateAccessKey(
  accessKey: string, 
  address: string, 
  assetId: string
): boolean {
  const regeneratedKey = generateAccessKey(address, assetId);
  return crypto.timingSafeEqual(
    new Uint8Array(Buffer.from(accessKey)), 
    new Uint8Array(Buffer.from(regeneratedKey))
  );
}
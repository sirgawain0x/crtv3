import { createHash } from 'crypto';

// Function to convert string to 32-byte hex
function stringToHex(input: string): string {
  const hash = createHash('sha256');
  hash.update(input);
  return hash.digest('hex').slice(0, 64);
}

// Environment variables
const thirdWebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdWebAdminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const livepeerFullApiKey = process.env.LIVEPEER_FULL_API_KEY;

if (!thirdWebSecretKey || !thirdWebAdminPrivateKey || !livepeerFullApiKey) {
  throw new Error('Environment variables are missing');
}

// Convert to 32-byte hex
const secretKeyHex = stringToHex(thirdWebSecretKey);
const adminPrivateKeyHex = stringToHex(thirdWebAdminPrivateKey);
const livepeerFullApiKeyHex = stringToHex(livepeerFullApiKey);

// Update environment variables
process.env.THIRDWEB_SECRET_KEY = secretKeyHex;
process.env.THIRDWEB_ADMIN_PRIVATE_KEY = adminPrivateKeyHex;
process.env.LIVEPEER_FULL_API_KEY = livepeerFullApiKeyHex;

console.log('Environment variables updated');
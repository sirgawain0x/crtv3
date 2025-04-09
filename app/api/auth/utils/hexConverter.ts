import { Buffer } from 'buffer';

// Function to convert string to Base64
function stringToBase64(input: string): string {
  return Buffer.from(input).toString('base64');
}

// Environment variables
const thirdWebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdWebAdminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const livepeerFullApiKey = process.env.LIVEPEER_FULL_API_KEY;

if (!thirdWebSecretKey || !thirdWebAdminPrivateKey || !livepeerFullApiKey) {
  throw new Error('Environment variables are missing');
}

// Convert to Base64
const secretKeyBase64 = stringToBase64(thirdWebSecretKey);
const adminPrivateKeyBase64 = stringToBase64(thirdWebAdminPrivateKey);
const livepeerFullApiKeyBase64 = stringToBase64(livepeerFullApiKey);

// Update environment variables
process.env.THIRDWEB_SECRET_KEY = secretKeyBase64;
process.env.THIRDWEB_ADMIN_PRIVATE_KEY = adminPrivateKeyBase64;
process.env.LIVEPEER_FULL_API_KEY = livepeerFullApiKeyBase64;

console.log('Environment variables updated');

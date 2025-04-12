import { Buffer } from 'node:buffer';



// Environment variables
const thirdWebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdWebAdminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const livepeerFullApiKey = process.env.LIVEPEER_FULL_API_KEY;

if (!thirdWebSecretKey || !thirdWebAdminPrivateKey || !livepeerFullApiKey) {
  // throw new Error('Environment variables are missing');

  console.error('Environment variables are missing');
  console.error('THIRDWEB_SECRET_KEY:', thirdWebSecretKey);
  console.error('THIRDWEB_ADMIN_PRIVATE_KEY:', thirdWebAdminPrivateKey);
  console.error('LIVEPEER_FULL_API_KEY:', livepeerFullApiKey);
  process.exit(1);
}

if (!thirdWebSecretKey || !thirdWebAdminPrivateKey || !livepeerFullApiKey) {
  throw new Error('Environment variables are missing');
}


function stringToBase64(input: string | Uint8Array): string {
  if (typeof input === 'string') {
    return Buffer.from(input).toString('base64');
  } else if (input instanceof Uint8Array) {
    return Buffer.from(input).toString('base64');
  } else {
    throw new TypeError('Invalid input type. Expected string or Uint8Array.');
  }
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

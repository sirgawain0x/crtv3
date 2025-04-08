//'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const crypto_1 = require('node:crypto');
// Function to convert string to 32-byte hex
function stringToHex(input) {
  const hash = crypto_1.createHash('sha256');
  hash.update(input);
  return hash.digest('hex').slice(0, 64);
}
exports.stringToHex = stringToHex;
// Environment variables
const thirdWebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdWebAdminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
if (!thirdWebSecretKey || !thirdWebAdminPrivateKey) {
  throw new Error('Environment variables are missing');
}
// Convert to 32-byte hex
const secretKeyHex = stringToHex(thirdWebSecretKey);
const adminPrivateKeyHex = stringToHex(thirdWebAdminPrivateKey);
// Update environment variables
process.env.THIRDWEB_SECRET_KEY = secretKeyHex;
process.env.THIRDWEB_ADMIN_PRIVATE_KEY = adminPrivateKeyHex;
console.log('Environment variables updated');

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
// Function to convert string to 32-byte hex
function stringToHex(input) {
    var hash = (0, crypto_1.createHash)('sha256');
    hash.update(input);
    return hash.digest('hex').slice(0, 64);
}
// Environment variables
var thirdWebSecretKey = process.env.THIRDWEB_SECRET_KEY;
var thirdWebAdminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
if (!thirdWebSecretKey || !thirdWebAdminPrivateKey) {
    throw new Error('Environment variables are missing');
}
// Convert to 32-byte hex
var secretKeyHex = stringToHex(thirdWebSecretKey);
var adminPrivateKeyHex = stringToHex(thirdWebAdminPrivateKey);
// Update environment variables
process.env.THIRDWEB_SECRET_KEY = secretKeyHex;
process.env.THIRDWEB_ADMIN_PRIVATE_KEY = adminPrivateKeyHex;
console.log('Environment variables updated');

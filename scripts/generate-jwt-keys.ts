const jose = require('jose');
const fs = require('fs/promises');
const path = require('path');

async function generateAndSaveKeys() {
  try {
    // Generate the key pair
    const keyPair = await jose.generateKeyPair('RS256');
    
    // Export keys to JWK format
    const privateJwk = await jose.exportJWK(keyPair.privateKey);
    const publicJwk = await jose.exportJWK(keyPair.publicKey);
    
    // Convert to PEM format for storage
    const privateKeyPem = await jose.exportPKCS8(keyPair.privateKey);
    const publicKeyPem = await jose.exportSPKI(keyPair.publicKey);
    
    // Create .env.local if it doesn't exist
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = `JWT_PRIVATE_KEY="${privateKeyPem.replace(/\n/g, '\\n')}"\nJWT_PUBLIC_KEY="${publicKeyPem.replace(/\n/g, '\\n')}"`;
    
    await fs.writeFile(envPath, envContent, { flag: 'a' });
    
    console.log('Keys generated and saved to .env.local');
    console.log('Make sure to back up these keys securely!');
    
  } catch (error) {
    console.error('Error generating keys:', error);
  }
}

generateAndSaveKeys();

/**
 * IPFS Gateway utilities with fallback support
 * Handles conversion of IPFS URLs to alternative gateways when primary gateway fails
 */

// List of IPFS gateways to try (in order of preference)
// Lighthouse first for better CDN distribution (especially West Coast)
// Using actual IPFS gateways for proper decentralized access
const IPFS_GATEWAYS = [
  'https://gateway.lighthouse.storage/ipfs', // Lighthouse - Primary (better CDN, works well on West Coast)
  'https://w3s.link/ipfs', // Storacha (web3.storage) - fast and reliable fallback
  'https://gateway.pinata.cloud/ipfs', // Pinata gateway - reliable fallback
  'https://dweb.link/ipfs', // Protocol Labs - standard IPFS gateway
  'https://4everland.io/ipfs', // 4everland - decentralized
  'https://ipfs.io/ipfs', // Public gateway - last resort fallback
];

/**
 * Extracts IPFS hash from various URL formats
 * @param url - The IPFS URL (can be gateway URL, ipfs:// protocol, or just hash)
 * @returns The IPFS hash (CID) or null if not a valid IPFS URL
 */
export function extractIpfsHash(url: string): string | null {
  if (!url) return null;

  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '').split('/')[0];
  }

  // Handle gateway URLs (e.g., https://gateway.lighthouse.storage/ipfs/bafy...)
  const gatewayMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (gatewayMatch) {
    return gatewayMatch[1];
  }

  // Handle direct hash (Qm... or bafy...)
  if (url.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-z0-9]+)$/)) {
    return url;
  }

  return null;
}

/**
 * Converts an IPFS URL to use a different gateway
 * @param url - The original IPFS URL
 * @param gatewayIndex - Index of gateway to use (default: 0 for Cloudflare)
 * @returns The converted URL or original if not an IPFS URL
 */
export function convertIpfsGateway(
  url: string,
  gatewayIndex: number = 0
): string {
  if (!url) return url;

  const hash = extractIpfsHash(url);
  if (!hash) {
    // Not an IPFS URL, return as-is
    return url;
  }

  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return `${gateway}/${hash}`;
}

/**
 * Gets all possible gateway URLs for an IPFS hash/URL
 * @param url - The IPFS URL or hash
 * @returns Array of gateway URLs
 */
export function getAllIpfsGateways(url: string): string[] {
  const hash = extractIpfsHash(url);
  if (!hash) return [url]; // Return original if not IPFS

  return IPFS_GATEWAYS.map((gateway) => `${gateway}/${hash}`);
}

/**
 * Checks if a URL is from a failing gateway
 * @param url - The URL to check
 * @returns true if URL uses a known failing gateway
 */
export function isFailingGateway(url: string): boolean {
  if (!url) return false;

  // Note: Lighthouse is now primary, so we don't mark it as failing by default
  // Only mark as failing if we detect actual failures (handled in components)

  // Google Cloud Storage from Livepeer AI (404 errors)
  if (url.includes('storage.googleapis.com/lp-ai-generate-com')) {
    return true;
  }

  // ipfs.io can timeout, but we'll handle it in the component
  return false;
}

/**
 * Checks if a URL is an IPFS URL
 * @param url - The URL to check
 * @returns true if URL is an IPFS URL
 */
export function isIpfsUrl(url: string): boolean {
  if (!url) return false;
  return extractIpfsHash(url) !== null;
}

/**
 * Converts known failing/unreliable gateway URLs to alternative gateways
 * Note: Lighthouse is PRIMARY and should NOT be converted proactively.
 * Only converts known problematic gateways (like ipfs.io).
 * Actual failures are handled by the error handler trying fallback gateways.
 * 
 * @param url - The URL that uses a known failing/unreliable gateway
 * @returns The converted URL using an alternative gateway, or original if not IPFS or already using a good gateway
 */
export function convertFailingGateway(url: string): string {
  if (!url) return url;

  // Handle Google Cloud Storage URLs (these are not IPFS, so we can't convert them)
  // These Livepeer AI images are temporary and expired - should be uploaded to IPFS
  if (url.includes('storage.googleapis.com/lp-ai-generate-com')) {
    console.warn('⚠️ Deprecated: Livepeer AI temporary storage URL detected. AI-generated images are now automatically saved to IPFS.');
    return url; // Keep original for now, but it will likely fail with 404
  }

  const hash = extractIpfsHash(url);
  if (!hash) return url; // Not an IPFS URL

  // Handle ipfs:// protocol - convert to Lighthouse gateway URL
  // This is critical for thumbnails and other uploads that return ipfs:// format
  if (url.startsWith('ipfs://')) {
    return `https://gateway.lighthouse.storage/ipfs/${hash}`;
  }

  // Note: Lighthouse is now the PRIMARY gateway and should be tried first
  // Do NOT convert Lighthouse URLs proactively - let them try first
  // Actual failures will be handled by the error handler trying fallback gateways
  
  // Handle known slow/unreliable gateways - convert to Lighthouse (primary) for better CDN
  if (url.includes('ipfs.io/ipfs')) {
    // ipfs.io can be slow/unreliable, prefer Lighthouse for better performance
    return `https://gateway.lighthouse.storage/ipfs/${hash}`;
  }

  // If it's already an IPFS URL but not using a known gateway, prefer Lighthouse for better CDN
  if (!url.includes('lighthouse.storage') && !url.includes('w3s.link') && !url.includes('pinata.cloud') && !url.includes('dweb.link') && !url.includes('4everland.io')) {
    return `https://gateway.lighthouse.storage/ipfs/${hash}`;
  }

  // For Lighthouse URLs (and other known good gateways), return as-is
  // The error handler will handle actual failures by trying fallback gateways
  return url;
}

/**
 * Parses an IPFS URI and returns the HTTP gateway URL with fallback support
 * Enhanced version of parseIpfsUri that uses alternative gateways
 * @param uri - The IPFS URI to parse
 * @param preferGateway - Preferred gateway index (default: 0 for Storacha)
 * @returns The HTTP gateway URL
 */
export function parseIpfsUriWithFallback(
  uri: string,
  preferGateway: number = 0
): string {
  // Validate input is a string to prevent runtime errors
  if (!uri || typeof uri !== 'string') return '';

  // If it's already a failing gateway, convert it
  if (isFailingGateway(uri)) {
    return convertFailingGateway(uri);
  }

  // Handle ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '').split('/')[0];
    const gateway = IPFS_GATEWAYS[preferGateway] || IPFS_GATEWAYS[0];
    return `${gateway}/${hash}`;
  }

  // Handle ipfs hash format
  if (uri.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-z0-9]+)$/)) {
    const gateway = IPFS_GATEWAYS[preferGateway] || IPFS_GATEWAYS[0];
    return `${gateway}/${uri}`;
  }

  // If it's already a gateway URL, check if it's failing
  if (isFailingGateway(uri)) {
    return convertFailingGateway(uri);
  }

  return uri;
}

/**
 * React hook-friendly function to get a reliable image URL with fallback
 * This can be used in components to handle image loading errors
 * @param url - The original image URL
 * @returns Object with the primary URL and fallback URLs
 */
export function getImageUrlWithFallback(url: string): {
  primary: string;
  fallbacks: string[];
} {
  if (!url) {
    return { primary: '', fallbacks: [] };
  }

  // If it's an IPFS URL, provide fallbacks
  const hash = extractIpfsHash(url);
  if (hash) {
    const allGateways = getAllIpfsGateways(url);
    return {
      primary: allGateways[0], // Lighthouse - better CDN distribution (especially West Coast)
      fallbacks: allGateways.slice(1),
    };
  }

  // For non-IPFS URLs, check if it's a failing gateway
  if (isFailingGateway(url)) {
    const converted = convertFailingGateway(url);
    return {
      primary: converted,
      fallbacks: [],
    };
  }

  return {
    primary: url,
    fallbacks: [],
  };
}


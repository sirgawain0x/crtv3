// Enhanced defensive cleanup for development/hot reload: remove duplicate iframes if present
function cleanupExistingIframes() {
  if (typeof window === "undefined") return;
  
  // Clean up container
  const container = document.getElementById("alchemy-signer-iframe-container");
  if (container) {
    container.innerHTML = "";
  }
  
  // Remove all existing Turnkey iframes (there might be multiple)
  const existingIframes = document.querySelectorAll('[id*="turnkey-iframe"], iframe[id="turnkey-iframe"]');
  existingIframes.forEach(iframe => {
    try {
      iframe.remove();
    } catch (error) {
      console.warn("Failed to remove existing iframe:", error);
    }
  });
  
  // Also check for any iframes with Turnkey-related IDs
  const turnkeyIframes = document.querySelectorAll('iframe[id*="turnkey"], iframe[src*="turnkey"]');
  turnkeyIframes.forEach(iframe => {
    try {
      iframe.remove();
    } catch (error) {
      console.warn("Failed to remove Turnkey iframe:", error);
    }
  });
}

// Run cleanup immediately
cleanupExistingIframes();

// Also run cleanup on page visibility change (for SPA navigation)
if (typeof window !== "undefined") {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      cleanupExistingIframes();
    }
  });
}

import { AlchemyWebSigner } from "@account-kit/signer";

// Export cleanup function for manual cleanup if needed
export { cleanupExistingIframes };

// Lazy signer creation - only create when needed and in browser
let signerInstance: AlchemyWebSigner | null = null;

function createSigner(): AlchemyWebSigner {
  // Only create signer in browser environment
  if (typeof window === "undefined") {
    throw new Error("Signer can only be created in browser environment");
  }

  // Check if iframe container exists
  const container = document.getElementById("alchemy-signer-iframe-container");
  if (!container) {
    throw new Error("Iframe container 'alchemy-signer-iframe-container' not found in DOM");
  }

  // Run cleanup before creating signer
  cleanupExistingIframes();

  try {
    const newSigner = new AlchemyWebSigner({
      client: {
        connection: {
          apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
        },
        iframeConfig: {
          iframeContainerId: "alchemy-signer-iframe-container",
        },
      },
    });
    
    signerInstance = newSigner;
    return newSigner;
  } catch (error) {
    console.error("Failed to create AlchemyWebSigner:", error);
    // If signer creation fails, try cleanup and retry once
    cleanupExistingIframes();
    
    try {
      const retrySigner = new AlchemyWebSigner({
        client: {
          connection: {
            apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
          },
          iframeConfig: {
            iframeContainerId: "alchemy-signer-iframe-container",
          },
        },
      });
      
      signerInstance = retrySigner;
      return retrySigner;
    } catch (retryError) {
      console.error("Failed to create AlchemyWebSigner after retry:", retryError);
      throw retryError;
    }
  }
}

// Get signer instance (lazy creation)
function getSigner(): AlchemyWebSigner {
  if (!signerInstance) {
    return createSigner();
  }
  return signerInstance;
}

// Export getter function instead of direct instance
export const signer = {
  get instance() {
    return getSigner();
  }
};

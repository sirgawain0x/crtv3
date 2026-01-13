import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { createHelia, Helia } from 'helia';
import { unixfs, UnixFS } from '@helia/unixfs';
import { LighthouseService } from './lighthouse-service';
import { FilecoinFirstService } from './filecoin-first-service';

export interface IPFSUploadResult {
  success: boolean;
  url?: string;
  hash?: string;
  error?: string;
  filecoinDealId?: string; // Optional: Filecoin deal ID if archived
}

export interface IPFSConfig {
  lighthouseApiKey?: string;
  filecoinFirstApiKey?: string; // Optional: Filecoin First API key for long-term archival
  key?: string;
  proof?: string;
  email?: string;
  gateway?: string;
  enableFilecoinArchival?: boolean; // Optional: Enable automatic Filecoin archival (default: false)
  // Following helia-nextjs pattern: accept Helia instance from context
  helia?: Helia;
  fs?: UnixFS;
}

// Fallback Helia instance for server-side or direct usage (when not using context)
let fallbackHeliaInstance: Helia | null = null;
let fallbackHeliaFs: UnixFS | null = null;

export class IPFSService {
  private lighthouseApiKey?: string;
  private filecoinFirstApiKey?: string;
  private enableFilecoinArchival: boolean;
  private key?: string;
  private proof?: string;
  private email?: string;
  private gateway: string;
  private lighthouseService?: LighthouseService;
  private filecoinFirstService?: FilecoinFirstService;
  private storachaClient: any;
  private helia?: Helia;
  private fs?: UnixFS;
  private initialized: boolean = false;

  constructor(config: IPFSConfig) {
    this.lighthouseApiKey = config.lighthouseApiKey;
    this.filecoinFirstApiKey = config.filecoinFirstApiKey;
    this.enableFilecoinArchival = config.enableFilecoinArchival ?? false;
    this.key = config.key;
    this.proof = config.proof;
    this.email = config.email;
    // Use Lighthouse gateway as default if API key is provided
    this.gateway = config.gateway || (config.lighthouseApiKey 
      ? 'https://gateway.lighthouse.storage/ipfs' 
      : 'https://w3s.link/ipfs');
    
    // Following helia-nextjs pattern: use provided Helia instance from context if available
    if (config.helia && config.fs) {
      this.helia = config.helia;
      this.fs = config.fs;
      this.initialized = true;
      console.log('[IPFSService] Using Helia instance from context');
    }
    
    // Initialize Lighthouse service if API key is provided
    if (this.lighthouseApiKey) {
      this.lighthouseService = new LighthouseService({
        apiKey: this.lighthouseApiKey,
        gateway: this.gateway,
      });
    }

    // Initialize Filecoin First service if API key is provided and archival is enabled
    if (this.filecoinFirstApiKey && this.enableFilecoinArchival) {
      this.filecoinFirstService = new FilecoinFirstService({
        apiKey: this.filecoinFirstApiKey,
      });
    }
  }

  // Initialize fallback Helia instance (for server-side or when not using context)
  private async initializeFallback(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize fallback Helia instance (following helia-nextjs pattern)
      if (!fallbackHeliaInstance) {
        console.log('[IPFSService] Initializing fallback Helia instance...');
        fallbackHeliaInstance = await createHelia();
        fallbackHeliaFs = unixfs(fallbackHeliaInstance);
      }
      this.helia = fallbackHeliaInstance;
      this.fs = fallbackHeliaFs!;

      // Mark as initialized immediately after Helia is ready (before optional Storacha)
      // This prevents infinite retry loops if Storacha initialization fails
      this.initialized = true;
      console.log('[IPFSService] Fallback Helia initialized successfully');

      // Initialize Storacha (Backup/Persistence) - optional, can fail without affecting service
      // This is done after setting initialized=true to ensure Helia is usable even if Storacha fails
      try {
        await this.initializeStoracha();
      } catch (storachaError) {
        // Log but don't throw - Storacha is optional backup
        console.warn('[IPFSService] Storacha initialization failed (non-critical):', storachaError);
      }
    } catch (error) {
      console.error('[IPFSService] Failed to initialize fallback IPFS clients:', error);
      // Only set initialized if Helia was successfully created
      // If Helia creation itself failed, leave initialized=false to allow retry
      if (this.helia && this.fs) {
        this.initialized = true;
        console.warn('[IPFSService] Helia initialized but some optional services failed');
      }
    }
  }

  private async initializeStoracha(): Promise<void> {
    try {
      // Only initialize Storacha if strictly configured with Key/Proof (Server/Background mode)
      // We skip Email auth to avoid interactive prompts in this flow
      if (this.key && this.proof) {
        // Load client with specific private key (backend/serverless approach)
        const principal = Signer.parse(this.key);
        const store = new StoreMemory();
        this.storachaClient = await Client.create({ principal, store });

        let proof;
        try {
          proof = await Proof.parse(this.proof);
        } catch (error: any) {
          console.warn('Invalid Storacha proof, skipping Storacha backup:', error.message);
          return;
        }

        const space = await this.storachaClient.addSpace(proof);
        await this.storachaClient.setCurrentSpace(space.did());
        console.log('Storacha client initialized (Backup Mode)');
      } else {
        // Log that Storacha is skipped
        console.log('Storacha credentials (KEY/PROOF) not missing. Skipping Storacha backup layer.');
      }
    } catch (error) {
      console.error('Failed to initialize Storacha client:', error);
      // Don't fail the whole service, just backup might fail
    }
  }

  // Upload file to IPFS
  // Following helia-nextjs pattern: Helia is primary method
  // Strategy:
  // 1. Upload to Helia (Primary - following helia-nextjs pattern)
  // 2. Background: Upload to Lighthouse (CDN distribution)
  // 3. Background: Upload to Storacha (Backup/Persistence)
  // 4. Background: Create Filecoin deal (Long-term archival, if enabled)
  async uploadFile(file: File | Blob, options: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
    maxSize?: number;
  } = {}): Promise<IPFSUploadResult> {
    try {
      // 1. Primary: Use Helia (following helia-nextjs pattern)
      // Initialize fallback if not using context-provided instance
      if (!this.initialized || !this.fs) {
        await this.initializeFallback();
      }

      if (!this.fs) {
        return {
          success: false,
          error: 'IPFS node not initialized. Please ensure HeliaProvider is mounted or fallback initialization succeeds.',
        };
      }

      // Convert File/Blob to Uint8Array for Helia
      const buffer = await file.arrayBuffer();
      const content = new Uint8Array(buffer);

      // Add to Helia (following helia-nextjs pattern)
      const cid = await this.fs.addBytes(content);
      const hash = cid.toString();
      const url = `${this.gateway}/${hash}`;

      console.log('[IPFSService] ✅ Helia upload successful:', hash);
      console.log('[IPFSService] 📍 Accessible via:', url);

      // 2. Background: Upload to Lighthouse (CDN distribution, non-blocking)
      if (this.lighthouseService) {
        this.lighthouseService.uploadFile(file).then((result) => {
          if (result.success && result.hash) {
            console.log('[IPFSService] ✅ Lighthouse backup complete:', result.hash);
          }
        }).catch((err) => {
          console.warn('[IPFSService] ⚠️ Lighthouse backup failed (non-critical):', err);
        });
      }

      // 3. Background: Upload to Storacha (Backup/Persistence, non-blocking)
      if (this.storachaClient) {
        this.storachaClient.uploadFile(file).then((result: any) => {
          console.log(`[IPFSService] ✅ Storacha backup complete for ${hash}:`, result);
        }).catch((err: any) => {
          console.warn(`[IPFSService] ⚠️ Storacha backup failed for ${hash}:`, err);
        });
      } else {
        // Try to initialize Storacha in background
        this.initializeStoracha().then(() => {
          if (this.storachaClient) {
            this.storachaClient.uploadFile(file).catch((err: any) => {
              console.warn(`[IPFSService] ⚠️ Storacha backup failed for ${hash}:`, err);
            });
          }
        }).catch(() => {
          // Silently fail - Storacha is optional
        });
      }

      // 4. Background: Create Filecoin deal for long-term archival (fire and forget)
      if (this.filecoinFirstService && this.enableFilecoinArchival) {
        this.createFilecoinDeal(hash).then((result) => {
          if (result.success && result.dealId) {
            console.log(`[IPFSService] ✅ Filecoin deal created for ${hash}:`, result.dealId);
          }
        }).catch((err) => {
          console.warn('[IPFSService] ⚠️ Filecoin archival failed (non-critical):', err);
        });
      }

      return {
        success: true,
        url,
        hash,
      };
    } catch (error) {
      console.error('[IPFSService] ❌ IPFS upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Helper method to upload to Storacha as backup
  private async uploadToStorachaBackup(file: File | Blob, hash: string): Promise<void> {
    if (!this.storachaClient) {
      // Initialize Storacha if not already initialized
      await this.initializeStoracha();
    }

    if (this.storachaClient) {
      try {
        await this.storachaClient.uploadFile(file);
        console.log(`✅ Storacha backup complete for ${hash}`);
      } catch (error) {
        console.warn(`⚠️ Storacha backup failed for ${hash}:`, error);
        // Non-critical, don't throw
      }
    }
  }

  // Helper method to create Filecoin deal for long-term archival
  private async createFilecoinDeal(cid: string): Promise<{ success: boolean; dealId?: string; error?: string }> {
    if (!this.filecoinFirstService) {
      return { success: false, error: 'Filecoin First service not initialized' };
    }

    try {
      const result = await this.filecoinFirstService.pinCid(cid);
      if (result.success) {
        console.log(`📦 Filecoin deal initiated for CID: ${cid}`);
      }
      return result;
    } catch (error) {
      console.error(`Filecoin deal creation error for ${cid}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Upload multiple files
  async uploadFiles(files: File[], options: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
  } = {}): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file, options);
      results.push(result);
    }
    return results;
  }

  getPublicUrl(hash: string): string {
    return `${this.gateway}/${hash}`;
  }
}

// Default IPFS service instance
// Uses Lighthouse as primary (if API key provided), Storacha as backup, Filecoin First for archival (optional)
export const ipfsService = new IPFSService({
  lighthouseApiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY,
  filecoinFirstApiKey: process.env.NEXT_PUBLIC_FILECOIN_FIRST_API_KEY,
  enableFilecoinArchival: process.env.NEXT_PUBLIC_ENABLE_FILECOIN_ARCHIVAL === 'true',
  key: process.env.STORACHA_KEY,
  proof: process.env.STORACHA_PROOF,
  // We intentionally OMIT email here to prevent fallback to interactive mode
  // email: process.env.NEXT_PUBLIC_STORACHA_EMAIL, 
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 
    (process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY 
      ? 'https://gateway.lighthouse.storage/ipfs' 
      : 'https://w3s.link/ipfs'),
});

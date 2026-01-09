import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
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
}

// Global Helia instance to prevent multiple nodes in dev mode
let heliaInstance: any = null;
let heliaFs: any = null;

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
  private helia: any;
  private fs: any;
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

  // Initialize clients (Helia + Storacha)
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 1. Initialize Helia (Primary)
      if (!heliaInstance) {
        heliaInstance = await createHelia();
        heliaFs = unixfs(heliaInstance);
      }
      this.helia = heliaInstance;
      this.fs = heliaFs;

      // 2. Initialize Storacha (Backup/Persistence) - strictly server-side if possible, or non-interactive
      await this.initializeStoracha();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize IPFS clients:', error);
      // We don't throw here to allow partial initialization (e.g. Helia works but Storacha fails)
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
  // Strategy:
  // 1. Upload to Lighthouse (Primary - better CDN, especially West Coast)
  // 2. Background: Upload to Storacha (Backup/Persistence)
  // 3. Fallback: Use Helia if both fail
  async uploadFile(file: File | Blob, options: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
    maxSize?: number;
  } = {}): Promise<IPFSUploadResult> {
    try {
      // 1. Try Lighthouse first (Primary - better CDN distribution)
      if (this.lighthouseService) {
        try {
          const lighthouseResult = await this.lighthouseService.uploadFile(file);
          if (lighthouseResult.success && lighthouseResult.hash) {
            const hash = lighthouseResult.hash;
            console.log('✅ Lighthouse upload successful:', hash);
            
            // Background: Upload to Storacha as backup (fire and forget)
            this.uploadToStorachaBackup(file, hash).catch((err) => {
              console.warn('Storacha backup failed (non-critical):', err);
            });

            // Background: Create Filecoin deal for long-term archival (fire and forget)
            // Note: This is async and non-blocking, so filecoinDealId will be undefined in the response
            if (this.filecoinFirstService && this.enableFilecoinArchival) {
              this.createFilecoinDeal(hash).then((result) => {
                if (result.success && result.dealId) {
                  console.log(`✅ Filecoin deal created for ${hash}:`, result.dealId);
                }
              }).catch((err) => {
                console.warn('Filecoin archival failed (non-critical):', err);
              });
            }

            return {
              success: true,
              url: lighthouseResult.url,
              hash,
            };
          }
        } catch (lighthouseError) {
          console.warn('Lighthouse upload failed, trying fallback:', lighthouseError);
          // Continue to fallback
        }
      }

      // 2. Fallback: Use Helia + Storacha (original method)
      await this.initialize();

      if (!this.fs) {
        return {
          success: false,
          error: 'IPFS node not initialized.',
        };
      }

      // Convert File/Blob to Uint8Array for Helia
      const buffer = await file.arrayBuffer();
      const content = new Uint8Array(buffer);

      // Add to Helia
      const cid = await this.fs.addBytes(content);
      const hash = cid.toString();
      const url = `${this.gateway}/${hash}`;

      // Background: Upload to Storacha (Backup)
      if (this.storachaClient) {
        this.storachaClient.uploadFile(file).then((result: any) => {
          console.log(`Storacha backup complete for ${hash}:`, result);
        }).catch((err: any) => {
          console.warn(`Storacha backup failed for ${hash}:`, err);
        });
      }

      // Background: Create Filecoin deal for long-term archival (fire and forget)
      if (this.filecoinFirstService && this.enableFilecoinArchival) {
        this.createFilecoinDeal(hash).then((result) => {
          if (result.success && result.dealId) {
            console.log(`✅ Filecoin deal created for ${hash}:`, result.dealId);
          }
        }).catch((err) => {
          console.warn('Filecoin archival failed (non-critical):', err);
        });
      }

      return {
        success: true,
        url,
        hash,
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
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

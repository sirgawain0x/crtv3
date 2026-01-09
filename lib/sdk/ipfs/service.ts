import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { LighthouseService } from './lighthouse-service';

export interface IPFSUploadResult {
  success: boolean;
  url?: string;
  hash?: string;
  error?: string;
}

export interface IPFSConfig {
  lighthouseApiKey?: string;
  key?: string;
  proof?: string;
  email?: string;
  gateway?: string;
}

// Global Helia instance to prevent multiple nodes in dev mode
let heliaInstance: any = null;
let heliaFs: any = null;

export class IPFSService {
  private lighthouseApiKey?: string;
  private key?: string;
  private proof?: string;
  private email?: string;
  private gateway: string;
  private lighthouseService?: LighthouseService;
  private storachaClient: any;
  private helia: any;
  private fs: any;
  private initialized: boolean = false;

  constructor(config: IPFSConfig) {
    this.lighthouseApiKey = config.lighthouseApiKey;
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
            console.log('✅ Lighthouse upload successful:', lighthouseResult.hash);
            
            // Background: Upload to Storacha as backup (fire and forget)
            this.uploadToStorachaBackup(file, lighthouseResult.hash).catch((err) => {
              console.warn('Storacha backup failed (non-critical):', err);
            });

            return {
              success: true,
              url: lighthouseResult.url,
              hash: lighthouseResult.hash,
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
// Uses Lighthouse as primary (if API key provided), Storacha as backup
export const ipfsService = new IPFSService({
  lighthouseApiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY,
  key: process.env.STORACHA_KEY,
  proof: process.env.STORACHA_PROOF,
  // We intentionally OMIT email here to prevent fallback to interactive mode
  // email: process.env.NEXT_PUBLIC_STORACHA_EMAIL, 
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 
    (process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY 
      ? 'https://gateway.lighthouse.storage/ipfs' 
      : 'https://w3s.link/ipfs'),
});

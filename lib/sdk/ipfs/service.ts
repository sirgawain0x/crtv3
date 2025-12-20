import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';

export interface IPFSUploadResult {
  success: boolean;
  url?: string;
  hash?: string;
  error?: string;
}

export interface IPFSConfig {
  key?: string;
  proof?: string;
  email?: string;
  gateway?: string;
}

// Global Helia instance to prevent multiple nodes in dev mode
let heliaInstance: any = null;
let heliaFs: any = null;

export class IPFSService {
  private key?: string;
  private proof?: string;
  private email?: string;
  private gateway: string;
  private storachaClient: any;
  private helia: any;
  private fs: any;
  private initialized: boolean = false;

  constructor(config: IPFSConfig) {
    this.key = config.key;
    this.proof = config.proof;
    this.email = config.email;
    this.gateway = config.gateway || 'https://ipfs.io/ipfs';
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
  // 1. Add to Helia (Fast, Local/Ephemeral)
  // 2. Return CID immediately
  // 3. Background: Upload to Storacha (Persistence)
  async uploadFile(file: File | Blob, options: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
    maxSize?: number;
  } = {}): Promise<IPFSUploadResult> {
    try {
      await this.initialize();

      if (!this.fs) {
        return {
          success: false,
          error: 'Helia node not initialized.',
        };
      }

      // Convert File/Blob to Uint8Array for Helia
      const buffer = await file.arrayBuffer();
      const content = new Uint8Array(buffer);

      // 1. Add to Helia
      const cid = await this.fs.addBytes(content);
      const hash = cid.toString();
      const url = `${this.gateway}/${hash}`;

      // 2. Background Upload to Storacha (Fire and Forget)
      if (this.storachaClient) {
        // We use a non-awaited promise here to not block the user response
        // However, in serverless functions, we might need to await it or use `waitUntil` equivalent
        // For now, we await it to ensure persistence, but it might be slower. 
        // Given the requirement is "free and fast", maybe we assume Helia is enough for immediate interaction?
        // User asked for Storacha as "backup" where "uploads go cold".
        // Let's log it and await it but handle errors gracefully so it doesn't fail the request.

        // Note: For large files, this might timeout serverless functions.
        // Ideally this should be a separate queue. For now, we do it inline but safe.
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
export const ipfsService = new IPFSService({
  key: process.env.STORACHA_KEY,
  proof: process.env.STORACHA_PROOF,
  // We intentionally OMIT email here to prevent fallback to interactive mode
  // email: process.env.NEXT_PUBLIC_STORACHA_EMAIL, 
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs',
});

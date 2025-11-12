import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';

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

export class IPFSService {
  private key?: string;
  private proof?: string;
  private email?: string;
  private gateway: string;
  private client: any;
  private initialized: boolean = false;

  constructor(config: IPFSConfig) {
    this.key = config.key;
    this.proof = config.proof;
    this.email = config.email;
    this.gateway = config.gateway || 'https://w3s.link/ipfs';
  }

  // Initialize client and ensure space is set up
  private async initialize(): Promise<void> {
    if (this.initialized && this.client) {
      return;
    }

    try {
      // Prefer "Bring Your Own Delegations" approach for backend/serverless
      if (this.key && this.proof) {
        // Load client with specific private key (backend/serverless approach)
        const principal = Signer.parse(this.key);
        const store = new StoreMemory();
        this.client = await Client.create({ principal, store });

        // Add proof that this agent has been delegated capabilities on the space
        // The proof from CLI with --base64 flag is base64-encoded
        // Proof.parse should handle it, but we'll try both formats if needed
        let proof;
        try {
          // Try parsing directly (handles base64 strings)
          proof = await Proof.parse(this.proof);
        } catch (error: any) {
          // If direct parse fails, try decoding base64 first
          if (error.message?.includes('Invalid') || error.message?.includes('parse')) {
            try {
              const decoded = Buffer.from(this.proof, 'base64');
              proof = await Proof.parse(new Uint8Array(decoded));
            } catch (decodeError) {
              throw new Error(`Failed to parse Storacha proof: ${error.message}. Make sure STORACHA_PROOF is set correctly.`);
            }
          } else {
            throw error;
          }
        }
        const space = await this.client.addSpace(proof);
        await this.client.setCurrentSpace(space.did());
      } else if (this.email) {
        // Fallback to email-based login (for persistent environments)
        this.client = await Client.create();
        const account = await this.client.login(this.email);
        
        // Wait for payment plan if needed
        await account.plan.wait();
        
        // Create or get space - first space is automatically set as current
        try {
          await this.client.createSpace('default', { account });
        } catch (error: any) {
          // Space might already exist, which is fine
          if (!error.message?.includes('already exists')) {
            throw error;
          }
        }
      } else {
        // Try default client (may work if state is persisted)
        this.client = await Client.create();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Storacha client:', error);
      throw error;
    }
  }

  // Upload file to IPFS using Storacha
  async uploadFile(file: File, options: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
  } = {}): Promise<IPFSUploadResult> {
    try {
      // Initialize client if needed
      await this.initialize();

      if (!this.client) {
        return {
          success: false,
          error: 'Storacha client not initialized. Please set STORACHA_KEY and STORACHA_PROOF (recommended for backend) or NEXT_PUBLIC_STORACHA_EMAIL (for persistent environments) environment variables.',
        };
      }

      // Validate file
      if (!this.isValidImageFile(file)) {
        return {
          success: false,
          error: 'Invalid file. Please upload a JPEG, PNG, GIF, or WebP image under 2MB.',
        };
      }

      // Upload file to Storacha
      const cid = await this.client.uploadFile(file);
      
      // CID is returned as a string or CID object
      const hash = typeof cid === 'string' ? cid : cid.toString();
      const url = `${this.gateway}/${hash}`;

      return {
        success: true,
        url,
        hash,
      };
    } catch (error) {
      console.error('Storacha IPFS upload error:', error);
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

  // Get file info (not directly supported by Storacha, return null)
  async getFileInfo(hash: string): Promise<{
    size: number;
    type: string;
    name: string;
  } | null> {
    // Storacha doesn't provide a direct way to get file info
    // This would require querying IPFS directly
    return null;
  }

  // Get all uploads (not directly supported by Storacha)
  async getAllUploads(): Promise<any[]> {
    // Storacha doesn't provide a direct way to list uploads
    return [];
  }

  // Validate image file
  private isValidImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB - optimal for avatar images
    
    if (!allowedTypes.includes(file.type)) {
      return false;
    }

    if (file.size > maxSize) {
      return false;
    }

    return true;
  }

  // Get public URL for IPFS hash
  getPublicUrl(hash: string): string {
    return `${this.gateway}/${hash}`;
  }

  // Check if content exists on IPFS (not directly supported)
  async contentExists(hash: string): Promise<boolean> {
    // This would require querying IPFS directly
    return false;
  }
}

// Default IPFS service instance
// Prefer KEY and PROOF for backend/serverless (recommended)
// Fallback to EMAIL for persistent environments
export const ipfsService = new IPFSService({
  key: process.env.STORACHA_KEY,
  proof: process.env.STORACHA_PROOF,
  email: process.env.NEXT_PUBLIC_STORACHA_EMAIL,
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://w3s.link/ipfs',
});

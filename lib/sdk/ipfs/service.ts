import lighthouse from '@lighthouse-web3/sdk';

export interface IPFSUploadResult {
  success: boolean;
  url?: string;
  hash?: string;
  error?: string;
}

export interface IPFSConfig {
  apiKey: string;
  gateway?: string;
}

export class IPFSService {
  private apiKey: string;
  private gateway: string;

  constructor(config: IPFSConfig) {
    this.apiKey = config.apiKey;
    this.gateway = config.gateway || 'https://gateway.lighthouse.storage/ipfs';
  }

  // Upload file to IPFS using Lighthouse
  async uploadFile(file: File, options: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
  } = {}): Promise<IPFSUploadResult> {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        return {
          success: false,
          error: 'Invalid file. Please upload a JPEG, PNG, GIF, or WebP image under 2MB.',
        };
      }

      // Upload to Lighthouse IPFS
      const uploadResponse = await lighthouse.upload(file, this.apiKey);
      
      if (uploadResponse.data && uploadResponse.data.Hash) {
        const hash = uploadResponse.data.Hash;
        const url = `${this.gateway}/${hash}`;

        return {
          success: true,
          url,
          hash,
        };
      } else {
        return {
          success: false,
          error: 'Upload failed: No hash returned from Lighthouse',
        };
      }
    } catch (error) {
      console.error('Lighthouse IPFS upload error:', error);
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

  // Get file info from Lighthouse
  async getFileInfo(hash: string): Promise<{
    size: number;
    type: string;
    name: string;
  } | null> {
    try {
      const fileInfo = await lighthouse.getUploads(this.apiKey);
      
      // Find the file with matching hash
      const file = (fileInfo as any).fileList?.find((f: any) => f.hash === hash);
      
      if (file) {
        return {
          size: file.size,
          type: file.mimeType,
          name: file.fileName,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Lighthouse get file info error:', error);
      return null;
    }
  }

  // Get all uploads for the API key
  async getAllUploads(): Promise<any[]> {
    try {
      const uploads = await lighthouse.getUploads(this.apiKey);
      return (uploads as any).fileList || [];
    } catch (error) {
      console.error('Lighthouse get uploads error:', error);
      return [];
    }
  }

  // Validate image file
  private isValidImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB - optimal for avatar images
    
    // With 5GB total storage, 2MB per avatar allows for 2,500+ user avatars
    // This provides high quality (400x400 to 800x800 pixels) while being storage-efficient
    // Similar to major platforms: LinkedIn (3MB), X/Twitter (5MB), YouTube (2MB)

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

  // Check if content exists on IPFS
  async contentExists(hash: string): Promise<boolean> {
    try {
      const uploads = await this.getAllUploads();
      return uploads.some((upload: any) => upload.hash === hash);
    } catch (error) {
      return false;
    }
  }
}

// Default IPFS service instance
export const ipfsService = new IPFSService({
  apiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || '',
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.lighthouse.storage/ipfs',
});

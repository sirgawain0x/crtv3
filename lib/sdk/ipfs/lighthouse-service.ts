/**
 * Lighthouse IPFS Storage Service
 * Primary storage with better CDN distribution (especially for West Coast)
 */

export interface LighthouseUploadResult {
  success: boolean;
  hash?: string;
  url?: string;
  error?: string;
}

export interface LighthouseConfig {
  apiKey: string;
  gateway?: string;
}

export class LighthouseService {
  private apiKey: string;
  private gateway: string;
  private baseUrl = 'https://api.lighthouse.storage/api/v0';

  constructor(config: LighthouseConfig) {
    this.apiKey = config.apiKey;
    this.gateway = config.gateway || 'https://gateway.lighthouse.storage/ipfs';
  }

  /**
   * Uploads a file to Lighthouse IPFS
   * @param file - File or Blob to upload
   * @returns Promise with IPFS hash and URL
   */
  async uploadFile(file: File | Blob): Promise<LighthouseUploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lighthouse upload error:', errorText);
        return {
          success: false,
          error: `Lighthouse upload failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      const hash = data.Hash || data.hash;

      if (!hash) {
        return {
          success: false,
          error: 'No hash returned from Lighthouse',
        };
      }

      return {
        success: true,
        hash,
        url: `${this.gateway}/${hash}`,
      };
    } catch (error) {
      console.error('Lighthouse upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets the public URL for an IPFS hash
   */
  getPublicUrl(hash: string): string {
    return `${this.gateway}/${hash}`;
  }
}

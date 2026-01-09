/**
 * Lighthouse Filecoin First Service
 * Allows creating Filecoin deals directly from CIDs without uploading to Lighthouse IPFS
 * This saves on IPFS usage costs and provides long-term archival storage
 */

export interface FilecoinDealResult {
  success: boolean;
  dealId?: string;
  error?: string;
}

export interface FilecoinDealStatus {
  dealId: string;
  status: string;
  minerId?: string;
  pieceCid?: string;
  dataCid?: string;
  createdAt?: string;
  sealedAt?: string;
}

export interface FilecoinFirstConfig {
  apiKey: string;
  publicKey?: string; // Optional: used for API key creation if not already created
}

export class FilecoinFirstService {
  private apiKey: string;
  private baseUrl = 'https://filecoin-first.lighthouse.storage/api/v1';

  constructor(config: FilecoinFirstConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Creates a Filecoin deal by pinning a CID
   * @param cid - The IPFS CID to create a deal for
   * @returns Promise with deal result
   */
  async pinCid(cid: string): Promise<FilecoinDealResult> {
    try {
      const response = await fetch(`${this.baseUrl}/pin/add_cid?cid=${encodeURIComponent(cid)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Filecoin First pin error:', errorText);
        return {
          success: false,
          error: `Filecoin First pin failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        dealId: data.dealId || data.deal_id || undefined,
      };
    } catch (error) {
      console.error('Filecoin First pin error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Checks the status of Filecoin deals for a CID
   * @param cid - The IPFS CID to check deals for
   * @returns Promise with array of deal statuses
   */
  async getDealStatus(cid: string): Promise<{
    success: boolean;
    deals?: FilecoinDealStatus[];
    error?: string;
  }> {
    try {
      // Note: This endpoint might need to be adjusted based on Lighthouse's actual API
      // The user mentioned using "the same endpoint mentioned in Filecoin deal section"
      const response = await fetch(`${this.baseUrl}/deal/status?cid=${encodeURIComponent(cid)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Filecoin First deal status error:', errorText);
        return {
          success: false,
          error: `Failed to get deal status: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        deals: Array.isArray(data) ? data : data.deals || [],
      };
    } catch (error) {
      console.error('Filecoin First deal status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets retrieval URLs for a CID
   * Files can be retrieved using Lassie or public gateways
   * @param cid - The IPFS CID
   * @returns Array of retrieval URLs
   */
  getRetrievalUrls(cid: string): string[] {
    return [
      `https://ipfs.io/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
      `https://gateway.lighthouse.storage/ipfs/${cid}`,
      // Lassie retrieval URL (if needed)
      // `https://lassie.filecoin.io/${cid}`,
    ];
  }
}

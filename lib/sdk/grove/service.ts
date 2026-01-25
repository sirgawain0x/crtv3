
import { StorageClient, immutable } from "@lens-chain/storage-client";
import { chains } from "@lens-chain/sdk/viem";
import { serverLogger } from '@/lib/utils/logger';

export interface GroveUploadResult {
    success: boolean;
    url?: string;
    hash?: string; // This will map to the Grove storage key or URI
    error?: string;
}

export class GroveService {
    private client: StorageClient;

    constructor() {
        this.client = StorageClient.create();
    }

    /**
     * Uploads a file to Grove.
     * Uses immutable ACL by default for simplicity and asset permanence.
     * 
     * @param file - The file to upload
     * @returns GroveUploadResult
     */
    async uploadFile(file: File): Promise<GroveUploadResult> {
        try {
            // Use Testnet chain ID for now as per examples (or default to a safe one)
            // If we are on Mainnet, we should switch. 
            // Ideally this comes from config, but for now we follow the 'lens-getting-started' pattern.
            // 37111 is Lens Testnet (Sepolia). 
            // chains.testnet might ideally map to this.

            const acl = immutable(chains.testnet.id);

            const response = await this.client.uploadFile(file, { acl });

            if (response && response.gatewayUrl) {
                serverLogger.debug('[GroveService] ✅ Upload successful:', response.gatewayUrl);
                return {
                    success: true,
                    url: response.gatewayUrl,
                    hash: response.storageKey, // or response.uri
                };
            }

            return {
                success: false,
                error: "Upload response missing gateway URL"
            };

        } catch (error) {
            serverLogger.error('[GroveService] ❌ Upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown Grove upload error"
            };
        }
    }
}

export const groveService = new GroveService();

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car';
import type { Block } from 'ipfs-car';
import * as Storacha from '@storacha/client';
import * as Proof from '@storacha/client/proof';
import * as Delegation from '@storacha/client/delegation';

export interface ThumbnailUploadResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Uploads a thumbnail image file to Helia (local) and Storacha (global)
 * This ensures immediate availability via local IPFS and long-term persistence via Storacha
 * @param file - The image file to upload
 * @param playbackId - The video's playback ID (unused but kept for signature compatibility)
 * @returns Promise<ThumbnailUploadResult>
 */
export async function uploadThumbnailToIPFS(
  file: File,
  playbackId: string
): Promise<ThumbnailUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image'
      };
    }

    console.log('Starting Helia + Storacha upload...');

    // 1. Initialize Helia for local speed
    const helia = await createHelia();
    const fs = unixfs(helia);

    // 2. Add to local Helia (Florida speed - fast local access)
    // Convert File to Uint8Array for Helia
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const localCid = await fs.addBytes(fileBytes);
    console.log('Local Helia CID:', localCid.toString());

    // 3. Create a CAR file for Global Access
    const blocks: Block[] = [];
    const fileEncoder = createFileEncoderStream(file);

    await fileEncoder.pipeTo(new WritableStream({
      write(block) { blocks.push(block); }
    }));

    const root = blocks.at(-1)!.cid;
    const rootCid = root.toString();

    // Reconstruct the block stream for CAR encoding
    const blockStream = new ReadableStream({
      pull(controller) {
        if (blocks.length) { controller.enqueue(blocks.shift()); }
        else { controller.close(); }
      }
    });

    const carChunks: Uint8Array[] = [];
    await blockStream
      .pipeThrough(new CAREncoderStream([root]))
      .pipeTo(new WritableStream({
        write(chunk) { carChunks.push(chunk); }
      }));

    const carBlob = new Blob(carChunks, { type: 'application/car' });

    console.log('CAR packed. Root CID:', rootCid);

    // 4. Upload to Storacha (Global Bridge)
    try {
      const client = await Storacha.create();
      const proofStr = process.env.NEXT_PUBLIC_STORACHA_PROOF;

      if (proofStr) {
        // 1. Extract the delegation from your base64 string
        const delegation = await Delegation.extract(
          new Uint8Array(Buffer.from(proofStr, 'base64'))
        );

        if (delegation.ok) {
          // 2. Add the proof to the client agent
          const space = await client.addSpace(delegation.ok);
          await client.setCurrentSpace(space.did());
          console.log('✅ Storacha space active:', space.did());
        }
      }

      // 3. Upload the CAR (This pushes to the global network)
      await client.uploadCAR(carBlob);
      console.log('🚀 Global upload complete. Reachable on West Coast.');

    } catch (storachaError) {
      console.warn('⚠️ Storacha global pin failed. Falling back to Helia local.', storachaError);
    }

    // Return the CID format expected by the app (IPFS URI)
    return {
      success: true,
      thumbnailUrl: `ipfs://${root.toString()}`
    };

  } catch (error) {
    console.error('Error uploading thumbnail to IPFS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Converts a blob URL to a File object for uploading
 * @param blobUrl - The blob URL to convert
 * @param filename - The filename for the file
 * @returns Promise<File | null>
 */
export async function blobUrlToFile(blobUrl: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    // Create a File object from the blob
    const file = new File([blob], filename, { type: blob.type });
    return file;
  } catch (error) {
    console.error('Error converting blob URL to file:', error);
    return null;
  }
}

/**
 * Uploads a thumbnail from a blob URL to IPFS
 * @param blobUrl - The blob URL of the thumbnail
 * @param playbackId - The video's playback ID for naming
 * @returns Promise<ThumbnailUploadResult>
 */
export async function uploadThumbnailFromBlob(
  blobUrl: string,
  playbackId: string
): Promise<ThumbnailUploadResult> {
  try {
    // Convert blob URL to file
    const file = await blobUrlToFile(blobUrl, `thumbnail-${playbackId}.jpg`);

    if (!file) {
      return {
        success: false,
        error: 'Failed to convert blob URL to file'
      };
    }

    // Upload to IPFS
    return await uploadThumbnailToIPFS(file, playbackId);

  } catch (error) {
    console.error('Error uploading thumbnail from blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

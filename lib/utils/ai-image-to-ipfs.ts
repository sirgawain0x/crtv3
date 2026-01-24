
import { logger } from '@/lib/utils/logger';
/**
 * Utilities for converting AI-generated images to IPFS storage
 * Handles data URLs, blob URLs, and remote URLs
 */

/**
 * Converts a data URL (base64) to a File object
 * @param dataUrl - The data URL to convert (e.g., data:image/png;base64,...)
 * @param filename - The filename for the file
 * @returns File object or null if conversion fails
 */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    // Extract the base64 data and mime type
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      logger.error('Invalid data URL format');
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create a File from the binary data
    const blob = new Blob([bytes], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  } catch (error) {
    logger.error('Error converting data URL to file:', error);
    return null;
  }
}

/**
 * Fetches an image from a URL and converts it to a File object
 * @param url - The URL of the image to fetch
 * @param filename - The filename for the file
 * @returns Promise<File | null>
 */
export async function urlToFile(url: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(`Failed to fetch image from ${url}: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    logger.error('Error fetching image from URL:', error);
    return null;
  }
}

/**
 * Converts a blob URL to a File object
 * @param blobUrl - The blob URL to convert
 * @param filename - The filename for the file
 * @returns Promise<File | null>
 */
export async function blobUrlToFile(blobUrl: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    logger.error('Error converting blob URL to file:', error);
    return null;
  }
}

/**
 * Determines the type of URL and converts it to a File object
 * @param url - The URL to convert (data URL, blob URL, or remote URL)
 * @param filename - The filename for the file
 * @returns Promise<File | null>
 */
export async function anyUrlToFile(url: string, filename: string): Promise<File | null> {
  if (url.startsWith('data:')) {
    // Data URL (base64)
    return dataUrlToFile(url, filename);
  } else if (url.startsWith('blob:')) {
    // Blob URL
    return await blobUrlToFile(url, filename);
  } else {
    // Remote URL (HTTP/HTTPS)
    return await urlToFile(url, filename);
  }
}

/**
 * Generates a unique filename for an AI-generated image
 * @param prefix - Optional prefix for the filename
 * @returns Unique filename string
 */
export function generateAiImageFilename(prefix: string = 'ai-image'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}.png`;
}


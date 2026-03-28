/**
 * Image compression utility using browser Canvas API
 * Compresses images to meet size requirements while maintaining quality
 */

export interface CompressionOptions {
  maxSizeMB?: number; // Maximum file size in MB (default: 5MB)
  maxWidth?: number; // Maximum width in pixels (default: 1920)
  maxHeight?: number; // Maximum height in pixels (default: 1080)
  quality?: number; // JPEG quality 0-1 (default: 0.8)
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp'; // Output format
}

export interface CompressionResult {
  success: boolean;
  file?: File;
  error?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compresses an image file to meet size requirements
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<CompressionResult>
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxSizeMB = 5,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputFormat = 'image/jpeg',
  } = options;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const originalSize = file.size;

  try {
    // If file is already under the limit, return as-is
    if (file.size <= maxSizeBytes) {
      return {
        success: true,
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
      };
    }

    // Create image from file
    const image = await loadImageFromFile(file);

    // Calculate new dimensions maintaining aspect ratio
    const { width, height } = calculateDimensions(
      image.width,
      image.height,
      maxWidth,
      maxHeight
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {
        success: false,
        error: 'Failed to get canvas context',
        originalSize,
        compressedSize: 0,
        compressionRatio: 0,
      };
    }

    // Use high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

    // Try different quality levels to get under size limit
    let compressedFile: File | null = null;
    let currentQuality = quality;
    let attempts = 0;
    const maxAttempts = 10;
    const qualityStep = 0.1;

    while (attempts < maxAttempts) {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          outputFormat,
          currentQuality
        );
      });

      if (!blob) {
        return {
          success: false,
          error: 'Failed to compress image',
          originalSize,
          compressedSize: 0,
          compressionRatio: 0,
        };
      }

      // Check if we're under the size limit
      if (blob.size <= maxSizeBytes) {
        // Create a new File from the blob
        const fileName = file.name.replace(/\.[^/.]+$/, '') + 
          (outputFormat === 'image/jpeg' ? '.jpg' : 
           outputFormat === 'image/png' ? '.png' : '.webp');
        compressedFile = new File([blob], fileName, {
          type: outputFormat,
          lastModified: Date.now(),
        });
        break;
      }

      // Reduce quality for next attempt
      currentQuality = Math.max(0.1, currentQuality - qualityStep);
      attempts++;
    }

    // If we still couldn't compress enough, return error
    if (!compressedFile || compressedFile.size > maxSizeBytes) {
      return {
        success: false,
        error: `Unable to compress image to under ${maxSizeMB}MB. Please use a smaller image.`,
        originalSize,
        compressedSize: compressedFile?.size || 0,
        compressionRatio: compressedFile ? compressedFile.size / originalSize : 0,
      };
    }

    return {
      success: true,
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: compressedFile.size / originalSize,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown compression error',
      originalSize,
      compressedSize: 0,
      compressionRatio: 0,
    };
  }
}

/**
 * Loads an image from a File object
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculates new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if width exceeds max
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  // Scale down if height exceeds max
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

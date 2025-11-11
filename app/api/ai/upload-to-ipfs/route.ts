import { NextRequest, NextResponse } from 'next/server';
import { IPFSService } from '@/lib/sdk/ipfs/service';

// Initialize IPFS service
const ipfsService = new IPFSService({
  apiKey: process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || '',
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.lighthouse.storage/ipfs'
});

/**
 * Converts a data URL to a File object (server-side)
 */
function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create a File from the buffer
    const blob = new Blob([buffer], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  } catch (error) {
    console.error('Error converting data URL to file:', error);
    return null;
  }
}

/**
 * Fetches an image from a remote URL and converts to File (server-side)
 */
async function urlToFile(url: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: response.headers.get('content-type') || 'image/png' });
    
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error fetching image from URL:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, filename } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        error: "Image URL is required",
      }, { status: 400 });
    }

    // Generate filename if not provided
    const finalFilename = filename || `ai-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;

    let file: File | null = null;

    // Convert image URL to File based on type
    if (imageUrl.startsWith('data:')) {
      // Data URL (base64)
      file = dataUrlToFile(imageUrl, finalFilename);
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Remote URL
      file = await urlToFile(imageUrl, finalFilename);
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid image URL format. Must be data URL or HTTP/HTTPS URL",
      }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "Failed to convert image URL to file",
      }, { status: 500 });
    }

    // Upload to IPFS
    const result = await ipfsService.uploadFile(file, {
      pin: true,
      wrapWithDirectory: false
    });

    if (!result.success || !result.url) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to upload to IPFS",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ipfsUrl: result.url,
      ipfsHash: result.hash,
    });

  } catch (error) {
    console.error('IPFS Upload Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload to IPFS",
    }, { status: 500 });
  }
}


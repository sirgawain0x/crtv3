import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, PersonGeneration, SafetyFilterLevel } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: "Prompt is required for image generation",
      });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Google Gemini API key not configured",
      });
    }

    // Initialize Google GenAI client with the new SDK
    const ai = new GoogleGenAI({ apiKey });

    // Enhanced prompt for video thumbnails using Gemini's best practices
    const enhancedPrompt = `
      Create a high-quality, eye-catching thumbnail image for a video platform in 16:9 aspect ratio. 
      
      Scene description: ${prompt}
      
      Technical requirements:
      - 16:9 aspect ratio (perfect for video thumbnails)
      - High resolution and sharp details
      - Professional lighting and composition
      - Vibrant colors that stand out in video thumbnails
      - Clear focal point that draws attention
      
      Style: Photorealistic with cinematic quality. The image should be compelling enough to make viewers want to click and watch the video.
      
      Make it engaging and professional, suitable for a creative video platform.
    `;

    // Use the new SDK to generate images with Gemini 2.5 Flash
    const genImagesResponse = await ai.models.generateImages({
      model: 'gemini-2.5-flash',
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        safetyFilterLevel: SafetyFilterLevel.BLOCK_LOW_AND_ABOVE,
        personGeneration: PersonGeneration.ALLOW_ALL,
      },
    });
    
    // Extract generated images and upload to IPFS
    const images = [];
    if (genImagesResponse.generatedImages) {
      for (const generatedImage of genImagesResponse.generatedImages) {
        if (generatedImage.image?.imageBytes) {
          const imageId = `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const mimeType = generatedImage.image.mimeType || 'image/png';
          const base64Image = Buffer.from(generatedImage.image.imageBytes).toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64Image}`;
          
          // Try to upload to IPFS for permanent storage
          try {
            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ai/upload-to-ipfs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageUrl: dataUrl,
                filename: `${imageId}.png`,
              }),
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.success && uploadResult.ipfsUrl) {
              // Use IPFS URL for permanent storage
              images.push({
                url: uploadResult.ipfsUrl,
                ipfsHash: uploadResult.ipfsHash,
                id: imageId,
                mimeType: mimeType,
                storage: 'ipfs',
              });
            } else {
              // Fallback to data URL if IPFS upload fails
              console.warn('IPFS upload failed, using data URL:', uploadResult.error);
              images.push({
                url: dataUrl,
                id: imageId,
                mimeType: mimeType,
                storage: 'temporary',
                ipfsError: uploadResult.error,
              });
            }
          } catch (ipfsError) {
            // If IPFS upload fails, use data URL
            console.warn('IPFS upload error:', ipfsError);
            images.push({
              url: dataUrl,
              id: imageId,
              mimeType: mimeType,
              storage: 'temporary',
            });
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error("No images were generated");
    }

    return NextResponse.json({
      success: true,
      images: images,
      prompt: enhancedPrompt,
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Handle specific Gemini API errors
    let errorMessage = "AI generation failed";
    if (error instanceof Error) {
      if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
        errorMessage = "Invalid Google Gemini API key";
      } else if (error.message.includes('QUOTA') || error.message.includes('quota')) {
        errorMessage = "API quota exceeded. Please try again later";
      } else if (error.message.includes('SAFETY') || error.message.includes('safety')) {
        errorMessage = "Content blocked by safety filters. Please try a different prompt";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}

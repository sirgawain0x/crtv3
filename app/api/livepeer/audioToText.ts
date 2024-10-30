'use server';
import { upload, download } from "thirdweb/storage";
import { client } from "@app/lib/sdk/thirdweb/client";
import { PathLike } from 'node:fs';
import { readFile } from "node:fs/promises";

interface SubtitleEntry {
  timestamp: [number, number]; // [startTime, endTime] in seconds
  text: string;
  label?: string;
  srclang?: string;
};

function secondsToVTTTime(seconds: number): string {
  // Handle negative numbers or invalid input
  if (seconds < 0) seconds = 0;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds * 1000) % 1000);

  // Format with leading zeros and ensure milliseconds has 3 digits
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds
    .toString()
    .padStart(3, '0')}`;
};

function generateVTTFile(subtitles: SubtitleEntry[]): string {
  // Sort subtitles by start time to ensure proper sequence
  // const sortedSubtitles = [...subtitles].sort((a, b) => a.timestamp[0] - b.timestamp[0]);

  // Start with the WebVTT header
  let vttContent = 'WEBVTT\n\n';

  // Process each subtitle entry
  subtitles.forEach((subtitle, index) => {
    const [startTime, endTime] = subtitle.timestamp;

    // Add cue number (optional but helpful for debugging)
    vttContent += `${index + 1}\n`;

    // Add timestamp line
    vttContent += `${secondsToVTTTime(startTime)} --> ${secondsToVTTTime(endTime)}\n`;

    // Add subtitle text and blank line
    vttContent += `${subtitle.text}\n\n`;
  });

  return vttContent;
};

// Helper function to save VTT content to a file (browser environment)
async function downloadVTTFromHTTPS(
  vttContent: string,
  filename: string = 'subtitles.vtt',
): Promise<void> {
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadVTTFromIPFS = async (vttUri: string): Promise<any> => {
  const file = await download({
    client,
    uri: vttUri,
  });
  return file;
}

export const generateTextFromAudio = async (
  blob: Blob,
  assetId: string,
  modelId: string ='whisper-large-v3',
) => {
  try {

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${process.env.LIVEPEER_API_KEY}`);

    
    const raw = JSON.stringify({
      audio: blob,
      modelId,
    });

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    const response = await fetch(
      'https://dream-gateway.livepeer.cloud/audio-to-text',
      requestOptions,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Add label and srclang to each subtitle
    result.chunks = result.chunks.map((subtitle: any) => {
      subtitle.label = 'English';
      subtitle.srclang = 'en';
      return subtitle;
    });

    // Generate VTT file from chunks and append to response as vtt property
    result.vtt = generateVTTFile(result.chunks);

    const file = new File(result.vtt, `${assetId}-en.vtt`)

    result.uri = await upload({
      client,
      files: [
        file
      ],
    });

    if (response.ok) {
      return {
        success: true,
        result: result,
      };
    } else {
      return {
        success: false,
        result: result,
      };
    }
  } catch (error: any) {
    console.error('Error in audioToText API:', error);
    return { error: error.message || 'Internal Server Error' };
  }
};

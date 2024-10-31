'use server';
import { upload, download } from "thirdweb/storage";
import { client } from "@app/lib/sdk/thirdweb/client";
import { openAsBlob } from "node:fs";
import { fullLivepeer } from "@app/lib/sdk/livepeer/fullClient";

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

function generateVTTFile(subtitles: any[]): string {
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

// Helper function to convert file to Blob
function getFileBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
      resolve(blob);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

export const generateTextFromAudio = async (formData: FormData) => {
  try {

    const file =  formData.get("file") as File;
    
    console.log('Generating subtitles:', { fileName: file.name });

    const result = await fullLivepeer.generate.audioToText({
      audio: new Blob([file], { type: 'video/mp4' }),
    });
  
    console.log('result1', result);

    const rawResponse = await result.rawResponse.json();

    // const options = {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     audio: new Blob([file], { type: 'audio/mp3' }),
    //   }),
    //   headers: {Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`, 'Content-Type': 'multipart/form-data'}
    // };
    
    // const res = await fetch('https://dream-gateway.livepeer.cloud/audio-to-text', options)
    
    // const result = await res.json();

    console.log('rawResponse', rawResponse);

    // if (result.success) {
      let output: any; 

      // Add label and srclang to each subtitle
      output.chunks = rawResponse.chunks.map((subtitle: any) => {
        subtitle.label = 'English';
        subtitle.srclang = 'en';
        return subtitle;
      });

      output.vtt = generateVTTFile(output.chunks);

      const vttFile = new File(output.vtt, `${file.name}-en.vtt`)

      output.uri = await upload({
        client,
        files: [
          vttFile
        ],
      });

      console.log('result2', output);

      return output;
    // }

    // if (result.error) {
    //   console.error(result.error);
    // }
  } catch (error: any) {
    console.error('Error in audioToText API:', error);
    return { error: error.message || 'Internal Server Error' };
  }
};

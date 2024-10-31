'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { CopyIcon } from 'lucide-react';
import { getLivepeerUploadUrl } from '@app/api/livepeer/livepeerActions';
import * as tus from 'tus-js-client';
import PreviewVideo from './PreviewVideo';
import { useActiveAccount } from 'thirdweb/react';
import { Progress } from '@app/components/ui/progress';
import { Button } from '@app/components/ui/button';
// import { generateTextFromAudio } from '@app/api/livepeer/audioToText';
import { AssetMetadata } from '../../../lib/sdk/orbisDB/models/AssetMetadata';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { upload, download } from "thirdweb/storage";
import { client } from "@app/lib/sdk/thirdweb/client";
import { fullLivepeer } from "@app/lib/sdk/livepeer/fullClient";
import { openAsBlob } from "node:fs";
import { generateTextFromAudio } from '@app/api/livepeer/audioToText';

// Add these functions to your component

const truncateUri = (uri: string): string => {
  if (uri.length <= 30) return uri;
  return uri.slice(0, 15) + '...' + uri.slice(-15);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    // Optionally, you can show a temporary "Copied!" message here
    toast('IPFS URI Copied!');
  });
};

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onFileUploaded: (fileUrl: string) => void;
  onPressNext?: (livePeerAssetId: string) => void; //  optional
  onPressBack?: () => void; //  optional
  metadata?: any; // optional
  newAssetTitle?: string; // optional
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileUploaded,
  onPressNext,
  onPressBack,
  metadata,
  newAssetTitle,
}) => {
  // Destructure onFileUploaded
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'loading' | 'complete'
  >('idle');

  const [livePeerUploadedAssetId, setLivePeerUploadedAssetId] =
    useState<string>();

  const { insert } = useOrbisContext();

  const activeAccount = useActiveAccount();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file); // Notify parent component of the selected file
    console.log('Selected file:', file?.name);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setError(null);
    setUploadState('loading');
    setProgress(0);

    try {
      console.log('Start upload #1');
      const uploadRequestResult = await getLivepeerUploadUrl(
        newAssetTitle || selectedFile.name || 'new file name',
        activeAccount?.address || 'anonymous',
      );

      // Save asset id to send back to parent component later
      setLivePeerUploadedAssetId(uploadRequestResult?.asset.id);

      const tusUpload = new tus.Upload(selectedFile, {
        endpoint: uploadRequestResult?.tusEndpoint, // URL from `tusEndpoint` field in the
        metadata: {
          filename: selectedFile.name,
          filetype: 'video/mp4',
        },
        uploadSize: selectedFile.size,
        onError(err: any) {
          console.error('Error uploading file:', err);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          console.log('Uploaded ' + percentage + '%');
          setProgress(percentage);
        },
        onSuccess() {
          console.log('Upload finished:', tusUpload.url);

          setUploadState('complete');
          // Call onFileUploaded here with the upload URL
          onFileUploaded(tusUpload?.url || '');
        },
      });

      const previousUploads = await tusUpload.findPreviousUploads();

      if (previousUploads.length > 0) {
        tusUpload.resumeFromPreviousUpload(previousUploads[0]);
      }

      tusUpload.start();

      console.log('Start generateTextFromAudio');

      const formData = new FormData();

      formData.append('audio', /* await openAsBlob(file) */ new Blob([selectedFile], { type: selectedFile.type }));
      formData.append('model_id', 'openai/whisper-large-v3');

      console.log({ formData });

      const options = {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}` }
      };
      
      const res = await fetch('https://dream-gateway.livepeer.cloud/audio-to-text', options)

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
    
      console.log('status', data.status);
      console.log('data', data);
  
      // if (data.status === 200) {
  
        const vttText = generateVTTContent(data?.chunks);
        const blob = new Blob([vttText], { type: 'text/vtt' });
        const vttFile = new File([blob], `${selectedFile.name}-en.vtt`);
  
        console.log({ vttFile });
  
        const subtitlesUri = await upload({
          client,
          files: [
            vttFile
          ],
        });
  
        console.log('subtitlesUri', subtitlesUri);
        
      const orbisMetadata: AssetMetadata = {
        assetId: uploadRequestResult?.asset.id,
        title: newAssetTitle,
        description: metadata?.description,
        ...(metadata?.location !== undefined && { location: metadata?.location }),
        ...(metadata?.category !== undefined && { category: metadata?.category }),
        ...(metadata?.thumbnailUri !== undefined && { thumbnailUri: metadata?.thumbnailUri }),
        ...(subtitlesUri !== undefined && { subtitlesUri: subtitlesUri }),
      };

      console.log({ orbisMetadata, subtitles });

      const metadataUri = await insert(orbisMetadata, 'kjzl6hvfrbw6c9vo5z3ctmct12rqfb7cb0t37lrtyh1rwjmau71gvy3xt9zv5e4');

      console.log('metadataUri', metadataUri);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please try again.');
      setUploadState('idle');
    }
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
  
  function generateVTTContent(subtitles: /* SubtitleEntry */ any[]): string {
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
  
  // Helper function to convert file to Blob
  // function getFileBlob(file: File): Promise<Blob> {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  
  //     reader.onload = () => {
  //       const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
  //       resolve(blob);
  //     };
  
  //     reader.onerror = (error) => {
  //       reject(error);
  //     };
  
  //     reader.readAsArrayBuffer(file);
  //   });
  // }
  
  // const generateTextFromAudio = async (file: File) => {
  //   try {
  
  //     console.log('Generating subtitles:', { fileName: file.name });
  
  //     const result = await fullLivepeer.generate.audioToText({
  //       audio: new Blob([file], { type: 'video/mp4' }) // await getFileBlob(file),
  //     });
    
  //     console.log('result1', result);

  //     const rawResult: any = await result.rawResponse.json();
  
  //     let output: any;
  
  //     output.vtt = generateVTTFile(rawResult.chunks);
  
  //     const vttFile = new File(output.vtt, `${file.name}-en.vtt`)
  
  //     output.uri = await upload({
  //       client,
  //       files: [
  //         vttFile
  //       ],
  //     });
  
  //     console.log('result2', output);
  
  //     return output;
  //   } catch (error: any) {
  //     console.error('Error in audioToText API:', error);
  //     return { error: error.message || 'Internal Server Error' };
  //   }
  // };
  

  return (
    <div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full rounded-lg p-8 shadow-lg">
          <h1 className="mb-4 text-2xl font-semibold">Upload A File</h1>

          {/* File Input */}
          <div className="mb-6">
            <label
              htmlFor="file-upload"
              className="mb-2 block text-sm font-medium"
            >
              Choose A File To Upload:
            </label>
            <input
              type="file"
              id="file-upload"
              accept="video/*"
              className="file:border-1 block w-full text-sm text-[#EC407A] file:mr-4 file:cursor-pointer file:rounded-full file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#EC407A] hover:file:bg-gray-200"
              onChange={handleFileChange}
            />
            {/* Display selected file name */}
            {selectedFile && (
              <div>
                <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg text-gray-400">
                  Selected File: {selectedFile.name}
                </p>
                <PreviewVideo video={selectedFile} />
              </div>
            )}
          </div>

          {/* Upload Button and Progress Bar */}
          <div className="flex w-full flex-col items-start space-y-4">
            {uploadState === 'idle' ? (
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile}
                className={`${
                  !selectedFile
                    ? 'cursor-not-allowed bg-[#D63A6A]'
                    : 'bg-[#EC407A] hover:bg-[#D63A6A]'
                } cursor-pointer rounded-lg px-4 py-2 font-semibold text-white`}
              >
                Upload File
              </button>
            ) : (
              <div className="w-full">
                <Progress
                  value={progress}
                  max={100}
                  className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
                >
                  <div
                    className="h-full bg-[#EC407A] transition-all duration-500 ease-in-out"
                    style={{ width: `${progress}%` }}
                  />
                </Progress>
                <p className="mt-2 text-sm text-gray-400">
                  {uploadState === 'complete'
                    ? 'Upload Complete!'
                    : `${progress}% uploaded`}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && <p className="mt-4 text-red-500">{error}</p>}

          {/* Success Message */}
          {uploadedUri && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-green-700">
                File uploaded successfully! IPFS URI:{' '}
                <a
                  href={uploadedUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-green-500 underline"
                >
                  {truncateUri(uploadedUri)}
                </a>
                <button
                  onClick={() => copyToClipboard(uploadedUri)}
                  className="ml-2 text-sm text-green-600 hover:text-green-800"
                >
                  <CopyIcon className="h-5 w-5" />
                  <span>Copy</span>
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        {onPressBack && (
          <Button disabled={uploadState === 'loading'} onClick={onPressBack}>
            Back
          </Button>
        )}
        {onPressNext && (
          <Button
            disabled={uploadState !== 'complete'}
            onClick={() => {
              if (livePeerUploadedAssetId) {
                onPressNext(livePeerUploadedAssetId);
              } else {
                alert('Missing livepeer asset id');
              }
            }}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;

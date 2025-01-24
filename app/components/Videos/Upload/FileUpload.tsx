'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { CopyIcon, Loader2 } from 'lucide-react';
import { getLivepeerUploadUrl } from '@app/api/livepeer/livepeerActions';
import * as tus from 'tus-js-client';
import PreviewVideo from './PreviewVideo';
import { useActiveAccount } from 'thirdweb/react';
import { Progress } from '@app/components/ui/progress';
import { Button } from '@app/components/ui/button';
import {
  Subtitles,
  Chunk,
} from '../../../lib/sdk/orbisDB/models/AssetMetadata';
import JsGoogleTranslateFree from '@kreisler/js-google-translate-free';
import { getLivepeerAudioToText } from '@app/api/livepeer/audioToText';
import { upload } from 'thirdweb/storage';
import { client } from '@app/lib/sdk/thirdweb/client';
import Link from 'next/link';
import { generateUUID } from '@app/lib/utils/crypto';

const truncateUri = (uri: string): string => {
  if (uri.length <= 30) return uri;
  return uri.slice(0, 15) + '...' + uri.slice(-15);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast('IPFS URI Copied!');
  });
};

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onFileUploaded: (fileUrl: string) => void;
  onSubtitlesUploaded: (subtitlesUri?: string) => void;
  onPressNext?: (livepeerAsset: any) => void;
  onPressBack?: () => void;
  metadata?: any;
  newAssetTitle?: string;
}

const translateText = async (
  text: string,
  language: string,
): Promise<string> => {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/livepeer/subtitles/translation`, {
      method: 'POST',
      body: JSON.stringify({
        text: text,
        source: 'English',
        target: language,
      }),
    });

    const data = await res.json();

    console.log('Translation response:', data);

    return data.response;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text if translation fails
  }
};

async function translateSubtitles(data: {
  chunks: Chunk[];
}): Promise<Subtitles> {
  const subtitles: Subtitles = {
    English: data.chunks,
  };

  const languages = ['Chinese', 'German', 'Spanish'];

  // Create a single Promise.all for all language translations to reduce nested mapping
  const translationPromises = languages.map(async (language) => {
    try {
      // Skip translation for English
      if (language === 'English') return null;
      console.log('Translating to:', language);
      // Perform translations concurrently for each chunk
      const translatedChunks = await Promise.all(
        data.chunks.map(async (chunk, i) => {
          const to =
            language === 'Chinese' ? 'zh' : language === 'German' ? 'de' : 'es';
          const translation = await JsGoogleTranslateFree.translate({
            to,
            text: chunk.text,
          }); // a
          const arr = {
            text: translation,
            timestamp: chunk.timestamp,
          };
          console.log('Translated chunk ' + i + ':', arr);
          return arr;
        }),
      );

      console.log('Translated chunks:', translatedChunks);

      return { [language]: translatedChunks };
    } catch (error) {
      console.error('Error translating subtitles:', error);
      return {};
    }
  });

  // Filter out null results and combine translations
  const translations = await Promise.all(translationPromises);
  const languageTranslations = translations.filter(Boolean);

  console.log('translations:', translations);
  console.log('Language translations:', languageTranslations);

  // Merge translations efficiently
  return languageTranslations
    .filter(
      (translation): translation is { [key: string]: Chunk[] } =>
        translation !== null,
    )
    .reduce(
      (acc, curr) => ({
        ...acc,
        ...curr,
      }),
      subtitles,
    );
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileUploaded,
  onSubtitlesUploaded,
  onPressNext,
  onPressBack,
  metadata,
  newAssetTitle,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'loading' | 'complete'
  >('idle');
  const [subtitleProcessingComplete, setSubtitleProcessingComplete] = useState<boolean>(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState<boolean>(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  const [livepeerAsset, setLivepeerAsset] = useState<any>();

  const activeAccount = useActiveAccount();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file);
    console.log('Selected file:', file?.name);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    // Disable preview while uploading
    if (uploading) {
      setError('Upload already in progress. Please wait.');
      return;
    }

    setError(null);
    setUploadState('loading');
    setProgress(0);
    setUploading(true);

    try {
      console.log('Starting upload for file:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });

      const uploadRequestResult = await getLivepeerUploadUrl(
        newAssetTitle || selectedFile.name || 'new file name',
        activeAccount?.address || 'anonymous',
      );

      setLivepeerAsset(uploadRequestResult?.asset);

      const tusUpload = new tus.Upload(selectedFile, {
        endpoint: uploadRequestResult?.tusEndpoint,
        metadata: {
          filename: selectedFile.name,
          filetype: selectedFile.type || 'video/mp4',
        },
        uploadSize: selectedFile.size,
        onError(err: any) {
          console.error('Error uploading file:', {
            error: err,
            file: {
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size
            }
          });
          setError(`Failed to upload file: ${err.message || 'Unknown error'}`);
          setUploadState('idle');
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          console.log('Uploaded ' + percentage + '%');
          setProgress(percentage);
        },
        onSuccess() {
          console.log('Upload finished:', tusUpload.url);
          setUploadState('complete');
          setUploading(false);
          setError(null);
          onFileUploaded(tusUpload?.url || '');
          toast.success('Video uploaded successfully! Generating subtitles...', {
            duration: 3000,
          });

          // Start audio-to-text processing after successful upload
          handleAudioToText();
        },
      });

      const previousUploads = await tusUpload.findPreviousUploads();
      if (previousUploads.length > 0) {
        tusUpload.resumeFromPreviousUpload(previousUploads[0]);
      }

      tusUpload.start();
    } catch (error: any) {
      console.error('Error processing file:', error);
      if (uploadState !== 'complete') {
        setError('Failed to process file. Please try again.');
        setUploadState('idle');
      }
    }
  };

  // Separate function to handle audio-to-text processing
  const handleAudioToText = async () => {
    if (!selectedFile) return;

    setIsGeneratingSubtitles(true);
    setSubtitleError(null);
    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);

      const audioToTextResponse = await getLivepeerAudioToText({
        formData,
        modelId: 'openai/whisper-large-v3',
        returnTimestamps: 'true',
      });

      if (!audioToTextResponse?.chunks) {
        throw new Error('No subtitle chunks received from the server');
      }

      const subtitles = await translateSubtitles({
        chunks: audioToTextResponse.chunks,
      });

      const ipfsUri = await upload({
        client,
        files: [subtitles],
      });

      onSubtitlesUploaded(ipfsUri);
      toast.success(
        'Subtitles generated and translated successfully! You can now proceed to the next step.',
        {
          duration: 5000,
        }
      );
      setSubtitleProcessingComplete(true);
    } catch (error: any) {
      console.error('Error generating subtitles:', error);
      const errorMessage = error?.message || 'Failed to generate subtitles';
      setSubtitleError(errorMessage);
      toast.error(
        'There was an error generating subtitles. You can try again or proceed without subtitles.',
        {
          duration: 5000,
        }
      );
      setSubtitleProcessingComplete(false);
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  const handleFinalSubmission = async () => {
    try {
      if (!livepeerAsset) {
        throw new Error('No asset data available');
      }

      // Create a serializable version of the asset
      const serializedAsset = {
        id: livepeerAsset.id,
        name: livepeerAsset.name,
        status: livepeerAsset.status,
        playbackId: livepeerAsset.playbackId,
        downloadUrl: livepeerAsset.downloadUrl,
        createdAt: livepeerAsset.createdAt,
      };

      if (onPressNext) {
        onPressNext(serializedAsset);
      }
    } catch (error: any) {
      console.error('Error completing upload:', error);
      toast.error('Failed to complete upload. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-4xl flex-col px-4 py-8">
        <div className="flex-1 rounded-lg bg-white p-6 shadow-lg sm:p-8">
          <h1 className="mb-8 text-center text-2xl font-semibold text-gray-900">Upload A File</h1>

          <div className="mx-auto max-w-2xl space-y-8">
            {/* File Input */}
            <div className="space-y-2">
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-gray-700"
              >
                Choose A File To Upload:
              </label>
              <input
                type="file"
                id="file-upload"
                accept="video/*"
                className="file:border-1 block w-full rounded-lg border border-gray-200 text-sm text-[#EC407A] file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#EC407A] hover:file:bg-gray-50"
                data-testid="file-upload-input"
                onChange={handleFileChange}
              />
            </div>

            {/* Selected File Section */}
            {selectedFile && (
              <div className="space-y-8">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Selected File</p>
                  <p className="mt-1 text-base text-gray-900">{selectedFile.name}</p>
                </div>
                
                {/* Video Preview */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  {uploading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <PreviewVideo video={selectedFile} />
                  )}
                </div>
                
                {/* Upload Controls */}
                <div className="flex flex-col items-center space-y-4">
                  {uploadState === 'idle' ? (
                    <button
                      onClick={handleFileUpload}
                      disabled={!selectedFile}
                      className={`${
                        !selectedFile
                          ? 'cursor-not-allowed bg-[#D63A6A] opacity-50'
                          : 'bg-[#EC407A] hover:bg-[#D63A6A]'
                      } w-full max-w-xs rounded-lg px-6 py-3 font-semibold text-white shadow-sm transition-colors sm:w-auto`}
                      data-testid="file-input-upload-button"
                    >
                      Upload File
                    </button>
                  ) : (
                    <div className="w-full max-w-md space-y-2">
                      <Progress
                        value={progress}
                        max={100}
                        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                      >
                        <div
                          className="h-full bg-[#EC407A] transition-all duration-500 ease-in-out"
                          style={{ width: `${progress}%` }}
                        />
                      </Progress>
                      <p className="text-center text-sm text-gray-600">
                        {uploadState === 'complete'
                          ? 'Upload Complete!'
                          : `${progress}% uploaded`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Status and Subtitles Generation */}
            {(uploadState === 'complete' || isGeneratingSubtitles || subtitleError) && (
              <div className={`mt-4 rounded-lg border p-4 ${
                subtitleError 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex flex-col items-center space-y-3">
                  {isGeneratingSubtitles ? (
                    <>
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p className="text-sm font-medium">Generating subtitles...</p>
                      </div>
                      <p className="text-xs text-gray-500">This may take a few minutes depending on the video length</p>
                    </>
                  ) : subtitleError ? (
                    <div className="flex flex-col items-center space-y-2">
                      <p className="flex items-center space-x-2 text-sm font-medium text-red-600">
                        <span>⚠️</span>
                        <span>Failed to generate subtitles</span>
                      </p>
                      <p className="text-xs text-red-500">{subtitleError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAudioToText}
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : subtitleProcessingComplete ? (
                    <p className="flex items-center space-x-2 text-sm font-medium text-green-600">
                      <span>✓</span>
                      <span>Subtitles generated successfully!</span>
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {uploadedUri && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span>File uploaded successfully! IPFS URI:</span>
                  <Link
                    href={uploadedUri}
                    target="_blank"
                    className="text-green-600 underline hover:text-green-800"
                  >
                    {truncateUri(uploadedUri)}
                  </Link>
                  <button
                    onClick={() => copyToClipboard(uploadedUri)}
                    className="inline-flex items-center gap-1 rounded-md p-1 text-green-600 hover:bg-green-100 hover:text-green-800"
                  >
                    <CopyIcon className="h-4 w-4" />
                    <span className="text-xs">Copy</span>
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {onPressBack && (
            <Button
              variant="outline"
              disabled={uploadState === 'loading'}
              onClick={onPressBack}
              className="min-w-[100px]"
            >
              Back
            </Button>
          )}
          {onPressNext && (
            <Button
              disabled={uploadState !== 'complete' || (isGeneratingSubtitles && !subtitleError)}
              onClick={handleFinalSubmission}
              className="min-w-[100px]"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

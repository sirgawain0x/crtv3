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
  onFileUploaded: (fileUrl: string) => void; // Callback to send the uploaded file URL back
  onPressNext: (livePeerAssetId: string) => void;
  onPressBack: () => void;
  newAssetTitle: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileUploaded,
  onPressNext,
  onPressBack,
  newAssetTitle,
}) => {
  // Destructure onFileUploaded
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'loading' | 'complete'
  >('idle');

  const [livePeerUploadedAssetId, setLivePeerUploadedAssetId] =
    useState<string>();

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

      const upload = new tus.Upload(selectedFile, {
        endpoint: uploadRequestResult?.tusEndpoint, // URL from `tusEndpoint` field in the
        metadata: {
          filename: selectedFile.name,
          filetype: 'video/*',
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
          console.log('Upload finished:', upload.url);
          setUploadState('complete');
          // Call onFileUploaded here with the upload URL
          onFileUploaded(upload?.url || '');
        },
      });

      const previousUploads = await upload.findPreviousUploads();

      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please try again.');
      setUploadState('idle');
    }
  };

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
        <Button disabled={uploadState === 'loading'} onClick={onPressBack}>
          Back
        </Button>
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
      </div>
    </div>
  );
};

export default FileUpload;

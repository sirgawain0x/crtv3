'use client';

import React, { useState } from 'react';
import * as tus from 'tus-js-client'; // Import the tus client

interface FileUploadProps {
  onFileSelect: (file: File | null) => void; // {{ edit_5 }}
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file); // Notify parent component of the selected file
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Step 1: Request upload URL from your backend
      const response = await fetch('/api/asset/request-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          filetype: selectedFile.type,
        }),
      });

      const { tusEndpoint } = await response.json(); // Get the tusEndpoint from the response

      // Step 2: Initialize the tus upload
      const upload = new tus.Upload(selectedFile, {
        endpoint: tusEndpoint, // Use the endpoint from the response
        metadata: {
          filename: selectedFile.name,
          filetype: selectedFile.type,
        },
        onError(err) {
          console.error('Error uploading file:', err);
          setError('Error uploading file: ' + err.message);
          setUploading(false);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          console.log('Uploaded ' + percentage + '%');
        },
        onSuccess() {
          console.log('Upload finished:', upload.url);
          setUploadedUri(upload.url); // Save the uploaded URI
          onFileSelect(selectedFile); // Notify parent component of the uploaded file
          setUploading(false);
        },
      });

      // Step 3: Resume previous uploads if any
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      // Step 4: Start the upload
      upload.start();
    } catch (err) {
      setError('Error requesting upload URL: ' + (err as Error).message);
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-[#1a1c1f] px-4 py-10">
      <div className="w-full rounded-lg p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-semibold text-gray-200">
          Upload A File
        </h1>

        {/* File Input */}
        <div className="mb-6">
          <label
            htmlFor="file-upload"
            className="mb-2 block text-sm font-medium text-gray-400"
          >
            Choose A File To Upload:
          </label>
          <input
            type="file"
            id="file-upload"
            accept="video/*"
            className="block w-full text-sm
                       text-[#EC407A] file:mr-4 file:rounded-full
                       file:border-0 file:bg-white
                       file:px-4 file:py-2
                       file:text-sm file:font-semibold
                       file:text-[#EC407A] hover:file:bg-gray-200"
            onChange={handleFileChange}
          />
          {/* Display selected file name */}
          {selectedFile && (
            <p className="mt-2 text-gray-300">
              Selected file: {selectedFile.name}
            </p>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
            className={`${
              uploading
                ? 'cursor-not-allowed bg-[#D63A6A]' // Change disabled color if needed
                : 'bg-[#EC407A] hover:bg-[#D63A6A]' // Change button color
            } cursor-pointer rounded-lg px-4 py-2 font-semibold text-white`}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
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
                className="text-green-500 underline"
              >
                {uploadedUri}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;

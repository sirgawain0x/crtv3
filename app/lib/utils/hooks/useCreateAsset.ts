import { useState, useCallback } from 'react';
import * as tus from 'tus-js-client';

const useTusUpload = (tusEndpoint: string) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const upload = new tus.Upload(file, {
        endpoint: tusEndpoint,
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        uploadSize: file.size,
        onError(err) {
          console.error('Error uploading file:', err);
          setUploadError(err.message);
          setIsUploading(false);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          console.log('Uploaded ' + percentage + '%');
          setUploadProgress(Number(percentage)); // Convert percentage to a number
        },
        onSuccess() {
          console.log('Upload finished:', upload.url);
          setUploadUrl(upload.url);
          setIsUploading(false);
        },
      });

      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      upload.start();
    },
    [tusEndpoint],
  );

  return {
    uploadFile,
    uploadProgress,
    uploadError,
    uploadUrl,
    isUploading,
  };
};

export default useTusUpload;
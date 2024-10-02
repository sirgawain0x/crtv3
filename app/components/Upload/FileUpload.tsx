import React, { useState } from "react";
import { ThirdwebStorage } from "@thirdweb-dev/storage";

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Access API keys from environment variables
      const storage = new ThirdwebStorage({
        clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
         
      });

      // Upload the file to IPFS
      const uri = await storage.upload(selectedFile);

      setUploadedUri(uri);
    } catch (err) {
      setError("Error uploading file: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Upload a File
        </h1>

        {/* File Input */}
        <div className="mb-6">
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Choose a file to upload:
          </label>
          <input
            type="file"
            id="file-upload"
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-600
                       hover:file:bg-indigo-100"
            onChange={handleFileChange}
          />
        </div>

        {/* Upload Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
            className={`${
              uploading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white py-2 px-4 rounded-lg font-semibold`}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 mt-4">{error}</p>}

        {/* Success Message */}
        {uploadedUri && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-700">
              File uploaded successfully! IPFS URI:{" "}
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
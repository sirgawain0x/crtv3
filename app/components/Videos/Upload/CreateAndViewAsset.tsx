'use client';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import Image from 'next/image';
import React, { useState, useRef } from 'react';
import { BiCloud, BiMusic, BiPlus } from 'react-icons/bi';
import { NewAssetPayload } from 'livepeer/models/components';
import { useActiveAccount } from 'thirdweb/react';
import { Asset } from 'livepeer/sdk/asset';
import { polygon } from 'thirdweb/chains';
import { client } from '@app/lib/sdk/thirdweb/client';
import { upload } from 'thirdweb/storage';

import {
  deploySplitContract,
  prepareDeterministicDeployTransaction,
  deployERC1155Contract,
} from 'thirdweb/deploys';
import { uploadAssetByURL } from '@app/lib/utils/fetchers/livepeer/livepeerApi';
import { ACCOUNT_FACTORY_ADDRESS } from '@app/lib/utils/context';
import { Livepeer } from 'livepeer';
import { toast } from 'sonner'; // Add this import for error notifications
import FileUpload from './FileUpload';
import PreviewVideo from './PreviewVideo'; // {{ edit_1 }}

export default function Upload() {
  // Creating state for the input field
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [thumbnail, setThumbnail] = useState<File | string>('');
  const [video, setVideo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  //  Creating a ref for thumbnail and video
  const thumbnailRef = useRef();
  const videoRef = useRef<HTMLInputElement | null>(null); // Create a ref for the video input

  const chain = polygon;
  const activeAccount = useActiveAccount();
  const goBack = () => {
    window.history.back();
  };

  const createAsset = async (e: NewAssetPayload, type: string) => {
    try {
      setIsUploading(true);
      const output = await fullLivepeer.asset.create(e);
      let cid = output?.data;
      if (type == 'thumbnail') {
        setThumbnail(cid?.asset?.storage?.ipfs?.nftMetadata?.cid || '');
      } else {
        setVideo(output?.data?.tusEndpoint || '');
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      toast.error('Failed to create asset. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadToURL = async () => {
    const upload = await uploadAssetByURL(video, 'video');
    console.log('upload', upload);
    return upload;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const data = {
        video,
        title,
        description,
        location,
        category,
        thumbnail,
        UploadedDate: Date.now(),
      };
      const collabs: string[] = [];
      const shares: bigint[] = [];

      await uploadToURL();
      const splits = await getSplits(collabs, shares);
      const videoAddress = await determineVideoAddress();
      const videoNFT = await generateVideoNFT(description, title, video);

      // Handle successful submission
      toast.success('Video uploaded successfully!');
      // Optionally, redirect or clear form
    } catch (error) {
      console.error('Error submitting video:', error);
      toast.error('Failed to upload video. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!description.trim()) {
      toast.error('Please enter a description');
      return false;
    }
    if (!video) {
      toast.error('Please upload a video');
      return false;
    }
    // Add more validation as needed
    return true;
  };

  const getSplits = async (collabs: string[], shares: bigint[]) => {
    const splits = await deploySplitContract({
      chain: chain,
      client: client,
      account: activeAccount,
      params: {
        name: 'Split Contract',
        payees: [activeAccount?.address, ...collabs],
        shares: [1000n, ...shares],
      },
    });
    console.log('splits', splits);
    return splits;
  };

  const determineVideoAddress = async () => {
    const tx = prepareDeterministicDeployTransaction({
      client: client,
      chain: chain,
      contractId: ACCOUNT_FACTORY_ADDRESS.polygon,
      constructorParams: [],
    });
    console.log('tx', tx);
    return tx;
  };

  const generateVideoNFT = async (
    description: string,
    name: string,
    image: string,
  ) => {
    const videoNFT = await deployERC1155Contract({
      chain: chain,
      client: client,
      account: activeAccount,
      type: 'DropERC1155',
      params: {
        name: name,
        image: image,
        description: description,
        symbol: 'CRTVV',
      },
    });
    console.log('videoNFT', videoNFT);
    return videoNFT;
  };

  const handleReplaceVideo = () => {
    if (videoRef.current) {
      videoRef.current.click(); // Trigger the file input click
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex justify-end">
        <div className="flex items-center">
          <button
            className="mr-4 rounded-lg border border-[#EC407A] bg-transparent px-4 py-2 hover:border-[#A6335A] focus:border-[#A6335A]"
            onClick={goBack}
          >
            Discard
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || isSubmitting}
            className="flex items-center rounded-lg bg-[#EC407A] px-4 py-2 text-white hover:bg-[#A6335A] focus:bg-[#A6335A] disabled:opacity-50"
          >
            {isSubmitting ? (
              'Uploading...'
            ) : (
              <>
                <BiCloud className="mr-2" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="mb-4 flex w-full flex-col lg:w-3/4">
          <label htmlFor="title" className="text-sm">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Rick Astley - Never Gonna Give You Up (Official Music Video)"
            className="mt-2 h-12 w-full rounded-md border border-[#444752] p-2 placeholder:text-gray-600 focus:outline-none"
            required
          />
          <label className="mt-10">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Never Gonna Give You Up was a global smash on its release in July 1987, topping the charts in 25 countries including Rick's native UK and the US Billboard Hot 100.  It also won the Brit Award for Best single in 1988. Stock Aitken and Waterman wrote and produced the track which was the lead-off single and lead track from Rick's debut LP "
            className="mt-2 h-32 w-full rounded-md border border-[#444752] p-2 placeholder:text-gray-600 focus:outline-none"
          />

          <div className="mt-10 flex w-full flex-col justify-between lg:flex-row">
            <div className="mb-4 flex w-full flex-col lg:mb-0 lg:w-2/5">
              <label className="text-sm">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                type="text"
                placeholder="Bali - Indonesia"
                className="mt-2 h-12 w-full rounded-md border border-[#444752] p-2 placeholder:text-gray-600 focus:outline-none"
              />
            </div>
            <div className="flex w-full flex-col lg:w-2/5">
              <label className="text-sm">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 h-12 w-full rounded-md border border-[#444752] p-2 text-gray-600 placeholder:text-gray-600 focus:outline-none"
              >
                <option>Music</option>
                <option>Sports</option>
                <option>Gaming</option>
                <option>News</option>
                <option>Entertainment</option>
                <option>Education</option>
                <option>Science & Technology</option>
                <option>Travel</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <label className="mt-10 text-sm">Thumbnail</label>

          <div
            onClick={() => {
              thumbnailRef?.current;
            }}
            className="mt-2 flex h-36 w-64 items-center justify-center rounded-md border-2 border-dashed border-gray-600 p-2"
          >
            {thumbnail ? (
              <Image
                onClick={() => {
                  thumbnailRef?.current;
                }}
                src={''}
                alt="thumbnail"
                className="h-full rounded-md"
              />
            ) : (
              <BiPlus size={40} />
            )}
          </div>

          <input
            type="file"
            className="hidden"
            //ref={}
            onChange={(e) => {
              const file = e?.target?.files ? e.target.files[0] : null;
              if (file) {
                setThumbnail(file);
                //Upload to IPFS
                upload({
                  client: client,
                  files: [
                    {
                      name: 'thumbnail',
                      data: file,
                      type: 'image/png',
                    },
                  ],
                });
              }
            }}
          />
        </div>

        <div className="mx-auto flex w-full flex-col items-center justify-center pl-4 lg:w-96">
          <div
            onClick={() => {
              videoRef?.current;
            }}
            className={`flex h-auto w-full items-center justify-center rounded-md ${videoFile ? '' : 'border-2 border-dashed border-gray-600'}`}
          >
            {videoFile ? (
              <PreviewVideo video={videoFile} />
            ) : (
              <FileUpload onFileSelect={setVideoFile} />
            )}
          </div>
          {videoFile && (
            <div className="mb-4 flex justify-end">
              <div className="flex items-center">
                <button
                  onClick={handleReplaceVideo}
                  className="m-2 rounded-sm border border-[#EC407A] px-4 py-2 text-white hover:border-[#A6335A] focus:border-[#A6335A]"
                >
                  Replace
                </button>
                <button
                  onClick={() => createAsset(videoFile, 'video')}
                  className="m-2 rounded-sm border border-[#A6335A] bg-[#EC407A] px-4 py-2 text-white hover:bg-[#A6335A] focus:bg-[#A6335A]"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        className="hidden"
        accept="video/*"
        ref={videoRef}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          if (file) {
            setVideoFile(file);
          }
        }}
      />
    </div>
  );
}

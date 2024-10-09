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
import FileUpload from '@app/components/Upload/FileUpload';

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

  //  Creating a ref for thumbnail and video
  const thumbnailRef = useRef();
  const videoRef = useRef();

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

  //   const saveVideo = async (data) => {
  //     let contract = await getContract();
  //     await contract.uploadVideo(
  //       data.video,
  //       data.title,
  //       data.description,
  //       data.location,
  //       data.category,
  //       data.thumbnail,
  //       false,
  //       data.UploadedDate,
  //     );
  //   };

  return (
    <div className="flex h-screen w-full flex-row bg-[#1a1c1f]">
      <div className="flex flex-1 flex-col">
        <div className="mr-10 mt-5 flex justify-end">
          <div className="flex items-center">
            <button
              className="mr-6 rounded-lg border border-gray-600 bg-transparent px-6 py-2 text-[#9CA3AF]"
              onClick={goBack}
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={isUploading || isSubmitting}
              className="flex flex-row items-center justify-between rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Uploading...'
              ) : (
                <>
                  <BiCloud />
                  <p className="ml-2">Upload</p>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="m-10 mt-5 flex     flex-col  lg:flex-row">
          <div className="flex flex-col lg:w-3/4 ">
            <label htmlFor="title" className="text-sm text-[#9CA3AF]">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rick Astley - Never Gonna Give You Up (Official Music Video)"
              className="mt-2 h-12 w-[90%] rounded-md border border-[#444752] bg-[#1a1c1f] p-2 text-white placeholder:text-gray-600 focus:outline-none"
              required
            />
            <label className="mt-10 text-[#9CA3AF]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Never Gonna Give You Up was a global smash on its release in July 1987, topping the charts in 25 countries including Rick’s native UK and the US Billboard Hot 100.  It also won the Brit Award for Best single in 1988. Stock Aitken and Waterman wrote and produced the track which was the lead-off single and lead track from Rick’s debut LP “Whenever You Need Somebody."
              className="mt-2 h-32 w-[90%] rounded-md  border border-[#444752] bg-[#1a1c1f] p-2  text-white placeholder:text-gray-600 focus:outline-none"
            />

            <div className="mt-10 flex w-[90%] flex-row  justify-between">
              <div className="flex w-2/5 flex-col    ">
                <label className="text-sm  text-[#9CA3AF]">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  type="text"
                  placeholder="Bali - Indonesia"
                  className="mt-2 h-12 w-[90%]  rounded-md border border-[#444752] bg-[#1a1c1f] p-2  text-white placeholder:text-gray-600 focus:outline-none"
                />
              </div>
              <div className="flex w-2/5 flex-col    ">
                <label className="text-sm  text-[#9CA3AF]">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 h-12 w-[90%]  rounded-md border border-[#444752] bg-[#1a1c1f] p-2  text-white placeholder:text-gray-600 focus:outline-none"
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
            <label className="mt-10  text-sm text-[#9CA3AF]">Thumbnail</label>

            <div
              onClick={() => {
                thumbnailRef?.current;
              }}
              className="mt-2 flex h-36  w-64 items-center justify-center rounded-md  border-2 border-dashed border-gray-600 p-2"
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
                <BiPlus size={40} color="gray" />
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

          <div
            onClick={() => {
              videoRef?.current;
            }}
            className={
              video
                ? ' flex   h-64  w-96 items-center justify-center rounded-md'
                : 'mt-8 flex  h-64 w-96 items-center justify-center   rounded-md border-2 border-dashed border-gray-600'
            }
          >
            {video ? (
              <video
                controls
                // Get Playback Sources
                src={''}
                className="h-full rounded-md"
              />
            ) : (

                <FileUpload/>
            )}
          </div>
        </div>
        <input
          type="file"
          className="hidden"
          //ref={videoRef}
          accept={'video/*'}
          onChange={(e) => {
            //setVideo(e?.target?.files[0]);
            //console.log(e?.target?.files[0]);
          }}
        />
      </div>
    </div>
  );
}
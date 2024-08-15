'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import PlayerCardComponent from '../Player/Player';
import { SITE_LOGO } from '../../lib/utils/context';
import { GetAssetsResponse } from 'livepeer/models/operations';
import { Asset } from 'livepeer/models/components';
import Link from 'next/link';
import { getSrc } from '@livepeer/react/external';
import { fetchAllAssets } from '@app/api/livepeer/actions';

const VideoCardGrid: React.FC = () => {
  // State variables to manage fetched video data, loading, and error states.
  const [playbackSources, setPlaybackSources] = useState<
    GetAssetsResponse['data'] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect hook to fetch video data when the component mounts.
  useEffect(() => {
    const fetchSources = async () => {
      try {
        // Fetch all video assets from the Livepeer API.
        const response = await fetchAllAssets();
        if (response && Array.isArray((response as GetAssetsResponse).data)) {
          setPlaybackSources((response as GetAssetsResponse).data); // Update state with the data array.
        } else {
          setPlaybackSources([]); // Handle case where data is not an array.
        }
      } catch (err) {
        console.error('Error fetching playback sources:', err);
        setError('Failed to load videos.'); // Set error message if fetching fails.
      } finally {
        setLoading(false); // Stop loading indicator once fetching is done.
      }
    };

    fetchSources(); // Call the async function to fetch data.
  }, []); // Empty dependency array ensures this runs only once when component mounts.

  // Conditional rendering: Display loading, error, or the video grid based on state.
  if (loading) {
    return <p>Loading videos...</p>; // Show loading message while fetching data.
  }

  if (error) {
    return <p>{error}</p>; // Show error message if fetching fails.
  }

  if (!playbackSources || playbackSources.length === 0) {
    return <p>No videos available.</p>; // Show message if no videos are available.
  }

  // Render the video cards in a responsive grid layout.
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {playbackSources.map((asset: Asset) => (
          <div key={asset.id}>
            <Card className={cn('w-[380px]')}>
              <div className="mx-auto flex-1 flex-wrap">
                <Avatar>
                  <AvatarImage src={SITE_LOGO} />{' '}
                  {/* Display the site logo or fallback text */}
                  <AvatarFallback>Creative</AvatarFallback>
                </Avatar>
                <CardHeader>
                  <CardTitle>Creator</CardTitle>{' '}
                  {/* Display the creator's name */}
                  <CardDescription>{asset.creatorId?.value}</CardDescription>
                </CardHeader>
              </div>
              <PlayerCardComponent src={getSrc(asset.playbackId)} />{' '}
              {/* Video player component */}
              <CardContent>
                <div className="flex">
                  <Badge
                    className={
                      asset.status?.phase === 'ready' ? 'bg-green' : 'bg-red'
                    }
                  >
                    {asset.status?.phase}{' '}
                    {/* Display the status of the video (ready, etc.) */}
                  </Badge>
                  <div className="space-y-4" />
                  <p>Views: </p> {/* Placeholder for views count */}
                </div>
                <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3">
                  <header className="text-lg">{asset.name}</header>{' '}
                  {/* Display the video name */}
                  <div className="space-y-4" />
                  <p className="text-xl" color={'brand.300'}>
                    <span style={{ fontSize: 'sm' }}>{'USDC'}</span>{' '}
                    {/* Placeholder for currency */}
                  </p>
                  <p>
                    With Creative TV, we wanted to sync the speed of creation
                    with the speed of design. We wanted the creator to be just
                    as excited as the designer to create new content.{' '}
                    {/* Descriptive text */}
                  </p>
                </div>
              </CardContent>
              <hr />
              <CardFooter className="flex-wrap justify-between">
                {asset.status?.phase === 'ready' ? (
                  <div className="mb-5 space-x-10">
                    <Link
                      href={`discover/${encodeURIComponent(asset.id)}`}
                      passHref
                    >
                      <Button
                        className="flex-1 cursor-pointer hover:scale-105"
                        aria-label={`Comment on ${asset.name}`}
                        variant="ghost"
                      >
                        Comment {/* Comment button for ready videos */}
                      </Button>
                    </Link>
                    <Button
                      className="flex-1 cursor-pointer hover:scale-105"
                      aria-label={`Share ${asset.name}`}
                      variant="ghost"
                    >
                      Share {/* Share button for ready videos */}
                    </Button>
                  </div>
                ) : (
                  <></> // No buttons if the video is not ready.
                )}
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoCardGrid;

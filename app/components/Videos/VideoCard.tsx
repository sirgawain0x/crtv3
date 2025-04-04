'use client';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Avatar, AvatarImage } from '../ui/avatar';
import {
  AccountProvider,
  AccountAvatar,
  AccountName,
  AccountAddress,
} from 'thirdweb/react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { shortenAddress } from 'thirdweb/utils';
import { PlayerComponent } from '../Player/Player';
import { Asset } from 'livepeer/models/components';
import Link from 'next/link';
import { Src } from '@livepeer/react';
import makeBlockie from 'ethereum-blockies-base64';
import VideoViewMetrics from './VideoViewMetrics';
import { useVideo } from '@app/context/VideoContext';
import { useRef, useEffect } from 'react';

interface VideoCardProps {
  asset: Asset;
  playbackSources: Src[] | null;
}

const VideoCard: React.FC<VideoCardProps> = ({ asset, playbackSources }) => {
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Stop playing if another video starts
    if (currentPlayingId && currentPlayingId !== asset?.id) {
      const videoElement = playerRef.current?.querySelector('video');
      if (videoElement) {
        try {
          videoElement.pause();
        } catch (error) {
          console.error('Error pausing video:', error);
        }
      }
    }

    // Cleanup function to pause video when component unmounts
    return () => {
      const videoElement = playerRef.current?.querySelector('video');
      if (videoElement && !videoElement.paused) {
        try {
          videoElement.pause();
          if (currentPlayingId === asset?.id) {
            setCurrentPlayingId(null);
          }
        } catch (error) {
          console.error('Error cleaning up video:', error);
        }
      }
    };
  }, [currentPlayingId, asset?.id, setCurrentPlayingId]);

  const handlePlay = () => {
    try {
      setCurrentPlayingId(asset?.id || null);
    } catch (error) {
      console.error('Error setting current playing ID:', error);
    }
  };

  // Early return if asset is not provided or invalid
  if (!asset) {
    console.warn('VideoCard: No asset provided');
    return null;
  }

  // Early return if asset is not ready
  if (asset.status?.phase !== 'ready') {
    console.debug(
      `VideoCard: Asset ${asset.id} not ready, status: ${asset.status?.phase}`,
    );
    return null;
  }

  const address = asset.creatorId?.value as string;
  if (!address) {
    console.warn(`VideoCard: No creator address for asset ${asset.id}`);
    return null;
  }

  console.log({ asset, playbackSources });

  return (
    <div className="mx-auto" ref={playerRef}>
      <Card key={asset?.id} className={cn('w-[360px] overflow-hidden')}>
        <div className="mx-auto flex-1 flex-wrap">
          <CardHeader>
            <AccountProvider address={address} client={client}>
              <div className="flex items-center space-x-2">
                <AccountAvatar
                  className="h-10 w-10 rounded-full"
                  loadingComponent={
                    <Avatar>
                      <AvatarImage
                        src={makeBlockie(address)}
                        className="h-10 w-10 rounded-full"
                      />
                    </Avatar>
                  }
                  fallbackComponent={
                    <Avatar>
                      <AvatarImage
                        src={makeBlockie(address)}
                        className="h-10 w-10 rounded-full"
                      />
                    </Avatar>
                  }
                />
                <div className="flex flex-col">
                  <AccountName className="text-sm font-medium" />
                  <AccountAddress
                    className="text-xs text-gray-500"
                    formatFn={shortenAddress}
                  />
                </div>
              </div>
            </AccountProvider>
          </CardHeader>
        </div>
        <PlayerComponent
          src={playbackSources}
          assetId={asset?.id}
          title={asset?.name}
          onPlay={handlePlay}
        />
        <CardContent>
          <div className="my-2 flex items-center justify-between">
            <Badge
              className={asset.status?.phase === 'ready' ? 'black' : 'white'}
            >
              {asset?.status?.phase}
            </Badge>
            <VideoViewMetrics playbackId={asset.playbackId || ''} />
          </div>
          <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3 overflow-hidden">
            <CardTitle>
              <Link href={`/discover/${asset.id}`} passHref>
                <h1 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold hover:text-orange-500 focus:text-orange-500">
                  {asset?.name}
                </h1>
              </Link>
            </CardTitle>
            <CardDescription className="text-xl" color={'brand.300'}>
              <span className="text-xs">
                {asset?.createdAt
                  ? new Date(asset.createdAt).toLocaleDateString()
                  : ''}
              </span>
            </CardDescription>
          </div>
        </CardContent>
        <hr className="mb-5" />
        <CardFooter className="mx-auto flex items-center justify-center">
          {asset?.status?.phase === 'ready' ? (
            <div className="flex space-x-10">
              <Button
                className="flex-1 cursor-pointer hover:scale-125"
                aria-label={`Buy ${asset?.name}`}
                variant="ghost"
              >
                Buy
              </Button>
              <Link
                href={`/discover/${encodeURIComponent(asset?.id)}`}
                passHref
              >
                <Button
                  className="flex-1 cursor-pointer hover:scale-125"
                  aria-label={`Comment on ${asset?.name}`}
                  variant="ghost"
                >
                  Comment
                </Button>
              </Link>
              <Button
                className="flex-1 cursor-pointer hover:scale-125"
                aria-label={`Share ${asset?.name}`}
                variant="ghost"
              >
                Share
              </Button>
            </div>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
};

export default VideoCard;

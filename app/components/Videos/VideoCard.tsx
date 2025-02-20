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
  metadata: any;
}

const VideoCard: React.FC<VideoCardProps> = ({
  asset,
  playbackSources,
  metadata,
}) => {
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Stop playing if another video starts
    if (currentPlayingId && currentPlayingId !== asset?.id) {
      const videoElement = playerRef.current?.querySelector('video');
      if (videoElement) {
        videoElement.pause();
      }
    }
  }, [currentPlayingId, asset?.id]);

  const handlePlay = () => {
    setCurrentPlayingId(asset?.id || null);
  };

  console.log({ asset, playbackSources });
  // Only render the card if the asset is ready
  if (asset?.status?.phase !== 'ready') {
    return null;
  }

  const address = asset?.creatorId?.value as string;

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
          <div className="p-4">
            <h3 className="mb-2 text-lg font-semibold">
              {metadata?.title || asset.name || 'Untitled Video'}
            </h3>
            {metadata?.description && (
              <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                {metadata.description}
              </p>
            )}
            {metadata?.category && (
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                {metadata.category}
              </span>
            )}
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <span>
                {asset.createdAt
                  ? new Date(asset.createdAt).toLocaleDateString()
                  : ''}
              </span>
              {metadata?.location && (
                <span className="flex items-center gap-1">
                  📍 {metadata.location}
                </span>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3 overflow-hidden">
            <div className="space-y-2" />
            <p className="text-xl" color={'brand.300'}>
              <span style={{ fontSize: 'sm' }}>{'USDC'}</span>
            </p>
          </div>
          <Link href={`/discover/${asset.id}`} passHref>
            <h1 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-right text-xl font-bold hover:text-orange-500 focus:text-orange-500">
              {'View More'}
            </h1>
          </Link>
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
              <Link href={`discover/${encodeURIComponent(asset?.id)}`} passHref>
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

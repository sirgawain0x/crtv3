'use client';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import { OrbisPlayer } from '../../Player/OrbisPlayer';
import { Asset } from 'livepeer/models/components';
import Link from 'next/link';
import { Src } from '@livepeer/react';
import VideoViewMetrics from '../VideoViewMetrics';
import { useVideo } from '@app/context/VideoContext';
import { useEffect, useRef } from 'react';
import { db } from '@app/lib/sdk/orbisDB/client';

interface VideoCardProps {
  asset: Asset;
  playbackSources: Src[] | null;
}

const VideoCard: React.FC<VideoCardProps> = ({ asset, playbackSources }) => {
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const playerRef = useRef<HTMLDivElement>(null);
  const playerId = useRef(Math.random().toString(36).substring(7)).current;

  useEffect(() => {
    const fetchMetadata = async () => {
      const { rows } = await db
        .select()
        .from(process.env.NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID as string)
        .context(process.env.NEXT_PUBLIC_ORBIS_CRTV_VIDEOS_CONTEXT_ID as string)
        .run();

      //console.log('All Orbis videos:', rows);
    };

    if (asset?.id) {
      fetchMetadata();
    }
  }, [asset?.id]);

  useEffect(() => {
    // Stop playing if another video starts
    if (currentPlayingId && currentPlayingId !== asset?.id) {
      const videoElement = playerRef.current?.querySelector('video');
      if (videoElement) {
        videoElement.pause();
      }
    }
  }, [currentPlayingId, asset?.id]);

  //console.log({ asset, playbackSources });
  // Only render the card if the asset is ready and has a playbackId
  if (asset?.status?.phase !== 'ready' || !asset.playbackId) {
    return null;
  }

  return (
    <div className="mx-auto" ref={playerRef}>
      <Card key={asset.id} className={cn('w-[360px] overflow-hidden')}>
        <div className="mx-auto flex-1 flex-wrap">
          <CardHeader>
            <CardTitle>
              <Link href={`/discover/${asset.id}`} passHref>
                <h1 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold hover:text-orange-500 focus:text-orange-500">
                  {asset.name}
                </h1>
              </Link>
            </CardTitle>
          </CardHeader>
        </div>
        <OrbisPlayer
          playerId={playerId}
          currentPlayingId={currentPlayingId}
          playbackId={asset.playbackId}
          className="w-full"
        />
        <CardContent>
          <div className="my-2 flex items-center justify-between">
            <Badge
              className={asset.status?.phase === 'ready' ? 'black' : 'white'}
            >
              {asset.status?.phase}
            </Badge>
            <VideoViewMetrics playbackId={asset.playbackId} />
          </div>
          <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3 overflow-hidden">
            {/* <CardDescription className="text-xl" color={'brand.300'}>
              <span style={{ fontSize: 'sm' }}>
                {asset?.createdAt
                  ? new Date(asset.createdAt).toLocaleDateString()
                  : ''}
              </span>
            </CardDescription> */}
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

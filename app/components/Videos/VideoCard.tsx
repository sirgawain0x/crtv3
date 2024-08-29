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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { shortenHex } from 'thirdweb/utils';
import { PlayerComponent } from '../Player/Player';
import { Asset, ViewershipMetric } from 'livepeer/models/components';
import Link from 'next/link';
import { Src } from '@livepeer/react';
import makeBlockie from 'ethereum-blockies-base64';

interface VideoCardProps {
  asset: Asset;
  playbackSources: Src[] | null;
}

const VideoCard: React.FC<VideoCardProps> = ({ asset, playbackSources }) => {
  //console.log('Video Card Asset Data:', asset);
  return (
    <div className="mx-auto">
      {asset?.status?.phase === 'ready' && (
        <Card key={asset?.id} className={cn('w-[380px]')}>
          <div className="mx-auto flex-1 flex-wrap">
            <CardHeader>
              <Avatar>
                <AvatarImage src={makeBlockie(`${asset?.creatorId?.value}`)} />
                <AvatarFallback>CRTV</AvatarFallback>
              </Avatar>
              <CardTitle>Creator</CardTitle>
              <CardDescription>
                {shortenHex(`${asset.creatorId?.value}`)}
              </CardDescription>
            </CardHeader>
          </div>
          <PlayerComponent
            src={playbackSources} // Use the detailed playback sources here
            title={asset.name}
          />
          <CardContent>
            <div className="my-2 flex items-center justify-between">
              <Badge
                className={asset.status?.phase === 'ready' ? 'black' : 'white'}
              >
                {asset?.status?.phase}
              </Badge>
              <p className="p-2">Views:</p>
            </div>
            <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3 overflow-hidden">
              <h1 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold">
                {asset?.name}
              </h1>
              <div className="space-y-4" />
              <p className="text-xl" color={'brand.300'}>
                <span style={{ fontSize: 'sm' }}>{'USDC'}</span>
              </p>
              <p>
                With Creative TV, we wanted to sync the speed of creation with
                the speed of design. We wanted the creator to be just as excited
                as the designer to create new content.
              </p>
            </div>
          </CardContent>
          <hr className="mb-5" />
          <CardFooter className="mx-auto flex items-center justify-center">
            {asset?.status?.phase === 'ready' ? (
              <div className="flex space-x-10">
                <Link
                  href={`discover/${encodeURIComponent(asset?.id)}`}
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
      )}
    </div>
  );
};

export default VideoCard;

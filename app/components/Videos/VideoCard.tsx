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
import PlayerCardComponent from '../Player/Player';
import { SITE_LOGO } from '../../lib/utils/context';
import { Asset } from 'livepeer/models/components';
import Link from 'next/link';
import { getSrc } from '@livepeer/react/external';

interface VideoCardProps {
  className?: string;
  assetData: Asset; // Change to Asset instead of AssetData
}

const VideoCard: React.FC<VideoCardProps> = ({ className, ...props }) => {
  console.log('Video Card Asset Data:', props?.assetData);
  return (
    <>
      <Card
        key={props?.assetData?.id}
        className={cn('w-[380px]', className)}
        {...props}
      >
        <div className="mx-auto flex-1 flex-wrap">
          <Avatar>
            <AvatarImage src={SITE_LOGO} />
            <AvatarFallback>Creative</AvatarFallback>
          </Avatar>
          <CardHeader>
            <CardTitle>Creator</CardTitle>
            <CardDescription>
              {props?.assetData.creatorId?.value}
            </CardDescription>
          </CardHeader>
        </div>
        <PlayerCardComponent src={getSrc(props?.assetData.playbackId)} />
        <CardContent>
          <div className="flex">
            <Badge
              className={
                props?.assetData.status?.phase === 'ready'
                  ? 'bg-green'
                  : 'bg-red'
              }
            >
              {props?.assetData?.status?.phase}
            </Badge>
            <div className="space-y-4" />
            <p>Views: </p>
          </div>
          <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3">
            <header className="text-lg">{props?.assetData?.name}</header>
            <div className="space-y-4" />
            <p className="text-xl" color={'brand.300'}>
              <span style={{ fontSize: 'sm' }}>{'USDC'}</span>
            </p>
            <p>
              With Creative TV, we wanted to sync the speed of creation with the
              speed of design. We wanted the creator to be just as excited as
              the designer to create new content.
            </p>
          </div>
        </CardContent>
        <hr />
        <CardFooter className="flex-wrap justify-between">
          {props?.assetData?.status?.phase === 'ready' ? (
            <div className="mb-5 space-x-10">
              <Link
                href={`discover/${encodeURIComponent(props?.assetData?.id)}`}
                passHref
              >
                <Button
                  className="flex-1 cursor-pointer hover:scale-105"
                  aria-label={`Comment on ${props?.assetData?.name}`}
                  variant="ghost"
                >
                  Comment
                </Button>
              </Link>
              <Button
                className="flex-1 cursor-pointer hover:scale-105"
                aria-label={`Share ${props?.assetData?.name}`}
                variant="ghost"
              >
                Share
              </Button>
            </div>
          ) : (
            <></>
          )}
        </CardFooter>
      </Card>
    </>
  );
};

export default VideoCard;

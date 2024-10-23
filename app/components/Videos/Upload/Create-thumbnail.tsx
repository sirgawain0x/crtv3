'use client';
import { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { BiPlus } from 'react-icons/bi';
import Image from 'next/image';
import { Input } from '@app/components/ui/input';
import { Button } from '@app/components/ui/button';
import { useInterval } from 'react-use';
import { PlayerComponent } from '@app/components/Player/Player';
import { Src } from '@livepeer/react';
import { getSrc } from '@livepeer/react/external';
import { Progress } from '@app/components/ui/progress';

import {
  giveLivePeerAsset,
  getLivePeerPlaybackInfo,
} from '@app/api/livepeer/livepeerActions';
import { Asset, PlaybackInfo } from 'livepeer/models/components';
import { GetPlaybackInfoResponse } from 'livepeer/models/operations';
import CreateThumbnailAi from '@app/components/Videos/Upload/Create-thumbnail-ai';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateThumbnailForm from './CreateThumbnailForm';

type CreateThumbnailProps = {
  livePeerAssetId: string | undefined;
};

export default function CreateThumbnail({
  livePeerAssetId,
}: CreateThumbnailProps) {
  const router = useRouter();

  //  Creating a ref for thumbnail and video
  const [livepeerAssetData, setLivePeerAssertData] = useState<Asset>();
  const [livepeerPlaybackData, setLivePeerPlaybackData] =
    useState<PlaybackInfo>();
  const [progress, setProgress] = useState<number>(0);

  useInterval(
    () => {
      if (livePeerAssetId) {
        giveLivePeerAsset(livePeerAssetId)
          .then((data) => {
            console.log(data);
            setLivePeerAssertData(data);
          })
          .catch((e) => {
            console.log(e);
            alert(e?.message || 'Error retrieving livepeer asset');
          });
      }
    },
    livepeerAssetData?.status?.phase !== 'ready' ? 5000 : null,
  );

  useEffect(() => {
    if (
      livepeerAssetData?.status?.phase === 'ready' &&
      livepeerAssetData.playbackId
    ) {
      getLivePeerPlaybackInfo(livepeerAssetData.playbackId).then((data) => {
        setLivePeerPlaybackData(data);
      });
    } else {
      console.log('Not ready to get playback info');
    }
  }, [livepeerAssetData]);

  const handleBack = () => {
    router.back();
  };

  const handleComplete = () => {
    router.push('/discover');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="my-6 text-center">
        <h4 className="text-2xl font-bold">Almost Done</h4>
      </div>
      <div className="my-4">
        <h3 className="text-lg">
          Video Transcoding: {String(livepeerAssetData?.status?.phase)}
        </h3>
      </div>
      {livepeerAssetData?.status?.phase !== 'ready' && (
        <div className="my-4">
          <Progress
            value={livepeerAssetData?.status?.progress}
            className="w-full"
          />
        </div>
      )}
      {livepeerAssetData?.status?.phase === 'ready' && livepeerPlaybackData && (
        <div className="my-6">
          <PlayerComponent
            title={livepeerAssetData.name}
            src={getSrc(livepeerPlaybackData) as Src[]}
          />
        </div>
      )}
      <div className="my-5">
        <div className="mx-auto my-4">
          <h3 className="text-xl font-bold">Generate a Thumbnail</h3>
        </div>
        <CreateThumbnailForm />
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button
          disabled={livepeerAssetData?.status?.phase === 'processing'}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          disabled={livepeerAssetData?.status?.phase !== 'ready'}
          onClick={handleComplete}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}

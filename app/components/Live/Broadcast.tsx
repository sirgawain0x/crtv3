'use client';

import * as React from 'react';
import * as Broadcast from '@livepeer/react/broadcast';
import {
  DisableAudioIcon,
  DisableVideoIcon,
  EnableAudioIcon,
  EnableVideoIcon,
  SettingsIcon,
  StopIcon,
} from '@livepeer/react/assets';
import { getIngest } from '@livepeer/react/external';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { toast } from 'sonner';
import { Profile, Type } from 'livepeer/models/components';

interface BroadcastProps {
  streamKey: string | null;
}

function BroadcastWithControls({ streamKey }: BroadcastProps) {
  const [isCreatingStream, setIsCreatingStream] = React.useState(false);
  const [streamData, setStreamData] = React.useState<any>(null);

  React.useEffect(() => {
    const createStream = async () => {
      if (!streamKey && !isCreatingStream) {
        setIsCreatingStream(true);
        try {
          const result = await fullLivepeer.stream.create({
            name: `Broadcast-${Date.now()}`,
            profiles: [
              {
                width: 1280,
                name: '720p',
                height: 720,
                bitrate: 3000000,
                fps: 30,
                fpsDen: 1,
                quality: 23,
                gop: '2',
                profile: Profile.H264Baseline,
              },
            ],
            record: false,
            playbackPolicy: {
              type: Type.Jwt,
            },
          });

          console.log('Stream created:', result);
          setStreamData(result);
          toast.success('Stream created successfully!');
        } catch (error) {
          console.error('Error creating stream:', error);
          toast.error('Failed to create stream. Please try again.');
        } finally {
          setIsCreatingStream(false);
        }
      }
    };

    createStream();
  }, [streamKey, isCreatingStream]);

  const ingestUrl = streamData?.ingest?.rtmp?.url || getIngest(streamKey);

  return !ingestUrl ? (
    <BroadcastLoading
      title="Setting up stream"
      description="Please wait while we set up your stream..."
    />
  ) : (
    <Broadcast.Root ingestUrl={ingestUrl}>
      <style jsx>{`
        .broadcast-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          height: auto;
          aspect-ratio: 16 / 9;
        }

        @media (max-width: 768px) {
          .broadcast-container {
            max-width: 100%;
          }
        }
      `}</style>

      <Broadcast.Container className="broadcast-container relative aspect-video overflow-hidden rounded-lg bg-black">
        <Broadcast.Video title="Broadcast preview" className="h-full w-full" />

        <Broadcast.Controls className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 p-4">
          <Broadcast.EnabledTrigger className="h-10 w-10 rounded-lg bg-white/10 p-2 hover:bg-white/20">
            <Broadcast.EnabledIndicator asChild matcher={false}>
              <EnableVideoIcon className="h-full w-full" />
            </Broadcast.EnabledIndicator>
            <Broadcast.EnabledIndicator asChild>
              <StopIcon className="h-full w-full text-red-500" />
            </Broadcast.EnabledIndicator>
          </Broadcast.EnabledTrigger>

          <Broadcast.AudioEnabledTrigger className="h-10 w-10 rounded-lg bg-white/10 p-2 hover:bg-white/20">
            <Broadcast.AudioEnabledIndicator asChild matcher={false}>
              <DisableAudioIcon className="h-full w-full" />
            </Broadcast.AudioEnabledIndicator>
            <Broadcast.AudioEnabledIndicator asChild>
              <EnableAudioIcon className="h-full w-full" />
            </Broadcast.AudioEnabledIndicator>
          </Broadcast.AudioEnabledTrigger>
        </Broadcast.Controls>

        <Broadcast.LoadingIndicator asChild matcher={false}>
          <div className="absolute left-2 top-2 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 backdrop-blur">
            <Broadcast.StatusIndicator
              matcher="live"
              className="flex items-center gap-2"
            >
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs text-white">LIVE</span>
            </Broadcast.StatusIndicator>

            <Broadcast.StatusIndicator
              className="flex items-center gap-2"
              matcher="pending"
            >
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
              <span className="text-xs text-white">CONNECTING...</span>
            </Broadcast.StatusIndicator>

            <Broadcast.StatusIndicator
              className="flex items-center gap-2"
              matcher="idle"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
              <span className="text-xs text-white">IDLE</span>
            </Broadcast.StatusIndicator>
          </div>
        </Broadcast.LoadingIndicator>
      </Broadcast.Container>
    </Broadcast.Root>
  );
}

function BroadcastLoading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

export { BroadcastWithControls as Broadcast };
export default BroadcastWithControls;

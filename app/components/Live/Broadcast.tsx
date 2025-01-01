'use client';

import {
  DisableAudioIcon,
  DisableVideoIcon,
  EnableAudioIcon,
  EnableVideoIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  LoadingIcon,
  OfflineErrorIcon,
  PictureInPictureIcon,
  SettingsIcon,
  StartScreenshareIcon,
  StopIcon,
  StopScreenshareIcon,
} from '@livepeer/react/assets';
import * as Broadcast from '@livepeer/react/broadcast';
import * as Popover from '@radix-ui/react-popover';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import React from 'react';
import { getIngest } from '@livepeer/react/external';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';

import { toast } from 'sonner';

export function BroadcastWithControls({
  streamKey,
}: {
  streamKey: string | null;
}) {
  const [isCreatingStream, setIsCreatingStream] = React.useState(false);

  React.useEffect(() => {
    const createStream = async () => {
      if (!streamKey && !isCreatingStream) {
        setIsCreatingStream(true);
        try {
          const { stream } = await fullLivepeer.stream.create({
            name: `Broadcast-${Date.now()}`,
          });

          console.log('Created stream:', stream);
          // Handle the new stream data here
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

  const ingestUrl = getIngest(streamKey);

  return !ingestUrl ? (
    <BroadcastLoading
      title="Invalid stream key"
      description="The stream key provided was invalid. Please check and try again."
    />
  ) : (
    <Broadcast.Root ingestUrl={ingestUrl}>
      <style jsx>{`
        .broadcast-container {
          width: 100%;
          max-width: 800px; /* Adjust max-width as needed */
          height: auto;
          aspect-ratio: 16 / 9;
        }

        @media (max-width: 768px) {
          .broadcast-container {
            max-width: 100%;
          }
        }
      `}</style>
      <Broadcast.Container className="relative aspect-video w-full overflow-hidden rounded-lg bg-black broadcast-container">
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

export { BroadcastWithControls as Broadcast };

export const BroadcastLoading = ({
  title,
  description,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) => (
  <div className="relative flex aspect-video w-full flex-col-reverse gap-3 overflow-hidden rounded-sm bg-white/10 px-3 py-3 md:px-3">
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse overflow-hidden rounded-lg bg-white/5" />
        <div className="h-6 w-16 animate-pulse overflow-hidden rounded-lg bg-white/5 md:h-7 md:w-20" />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse overflow-hidden rounded-lg bg-white/5" />
        <div className="h-6 w-6 animate-pulse overflow-hidden rounded-lg bg-white/5" />
      </div>
    </div>
    <div className="h-2 w-full animate-pulse overflow-hidden rounded-lg bg-white/5" />

    {title && (
      <div className="absolute inset-10 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-lg font-medium text-white">{title}</span>
        {description && (
          <span className="text-sm text-white/80">{description}</span>
        )}
      </div>
    )}
  </div>
);

export const Settings = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.Ref<HTMLButtonElement> | undefined,
  ) => {
    return (
      <Popover.Root>
        <Popover.Trigger ref={ref} asChild>
          <button
            type="button"
            className={className}
            aria-label="Stream settings"
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsIcon />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="w-60 rounded-md border border-white/50 bg-black/50 p-3 shadow-md outline-none backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            side="top"
            alignOffset={-70}
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <p className="mb-1 text-sm font-medium text-white/90">
                Stream settings
              </p>

              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium text-white/90"
                  htmlFor="cameraSource"
                >
                  Camera (&apos;c&apos; to rotate)
                </label>
                <SourceSelectComposed name="cameraSource" type="videoinput" />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  className="text-xs font-medium text-white/90"
                  htmlFor="microphoneSource"
                >
                  Microphone (&apos;m&apos; to rotate)
                </label>
                <SourceSelectComposed
                  name="microphoneSource"
                  type="audioinput"
                />
              </div>
            </div>
            <Popover.Close
              className="absolute right-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full outline-none"
              aria-label="Close"
            >
              <XIcon />
            </Popover.Close>
            <Popover.Arrow className="fill-white/50" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

Settings.displayName = 'Settings';

export const SourceSelectComposed = React.forwardRef(
  (
    {
      name,
      type,
      className,
    }: { name: string; type: 'audioinput' | 'videoinput'; className?: string },
    ref: React.Ref<HTMLButtonElement> | undefined,
  ) => (
    <Broadcast.SourceSelect name={name} type={type}>
      {(devices) =>
        devices ? (
          <>
            <Broadcast.SelectTrigger
              ref={ref}
              className="flex h-7 w-full items-center justify-between gap-1 overflow-hidden rounded-sm px-1 text-xs leading-none outline-none outline-1 outline-white/50 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label={type === 'audioinput' ? 'Audio input' : 'Video input'}
            >
              <Broadcast.SelectValue
                placeholder={
                  type === 'audioinput'
                    ? 'Select an audio input'
                    : 'Select a video input'
                }
              />
              <Broadcast.SelectIcon>
                <ChevronDownIcon className="h-4 w-4" />
              </Broadcast.SelectIcon>
            </Broadcast.SelectTrigger>
            <Broadcast.SelectPortal>
              <Broadcast.SelectContent className="overflow-hidden rounded-sm bg-black">
                <Broadcast.SelectViewport className="p-1">
                  <Broadcast.SelectGroup>
                    {devices?.map((device) => (
                      <RateSelectItem
                        key={device.deviceId}
                        value={device.deviceId}
                      >
                        {device.friendlyName}
                      </RateSelectItem>
                    ))}
                  </Broadcast.SelectGroup>
                </Broadcast.SelectViewport>
              </Broadcast.SelectContent>
            </Broadcast.SelectPortal>
          </>
        ) : (
          <span>There was an error fetching the available devices.</span>
        )
      }
    </Broadcast.SourceSelect>
  ),
);

SourceSelectComposed.displayName = 'SourceSelectComposed';

const RateSelectItem = React.forwardRef<
  HTMLDivElement,
  Broadcast.SelectItemProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Broadcast.SelectItem
      className="relative flex h-7 select-none items-center rounded-sm pl-[25px] pr-[35px] text-xs leading-none data-[disabled]:pointer-events-none data-[highlighted]:bg-white/20 data-[highlighted]:outline-none"
      {...props}
      ref={forwardedRef}
    >
      <Broadcast.SelectItemText>{children}</Broadcast.SelectItemText>
      <Broadcast.SelectItemIndicator className="absolute left-0 inline-flex w-[25px] items-center justify-center">
        <CheckIcon className="h-4 w-4" />
      </Broadcast.SelectItemIndicator>
    </Broadcast.SelectItem>
  );
});

RateSelectItem.displayName = 'RateSelectItem';

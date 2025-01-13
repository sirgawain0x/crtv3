'use client';
import { cn } from '@app/lib/utils';
import * as React from 'react';
import * as Broadcast from '@livepeer/react/broadcast';
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
import { getIngest } from '@livepeer/react/external';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { toast } from 'sonner';
import { Profile, Type } from 'livepeer/models/components';
import * as Popover from '@radix-ui/react-popover';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';

interface BroadcastProps {
  streamKey: string | null;
}

function BroadcastWithControls({ streamKey }: BroadcastProps) {
  const [isCreatingStream, setIsCreatingStream] = React.useState(false);
  const [streamData, setStreamData] = React.useState<any>(null);
  const settingsButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const createStream = async () => {
      if (!streamKey && !isCreatingStream) {
        setIsCreatingStream(true);
        try {
          const result = await fullLivepeer.stream.create({
            name: `Broadcast-${Date.now()}`,
            profiles: [
              {
                width: 854,
                name: '480p',
                height: 480,
                bitrate: 1500000,
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
    <div className="scale-120 transform-gpu">
      <Broadcast.Root
        onError={(error) =>
          error?.type === "permissions"
            ? toast.error("You must accept permissions to broadcast. Please try again.")
            : null
        }
        aspectRatio={16 / 9}
        ingestUrl={ingestUrl}
      >
        <div className="max-w-[576px] mx-auto">
          <Broadcast.Container className="w-full h-full overflow-hidden rounded-sm bg-gray-950">
            <Broadcast.Video title="Live stream" className="w-[90%] h-[90%] mx-auto my-auto" />

            <Broadcast.LoadingIndicator className="w-full relative h-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <LoadingIcon className="w-8 h-8 animate-spin text-white" />
              </div>
              <BroadcastLoading />
            </Broadcast.LoadingIndicator>

            <Broadcast.ErrorIndicator
              matcher="not-permissions"
              className="absolute select-none inset-0 text-center bg-gray-950 flex flex-col items-center justify-center gap-4 duration-1000 data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0"
            >
              <OfflineErrorIcon className="h-[120px] w-full sm:flex hidden text-white" />
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold text-white">Broadcast failed</div>
                <div className="text-sm text-white">
                  There was an error with broadcasting - it is retrying in the background.
                </div>
              </div>
            </Broadcast.ErrorIndicator>

            <Broadcast.Controls 
              className="bg-gradient-to-b gap-1 px-2 py-1.5 flex-col-reverse flex from-black/20 via-80% via-black/30 duration-1000 to-black/60"
              onTouchStart={(e) => {
                e.preventDefault();
                e.currentTarget.style.opacity = '1';
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
              }}
              style={{ opacity: 1 }}
            >
              <div className="flex justify-between gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <Broadcast.VideoEnabledTrigger className="w-5 h-5 hover:scale-110 transition flex-shrink-0">
                    <Broadcast.VideoEnabledIndicator asChild matcher={false}>
                      <DisableVideoIcon className="w-full h-full text-white" />
                    </Broadcast.VideoEnabledIndicator>
                    <Broadcast.VideoEnabledIndicator asChild matcher={true}>
                      <EnableVideoIcon className="w-full h-full text-white" />
                    </Broadcast.VideoEnabledIndicator>
                  </Broadcast.VideoEnabledTrigger>
                  <Broadcast.AudioEnabledTrigger className="w-5 h-5 hover:scale-110 transition flex-shrink-0">
                    <Broadcast.AudioEnabledIndicator asChild matcher={false}>
                      <DisableAudioIcon className="w-full h-full text-white" />
                    </Broadcast.AudioEnabledIndicator>
                    <Broadcast.AudioEnabledIndicator asChild matcher={true}>
                      <EnableAudioIcon className="w-full h-full text-white" />
                    </Broadcast.AudioEnabledIndicator>
                  </Broadcast.AudioEnabledTrigger>
                </div>
                <div className="flex justify-end items-center gap-2">
                  <Settings
                    ref={settingsButtonRef}
                    className="w-5 h-5 hover:scale-110 transition flex-shrink-0"
                  >
                    <SettingsIcon className="w-full h-full text-white" />
                  </Settings>

                  <Broadcast.ScreenshareTrigger className="w-5 h-5 hover:scale-110 transition flex-shrink-0">
                    <Broadcast.ScreenshareIndicator asChild>
                      <StopScreenshareIcon className="w-full h-full text-white" />
                    </Broadcast.ScreenshareIndicator>
                    <Broadcast.ScreenshareIndicator matcher={false} asChild>
                      <StartScreenshareIcon className="w-full h-full text-white" />
                    </Broadcast.ScreenshareIndicator>
                  </Broadcast.ScreenshareTrigger>

                  <Broadcast.PictureInPictureTrigger className="w-5 h-5 hover:scale-110 transition flex-shrink-0">
                    <PictureInPictureIcon className="w-full h-full text-white" />
                  </Broadcast.PictureInPictureTrigger>

                  <Broadcast.FullscreenTrigger className="w-5 h-5 hover:scale-110 transition flex-shrink-0">
                    <Broadcast.FullscreenIndicator asChild>
                      <ExitFullscreenIcon className="w-full h-full text-white" />
                    </Broadcast.FullscreenIndicator>
                    <Broadcast.FullscreenIndicator matcher={false} asChild>
                      <EnterFullscreenIcon className="w-full h-full text-white" />
                    </Broadcast.FullscreenIndicator>
                  </Broadcast.FullscreenTrigger>
                </div>
              </div>

              <Broadcast.EnabledIndicator
                matcher={false}
                className="flex flex-1 items-center justify-center"
              >
                <Broadcast.EnabledTrigger className="rounded-md px-3 py-1.5 bg-red-500 hover:bg-red-700 gap-1 flex items-center justify-center">
                  <EnableVideoIcon className="w-5 h-5 text-white" />
                  <span className="text-xs text-white">Go Live</span>
                </Broadcast.EnabledTrigger>
              </Broadcast.EnabledIndicator>

              <Broadcast.EnabledIndicator asChild>
                <Broadcast.EnabledTrigger className="top-1 right-2 absolute flex items-center justify-center gap-1 rounded-md px-3 py-1.5 bg-white/5 hover:bg-white/10">
                  <StopIcon className="w-5 h-5 text-red-500" />
                  <span className="text-xs text-white">Stop Live</span>
                </Broadcast.EnabledTrigger>
              </Broadcast.EnabledIndicator>
            </Broadcast.Controls>

            <Broadcast.LoadingIndicator asChild matcher={false}>
              <div className="absolute overflow-hidden py-1 px-2 rounded-full top-1 left-1 bg-black/50 flex items-center backdrop-blur">
                <Broadcast.StatusIndicator
                  matcher="live"
                  className="flex gap-1.5 items-center"
                >
                  <div className="bg-red-500 animate-pulse h-1.5 w-1.5 rounded-full" />
                  <span className="text-xs select-none text-white">LIVE</span>
                </Broadcast.StatusIndicator>

                <Broadcast.StatusIndicator
                  className="flex gap-1.5 items-center"
                  matcher="pending"
                >
                  <div className="bg-white/80 h-1.5 w-1.5 rounded-full animate-pulse" />
                  <span className="text-xs select-none text-white">PENDING</span>
                </Broadcast.StatusIndicator>

                <Broadcast.StatusIndicator
                  className="flex gap-1.5 items-center"
                  matcher="idle"
                >
                  <div className="bg-white/80 h-1.5 w-1.5 rounded-full" />
                  <span className="text-xs select-none text-white">IDLE</span>
                </Broadcast.StatusIndicator>
              </div>
            </Broadcast.LoadingIndicator>
          </Broadcast.Container>
        </div>
      </Broadcast.Root>
    </div>
  );
}

export const BroadcastLoading = ({
  title,
  description,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) => (
  <div className="relative w-full px-2 py-2 gap-2 flex-col-reverse flex aspect-video bg-white/10 overflow-hidden rounded-sm">
    <div className="flex justify-between">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 animate-pulse bg-white/5 overflow-hidden rounded-lg" />
        <div className="w-14 h-5 animate-pulse bg-white/5 overflow-hidden rounded-lg" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 animate-pulse bg-white/5 overflow-hidden rounded-lg" />
        <div className="w-5 h-5 animate-pulse bg-white/5 overflow-hidden rounded-lg" />
      </div>
    </div>
    <div className="w-full h-1.5 animate-pulse bg-white/5 overflow-hidden rounded-lg" />
    {title && (
      <div className="absolute flex flex-col gap-1 inset-8 text-center justify-center items-center">
        <span className="text-white text-base font-medium">{title}</span>
        {description && (
          <span className="text-xs text-white">{description}</span>
        )}
      </div>
    )}
  </div>
);

export const Settings = React.forwardRef(
  (
    { className, children }: { className?: string; children?: React.ReactNode },
    ref: React.Ref<HTMLButtonElement> | undefined
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
            <SettingsIcon className="w-full h-full text-white" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="w-72 rounded-md bg-black/80 border border-white/50 backdrop-blur-md p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            side="top"
            alignOffset={-70}
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3">
              <p className="text-white font-medium text-base mb-1">
                Stream settings
              </p>

              <div className="gap-2 flex-col flex">
                <label
                  className="text-sm text-white font-medium"
                  htmlFor="cameraSource"
                >
                  Camera (&lsquo;c&rsquo; to rotate)
                </label>
                <SourceSelectComposed name="cameraSource" type="videoinput" />
              </div>

              <div className="gap-2 flex-col flex">
                <label
                  className="text-sm text-white font-medium"
                  htmlFor="microphoneSource"
                >
                  Microphone (&lsquo;m&rsquo; to rotate)
                </label>
                <SourceSelectComposed name="microphoneSource" type="audioinput" />
              </div>
            </div>
            <Popover.Close className="rounded-full h-4 w-4 inline-flex items-center justify-center absolute top-2 right-2 outline-none">
              <XIcon className="w-3 h-3 text-white" />
            </Popover.Close>
            <Popover.Arrow className="fill-white/50" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }
);

export const SourceSelectComposed = React.forwardRef(
  (
    {
      name,
      type,
      className,
    }: { name: string; type: "audioinput" | "videoinput"; className?: string },
    ref: React.Ref<HTMLButtonElement> | undefined
  ) => (
    <Broadcast.SourceSelect name={name} type={type}>
      {(devices) =>
        devices ? (
          <>
            <Broadcast.SelectTrigger
              ref={ref}
              className={cn(
                "flex w-full items-center bg-gray-900/80 text-white overflow-hidden justify-between rounded-sm px-2 py-1.5 outline-1 outline-white/50 text-sm leading-none h-8 gap-1 outline-none hover:bg-gray-800/80 disabled:opacity-70 disabled:cursor-not-allowed",
                className
              )}
              aria-label={type === "audioinput" ? "Audio input" : "Video input"}
            >
              <Broadcast.SelectValue
                placeholder={
                  type === "audioinput"
                    ? "Select an audio input"
                    : "Select a video input"
                }
                className="text-white"
              />
              <Broadcast.SelectIcon>
                <ChevronDownIcon className="h-4 w-4 text-white" />
              </Broadcast.SelectIcon>
            </Broadcast.SelectTrigger>
            <Broadcast.SelectPortal>
              <Broadcast.SelectContent className="overflow-hidden bg-gray-900 rounded-sm border border-white/20">
                <Broadcast.SelectViewport className="p-2">
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
          <span className="text-xs text-white">Error fetching devices</span>
        )
      }
    </Broadcast.SourceSelect>
  )
);

SourceSelectComposed.displayName = "SourceSelectComposed";

const RateSelectItem = React.forwardRef<
  HTMLDivElement,
  Broadcast.SelectItemProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Broadcast.SelectItem
      className={cn(
        "text-sm text-white leading-none rounded-sm flex items-center h-8 pr-[35px] pl-[25px] relative select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:outline-none data-[highlighted]:bg-white/20 hover:bg-white/10",
        className
      )}
      {...props}
      ref={forwardedRef}
    >
      <Broadcast.SelectItemText>{children}</Broadcast.SelectItemText>
      <Broadcast.SelectItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
        <CheckIcon className="w-4 h-4 text-white" />
      </Broadcast.SelectItemIndicator>
    </Broadcast.SelectItem>
  );
});

RateSelectItem.displayName = 'RateSelectItem';
Settings.displayName = 'Settings';

export { BroadcastWithControls as Broadcast };
export default BroadcastWithControls;

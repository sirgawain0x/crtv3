import { useState, useRef, useEffect, useCallback } from 'react';
import { getIngest } from '@livepeer/react/external';
import { toast } from 'sonner';
import type { StreamIngestDestination } from '@/lib/video-provider/ingest-types';
import { logger } from '@/lib/utils/logger';

export type BroadcastStatus = 'idle' | 'loading' | 'live' | 'error';

/** Match @livepeer/core-web WHIP: prefer H264 payload type on the video m-line. */
function preferCodec(sdp: string, codec: string): string {
    const lines = sdp.split('\r\n');
    const mLineIndex = lines.findIndex((line) => line.startsWith('m=video'));
    if (mLineIndex === -1) return sdp;
    const codecRegex = new RegExp(`a=rtpmap:(\\d+) ${codec}(/\\d+)+`);
    const codecLine = lines.find((line) => codecRegex.test(line));
    if (!codecLine) return sdp;
    const match = codecRegex.exec(codecLine);
    if (!match?.[1]) return sdp;
    const codecPayload = match[1];
    const mLineElements = lines[mLineIndex].split(' ');
    lines[mLineIndex] = [
        ...mLineElements.slice(0, 3),
        codecPayload,
        ...mLineElements.slice(3).filter((payload) => payload !== codecPayload),
    ].join(' ');
    return lines.join('\r\n');
}

interface UseBroadcastProps {
    ingestUrl?: string | null;
    resolveIngest?: () => Promise<StreamIngestDestination>;
    streamKey?: string | null;
    /**
     * Called once on WHIP 404 so the host can refresh stale Livepeer credentials
     * (stream-key route auto-heals) and retry Go Live without killing the camera.
     */
    refreshStreamKey?: () => Promise<string | null>;
}

interface UseBroadcastReturn {
    status: BroadcastStatus;
    startBroadcast: () => Promise<void>;
    stopBroadcast: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    toggleAudio: () => void;
    toggleVideo: () => void;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    devices: MediaDeviceInfo[];
    selectedAudioDeviceId: string;
    selectedVideoDeviceId: string;
    changeAudioDevice: (deviceId: string) => Promise<void>;
    changeVideoDevice: (deviceId: string) => Promise<void>;
    error: string | null;
    isScreenSharing: boolean;
    toggleScreenShare: () => Promise<void>;
}

export function useBroadcast({
    ingestUrl,
    streamKey,
    refreshStreamKey,
    resolveIngest,
}: UseBroadcastProps): UseBroadcastReturn {
    const [status, setStatus] = useState<BroadcastStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const whipResourceRef = useRef<string | null>(null);
    const connectionGenerationRef = useRef(0);
    const mountedRef = useRef(true);
    const mediaRequestRef = useRef(0);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const activeStreamKeyRef = useRef<string | null>(streamKey ?? null);
    const ingestProviderRef = useRef<"livepeer" | "frameworks">("livepeer");

    useEffect(() => {
        activeStreamKeyRef.current = streamKey ?? null;
    }, [streamKey]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Enumerate devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                const deviceInfos = await navigator.mediaDevices.enumerateDevices();
                setDevices(deviceInfos);

                // Set defaults if not set
                const audioDevices = deviceInfos.filter(d => d.kind === 'audioinput');
                const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');

                if (audioDevices.length > 0 && !selectedAudioDeviceId) {
                    setSelectedAudioDeviceId(audioDevices[0].deviceId);
                }
                if (videoDevices.length > 0 && !selectedVideoDeviceId) {
                    setSelectedVideoDeviceId(videoDevices[0].deviceId);
                }
            } catch (err) {
                logger.error('Error enumerating devices:', err);
            }
        };

        getDevices();
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    // Initialize Media Stream
    const initStream = useCallback(async () => {
        const mediaRequest = ++mediaRequestRef.current;
        try {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
                video: selectedVideoDeviceId ? {
                    deviceId: { exact: selectedVideoDeviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (!mountedRef.current || mediaRequest !== mediaRequestRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            mediaStreamRef.current = stream;
            setLocalStream(stream);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true; // Mute local playback to avoid feedback
            }

            // Sync initial state
            stream.getAudioTracks().forEach(track => track.enabled = isAudioEnabled);
            stream.getVideoTracks().forEach(track => track.enabled = isVideoEnabled);

        } catch (err) {
            if (!mountedRef.current || mediaRequest !== mediaRequestRef.current) return;
            logger.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone');
            toast.error('Failed to access camera/microphone');
        }
    }, [selectedAudioDeviceId, selectedVideoDeviceId]);

    // Initial setup of camera/mic
    useEffect(() => {
        initStream();
        return () => {
            mediaRequestRef.current += 1;
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [initStream]);


    const teardownPeerConnection = useCallback(() => {
        connectionGenerationRef.current += 1;
        const resource = whipResourceRef.current;
        whipResourceRef.current = null;
        if (resource) void fetch(resource, { method: 'DELETE' }).catch(() => {});
        const peer = peerConnectionRef.current;
        peerConnectionRef.current = null;
        if (peer) peer.close();
    }, []);

    useEffect(() => () => teardownPeerConnection(), [teardownPeerConnection]);

    const analyzeOfferSdp = (sdp: string) => ({
        mediaLineCount: (sdp.match(/^m=/gm) || []).length,
        hasH264: /a=rtpmap:\d+ H264\//i.test(sdp),
        hasVideo: /^m=video\s/m.test(sdp),
        hasAudio: /^m=audio\s/m.test(sdp),
    });

    const ensureLiveMediaStream = async (): Promise<MediaStream> => {
        let stream = screenStreamRef.current || mediaStreamRef.current;
        const liveTracks =
            stream?.getTracks().filter((t) => t.readyState === 'live') ?? [];
        if (!stream || liveTracks.length === 0) {
            await initStream();
            stream = screenStreamRef.current || mediaStreamRef.current;
        }
        const refreshedLive =
            stream?.getTracks().filter((t) => t.readyState === 'live') ?? [];
        if (!stream || refreshedLive.length === 0) {
            throw new Error('No live camera/microphone tracks available');
        }
        return stream;
    };

    const connectWhip = async (keyForIngest: string | null | undefined) => {
        teardownPeerConnection();
        const generation = connectionGenerationRef.current;
        const assertCurrent = () => {
            if (!mountedRef.current || generation !== connectionGenerationRef.current) throw new DOMException('Broadcast stopped', 'AbortError');
        };
        assertCurrent();
        // Resolve at Go Live, not on mount: FrameWorks placement is dynamic.
        const destination = resolveIngest ? await resolveIngest() : null;
        assertCurrent();
        ingestProviderRef.current = destination?.provider ?? "livepeer";
        const selectedUrl = destination
            ? destination.whipUrl
            : ingestUrl || (keyForIngest ? getIngest(keyForIngest) : null);
        if (!selectedUrl) throw new Error('No WHIP destination is available');
        const webrtcDiscoveryUrl = ingestProviderRef.current === "livepeer" ? selectedUrl : null;
        let endpointUrl = selectedUrl;
        let iceServers: RTCIceServer[] = [
            { urls: 'stun:stun.l.google.com:19302' },
        ];

        // Livepeer docs: HEAD the webrtc redirect endpoint, use Location host for ICE.
        if (webrtcDiscoveryUrl) {


            try {
                const headRes = await fetch(webrtcDiscoveryUrl, {
                    method: 'HEAD',
                    mode: 'cors',
                });

                if (headRes.status === 404) {
                    const err = new Error(
                        `WHIP discovery failed: 404 ${headRes.statusText}`,
                    ) as Error & { status?: number };
                    err.status = 404;
                    throw err;
                }

                if (!headRes.ok) {
                    logger.warn(
                        'WHIP discovery HEAD not ok; posting to playback webrtc URL',
                        { status: headRes.status },
                    );
                    endpointUrl = webrtcDiscoveryUrl;
                } else {
                    endpointUrl = headRes.url || webrtcDiscoveryUrl;


                    const host = new URL(endpointUrl).host;
                    iceServers = [
                        { urls: `stun:${host}` },
                        {
                            urls: `turn:${host}`,
                            username: 'livepeer',
                            credential: 'livepeer',
                        },
                    ];
                }
            } catch (e) {
                if (
                    e instanceof Error &&
                    'status' in e &&
                    (e as Error & { status?: number }).status === 404
                ) {
                    throw e;
                }
                logger.error('Failed to discover optimized WHIP endpoint');
                endpointUrl = webrtcDiscoveryUrl;
            }
        }

        if (!endpointUrl) {
            throw new Error('Could not resolve valid WHIP endpoint.');
        }

        assertCurrent();
        const pc = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = pc;

        // Monitor connection state for mid-stream failures
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            logger.debug('WebRTC connection state:', state);

            switch (state) {
                case 'disconnected':
                    toast.warning('Connection unstable, attempting to recover...');
                    break;
                case 'failed':
                    setError('Broadcast connection failed');
                    setStatus('error');
                    toast.error('Broadcast connection lost');
                    stopBroadcast();
                    break;
                case 'closed':
                    if (status === 'live') {
                        setStatus('idle');
                    }
                    break;
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            logger.debug('ICE connection state:', state);

            if (state === 'failed') {
                setError('Network connection failed');
                setStatus('error');
                toast.error('Network connection lost');
                stopBroadcast();
            }
        };

        // Add tracks — use screen stream if screen sharing, otherwise camera.
        // addTrack binds an RTP sender per track (required for media to flow).
        // Livepeer returns 404 "Stream open failed" when the offer has no m= lines.
        const activeStream = await ensureLiveMediaStream();
        assertCurrent();
        const liveTracks = activeStream
            .getTracks()
            .filter((t) => t.readyState === 'live');
        liveTracks.forEach((track) => {
            pc.addTrack(track, activeStream);
        });

        // Match @livepeer/core-web constructClientOffer: prefer H264 in the SDP.
        const rawOffer = await pc.createOffer();
        const h264Offer = new RTCSessionDescription({
            type: rawOffer.type,
            sdp: preferCodec(rawOffer.sdp ?? '', 'H264'),
        });
        await pc.setLocalDescription(h264Offer);

        // Livepeer waits up to 5s for ICE gathering before posting WHIP.
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
                return;
            }
            const checkState = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', checkState);
            setTimeout(() => {
                pc.removeEventListener('icegatheringstatechange', checkState);
                resolve();
            }, 5000);
        });

        assertCurrent();
        const offerSdp = pc.localDescription?.sdp;
        if (!offerSdp) throw new Error('Failed to generate SDP offer');

        const sdpInfo = analyzeOfferSdp(offerSdp);

        if (sdpInfo.mediaLineCount === 0) {
            const err = new Error(
                'Broadcast offer missing media tracks. Check camera/mic permissions and try again.',
            ) as Error & { status?: number; offerHadMedia?: boolean };
            err.offerHadMedia = false;
            throw err;
        }



        const response = await fetch(endpointUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/sdp',
            },
            body: offerSdp,
        });

        if (!response.ok) {
            if (response.body) await response.body.cancel().catch(() => {});
            const err = new Error(
                `WHIP Request failed: ${response.status} ${response.statusText}`,
            ) as Error & { status?: number; offerHadMedia?: boolean };
            err.status = response.status;
            err.offerHadMedia = sdpInfo.mediaLineCount > 0;
            throw err;
        }

        const location = response.headers.get('Location');
        let resource: string | null = null;
        if (location) {
            const candidate = new URL(location, endpointUrl);
            if (candidate.origin === new URL(endpointUrl).origin) resource = candidate.toString();
        }
        if (generation !== connectionGenerationRef.current) {
            if (resource) void fetch(resource, { method: 'DELETE' }).catch(() => {});
            assertCurrent();
        }
        whipResourceRef.current = resource;
        const answerSdp = await response.text();
        assertCurrent();
        await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
        );
        assertCurrent();
    };

    const startBroadcast = async () => {
        const initialKey = activeStreamKeyRef.current || streamKey;
        if (!ingestUrl && !initialKey) {
            toast.error('No stream key or ingest URL provided');
            return;
        }
        if (!mediaStreamRef.current) {
            await initStream();
            if (!mediaStreamRef.current) return;
        }

        setStatus('loading');
        setError(null);

        try {
            await connectWhip(initialKey);
            setStatus('live');
            toast.success('Broadcast started successfully!');
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            const message =
                err instanceof Error ? err.message : 'Failed to start broadcast';
            const statusCode =
                err instanceof Error && 'status' in err
                    ? (err as Error & { status?: number }).status
                    : undefined;
            const offerHadMedia =
                err instanceof Error && 'offerHadMedia' in err
                    ? Boolean((err as Error & { offerHadMedia?: boolean }).offerHadMedia)
                    : undefined;
            const isDiscovery404 = /WHIP discovery failed:\s*404/i.test(message);
            const isWhipPost404 =
                statusCode === 404 || /WHIP Request failed:\s*404/i.test(message);
            // Livepeer returns the same 404 body for media-less offers; only refresh
            // credentials when discovery misses the stream or a media-bearing offer fails.
            const shouldRefreshKey =
                ingestProviderRef.current === "livepeer" &&
                Boolean(refreshStreamKey) &&
                (isDiscovery404 || (isWhipPost404 && offerHadMedia === true));

            logger.error('Broadcast error:', err);

            // Stale stream key: refresh once (server heals), keep camera, retry WHIP.
            if (shouldRefreshKey && refreshStreamKey) {
                teardownPeerConnection();
                toast.message('Stream credentials expired — refreshing…');
                try {
                    const newKey = await refreshStreamKey();
                    if (!newKey) {
                        const refreshFailMessage =
                            'Could not refresh stream credentials. Try again or recreate your stream.';
                        logger.error('Stream credential refresh returned no key');
                        setError(refreshFailMessage);
                        setStatus('idle');
                        toast.error(refreshFailMessage);
                        return;
                    }
                    activeStreamKeyRef.current = newKey;
                    await connectWhip(newKey);
                    setStatus('live');
                    toast.success('Broadcast started successfully!');
                    return;
                } catch (retryErr) {
                    if (retryErr instanceof DOMException && retryErr.name === 'AbortError') return;
                    logger.error('WHIP retry after credential refresh failed:', retryErr);
                    const retryMessage =
                        retryErr instanceof Error
                            ? retryErr.message
                            : 'Failed to start broadcast after refresh';
                    setError(retryMessage);
                    setStatus('idle');
                    toast.error(
                        `Broadcast failed after refreshing stream key: ${retryMessage}`,
                    );
                    teardownPeerConnection();
                    return;
                }
            }

            setError(message);
            setStatus('idle');
            toast.error(
                isDiscovery404
                    ? 'Broadcast failed: stream not found on Livepeer. Refresh the page or recreate your stream.'
                    : `Broadcast failed: ${message}`,
            );
            // Keep camera/mic preview alive so the creator can retry Go Live.
            teardownPeerConnection();
        }
    };

    const stopBroadcast = () => {
        mediaRequestRef.current += 1;
        // Stop screen sharing if active
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
            setIsScreenSharing(false);
        }

        teardownPeerConnection();

        // Stop media tracks to release camera/mic
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        // Clear video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setLocalStream(null);
        setStatus('idle');
    };

    const toggleAudio = () => {
        if (mediaStreamRef.current) {
            const audioTracks = mediaStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !isAudioEnabled;
            });
            setIsAudioEnabled(!isAudioEnabled);
        }
    };

    const toggleVideo = () => {
        if (mediaStreamRef.current) {
            const videoTracks = mediaStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !isVideoEnabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const changeAudioDevice = async (deviceId: string) => {
        setSelectedAudioDeviceId(deviceId);
        // InitStream will trigger due to dependency change
    };

    const changeVideoDevice = async (deviceId: string) => {
        setSelectedVideoDeviceId(deviceId);
        // InitStream will trigger due to dependency change
    };

    // Screen sharing — uses replaceTrack for seamless mid-stream switching
    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen share, revert to camera
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }

            // Replace track on peer connection if live
            const pc = peerConnectionRef.current;
            if (pc && mediaStreamRef.current) {
                const cameraTrack = mediaStreamRef.current.getVideoTracks()[0];
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender && cameraTrack) {
                    await videoSender.replaceTrack(cameraTrack);
                }
            }

            // Restore camera preview
            if (videoRef.current && mediaStreamRef.current) {
                videoRef.current.srcObject = mediaStreamRef.current;
            }

            setIsScreenSharing(false);
            toast.success('Screen sharing stopped');
        } else {
            // Start screen share
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                });
                screenStreamRef.current = screenStream;

                // Replace track on peer connection if live
                const pc = peerConnectionRef.current;
                if (pc) {
                    const screenVideoTrack = screenStream.getVideoTracks()[0];
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender && screenVideoTrack) {
                        await videoSender.replaceTrack(screenVideoTrack);
                    }

                    // If screen share has audio, replace or add audio track
                    const screenAudioTrack = screenStream.getAudioTracks()[0];
                    if (screenAudioTrack) {
                        const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
                        if (audioSender) {
                            await audioSender.replaceTrack(screenAudioTrack);
                        }
                    }
                }

                // Show screen in local preview
                if (videoRef.current) {
                    videoRef.current.srcObject = screenStream;
                }

                // Auto-revert when user clicks browser's "Stop sharing" button
                screenStream.getVideoTracks()[0].onended = () => {
                    toggleScreenShare(); // Recursively stops screen share
                };

                setIsScreenSharing(true);
                toast.success('Screen sharing started');
            } catch (err: any) {
                // User cancelled the screen picker or error
                if (err.name !== 'NotAllowedError') {
                    logger.error('Screen share error:', err);
                    toast.error('Failed to start screen sharing');
                }
            }
        }
    };

    return {
        status,
        startBroadcast,
        stopBroadcast,
        videoRef,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled,
        devices,
        selectedAudioDeviceId,
        selectedVideoDeviceId,
        changeAudioDevice,
        changeVideoDevice,
        error,
        isScreenSharing,
        toggleScreenShare
    };
}

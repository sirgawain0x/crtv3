import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

export type BroadcastStatus = 'idle' | 'loading' | 'live' | 'error';

interface UseBroadcastProps {
    ingestUrl?: string | null;
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
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const activeStreamKeyRef = useRef<string | null>(streamKey ?? null);

    useEffect(() => {
        activeStreamKeyRef.current = streamKey ?? null;
    }, [streamKey]);

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
            logger.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone');
            toast.error('Failed to access camera/microphone');
        }
    }, [selectedAudioDeviceId, selectedVideoDeviceId]);

    // Initial setup of camera/mic
    useEffect(() => {
        initStream();
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [initStream]);


    const teardownPeerConnection = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
    }, []);

    const connectWhip = async (keyForIngest: string | null | undefined) => {
        let endpointUrl =
            (keyForIngest
                ? `https://ingest.livepeer.studio/whip/${keyForIngest}`
                : null) ||
            ingestUrl ||
            null;
        let iceServers: RTCIceServer[] = [
            { urls: 'stun:stun.l.google.com:19302' },
        ];

        // Prioritize explicit stream key discovery as per Livepeer documentation
        // "Get the SDP Host ... make a HEAD request to the WebRTC redirect endpoint"
        if (keyForIngest) {
            const discoveryUrl = `https://livepeer.studio/webrtc/${keyForIngest}`;
            logger.debug('Discovering WHIP endpoint from:', discoveryUrl);

            try {
                const headRes = await fetch(discoveryUrl, { method: 'HEAD' });

                if (headRes.status === 404) {
                    const err = new Error(
                        `WHIP discovery failed: 404 ${headRes.statusText}`,
                    ) as Error & { status?: number };
                    err.status = 404;
                    throw err;
                }

                if (!headRes.ok) {
                    logger.warn(
                        'WHIP discovery HEAD not ok; falling back to ingest URL',
                        { status: headRes.status },
                    );
                } else {
                    // fetch follows redirects; .url is the final destination
                    endpointUrl = headRes.url;
                    logger.debug('Resolved WHIP endpoint:', endpointUrl);

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
                logger.error('Failed to discover optimized WHIP endpoint:', e);
                // Fallback to ingestUrl if available, otherwise error below
            }
        }

        if (!endpointUrl) {
            throw new Error('Could not resolve valid WHIP endpoint.');
        }

        teardownPeerConnection();

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

        // Add tracks — use screen stream if screen sharing, otherwise camera
        const activeStream = screenStreamRef.current || mediaStreamRef.current;
        if (!activeStream) {
            throw new Error('No media stream available');
        }
        activeStream.getTracks().forEach((track) => {
            pc.addTransceiver(track, { direction: 'sendonly' });
        });

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                const checkState = () => {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                };
                pc.addEventListener('icegatheringstatechange', checkState);
                // Fallback timeout
                setTimeout(() => {
                    pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }, 2000);
            }
        });

        const offerSdp = pc.localDescription?.sdp;
        if (!offerSdp) throw new Error('Failed to generate SDP offer');

        // WHIP Request
        logger.debug(`Posting SDP offer to: ${endpointUrl}`);

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sdp',
            },
            body: offerSdp,
        });

        if (!response.ok) {
            const errorText = await response.text();
            const err = new Error(
                `WHIP Request failed: ${response.status} ${response.statusText} - ${errorText}`,
            ) as Error & { status?: number };
            err.status = response.status;
            throw err;
        }

        const answerSdp = await response.text();
        await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
        );
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
            const message =
                err instanceof Error ? err.message : 'Failed to start broadcast';
            const statusCode =
                err instanceof Error && 'status' in err
                    ? (err as Error & { status?: number }).status
                    : undefined;
            const isWhip404 =
                statusCode === 404 ||
                /WHIP Request failed:\s*404/i.test(message) ||
                /WHIP discovery failed:\s*404/i.test(message);

            logger.error('Broadcast error:', err);

            // Stale stream key: refresh once (server heals), keep camera, retry WHIP.
            if (isWhip404 && refreshStreamKey) {
                teardownPeerConnection();
                toast.message('Stream credentials expired — refreshing…');
                try {
                    const newKey = await refreshStreamKey();
                    if (newKey) {
                        activeStreamKeyRef.current = newKey;
                        await connectWhip(newKey);
                        setStatus('live');
                        toast.success('Broadcast started successfully!');
                        return;
                    }
                } catch (retryErr) {
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
                isWhip404
                    ? 'Broadcast failed: stream not found on Livepeer. Refresh the page or recreate your stream.'
                    : `Broadcast failed: ${message}`,
            );
            // Keep camera/mic preview alive so the creator can retry Go Live.
            teardownPeerConnection();
        }
    };

    const stopBroadcast = () => {
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

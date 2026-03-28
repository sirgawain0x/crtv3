import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

export type BroadcastStatus = 'idle' | 'loading' | 'live' | 'error';

interface UseBroadcastProps {
    ingestUrl?: string | null;
    streamKey?: string | null;
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
}

export function useBroadcast({ ingestUrl, streamKey }: UseBroadcastProps): UseBroadcastReturn {
    const [status, setStatus] = useState<BroadcastStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

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
        };
    }, [initStream]);


    const startBroadcast = async () => {
        if (!ingestUrl && !streamKey) {
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
            let endpointUrl = ingestUrl;
            let iceServers: RTCIceServer[] = [
                { urls: 'stun:stun.l.google.com:19302' }
            ];

            // Prioritize explicit stream key discovery as per Livepeer documentation
            // "Get the SDP Host ... make a HEAD request to the WebRTC redirect endpoint"
            if (streamKey) {
                try {
                    // Rule: livepeer-in-browser-broadcasting.md
                    const discoveryUrl = `https://livepeer.studio/webrtc/${streamKey}`;
                    logger.debug("Discovering WHIP endpoint from:", discoveryUrl);

                    const headRes = await fetch(discoveryUrl, { method: 'HEAD' });

                    // The fetch API follows redirects by default, so .url is the final destination
                    endpointUrl = headRes.url;
                    logger.debug("Resolved WHIP endpoint:", endpointUrl);

                    // Use host for ICE
                    const host = new URL(endpointUrl).host;
                    iceServers = [
                        { urls: `stun:${host}` },
                        {
                            urls: `turn:${host}`,
                            username: 'livepeer',
                            credential: 'livepeer'
                        }
                    ];
                } catch (e) {
                    logger.error("Failed to discover optimized WHIP endpoint:", e);
                    // Fallback to ingestUrl if available, otherwise error
                }
            }

            if (!endpointUrl) {
                throw new Error("Could not resolve valid WHIP endpoint.");
            }

            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = pc;

            // Add tracks
            mediaStreamRef.current.getTracks().forEach(track => {
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
            // Note: We use the resolved endpointUrl which should be the playback/webrtc URL that accepts POST
            logger.debug(`Posting SDP offer to: ${endpointUrl}`);

            const response = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/sdp'
                },
                body: offerSdp
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`WHIP Request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const answerSdp = await response.text();
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));

            setStatus('live');
            toast.success('Broadcast started successfully!');

        } catch (err: any) {
            logger.error('Broadcast error:', err);
            setError(err.message || 'Failed to start broadcast');
            setStatus('error');
            toast.error(`Broadcast failed: ${err.message}`);
            stopBroadcast(); // Cleanup
        }
    };

    const stopBroadcast = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
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
        error
    };
}


import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type TranscodeStatus = 'idle' | 'loading' | 'transcoding' | 'complete' | 'error';

export const useTranscoder = () => {
    const [status, setStatus] = useState<TranscodeStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);

    const loadenv = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpeg = ffmpegRef.current;

        // Handle log messages
        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg log:', message);
        });

        ffmpeg.on('progress', ({ progress, time }) => {
            setProgress(Math.round(progress * 100));
        });

        // Load ffmpeg.wasm
        // We use toBlobURL to bypass some CORS issues and ensure correct MIME types
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        setLoaded(true);
    }

    const transcode = async (file: File): Promise<File | null> => {
        try {
            setStatus('loading');
            setError(null);
            setProgress(0);

            if (!loaded) {
                await loadenv();
            }

            setStatus('transcoding');
            const ffmpeg = ffmpegRef.current;

            // Write the file to ffmpeg's virtual file system
            // We use fetchFile to convert File object to Uint8Array
            await ffmpeg.writeFile('input', await fetchFile(file));

            // Run the ffmpeg command
            // -i input : input file
            // -c:v libx264 : use H.264 video codec (widely supported)
            // -preset ultrafast : trade compression efficiency for speed
            // -c:a aac : use AAC audio codec
            // output.mp4 : output filename
            await ffmpeg.exec(['-i', 'input', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', 'output.mp4']);

            // Read the result
            const data = await ffmpeg.readFile('output.mp4');

            // Create a new File object
            // Create a new File object
            // Cast data to any to avoid TypeScript error: Type 'FileData' is not assignable to type 'BlobPart'
            // This happens because ffmpeg.wasm uses Uint8Array<ArrayBufferLike> which TS thinks might be SharedArrayBuffer
            const transcodFile = new File([data as any], file.name.replace(/\.[^/.]+$/, "") + ".mp4", {
                type: 'video/mp4'
            });

            setStatus('complete');
            return transcodFile;

        } catch (err: any) {
            console.error('Transcoding error:', err);
            setError(err.message || 'Failed to transcode video');
            setStatus('error');
            return null;
        }
    };

    const reset = () => {
        setStatus('idle');
        setProgress(0);
        setError(null);
    };

    return {
        transcode,
        status,
        progress,
        error,
        reset
    };
};

// import React, { useEffect, useRef, useState } from 'react';
// import ReactPlayer, { ReactPlayerProps } from 'react-player';

// interface VideoPlayerProps {
//   url: string;
//   subtitlesJson?: string;
// }

// interface Subtitle {
//     start: number;
//     end: number;
//     text: string;
// }

// const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, subtitlesJson }) => {
//   const playerRef = useRef<ReactPlayer>(null);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
//   const subtitles:Chunk[] = [
//     { start: 0, end: 5, text: "Hello, world!" },
//     { start: 5, end: 10, text: "How are you?" },
//     // Add more subtitles as needed
//   ];

//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       if (playerRef.current) {
//         setCurrentTime(playerRef.current.getCurrentTime());
//       }
//     }, 100);

//     return () => clearInterval(intervalId);
//   }, []);

//   useEffect(() => {
//     const subtitle = subtitles.find(
//       (sub) => sub.start <= currentTime && sub.end >= currentTime
//     ) || null;
//     setCurrentSubtitle(subtitle);
//   }, [currentTime, subtitles]);

//   return (
//     <div>
//       <ReactPlayer
//         ref={playerRef}
//         url={url}
//         controls
//         onProgress={(progress: any) => setCurrentTime(progress.playedSeconds)}
//       />
//       {currentSubtitle && <p>{currentSubtitle.text}</p>}
//     </div>
//   );
// };

// export default VideoPlayer;
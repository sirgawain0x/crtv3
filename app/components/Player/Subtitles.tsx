'use client'

import React, 
  { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    ReactNode 
} from 'react';
import { FaClosedCaptioning } from "react-icons/fa";
import {
  MediaScopedProps,
  useMediaContext,
  useStore,
} from "@livepeer/react/player";
import type { CSSProperties } from "react";
import { Subtitles } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { Chunk } from 'livepeer/models/components';

interface SubtitlesContextType {
  showSubtitles: boolean;
  toggleSubtitles: () => void;
  language: string;
  setLanguage: (language: string) => void;
}

const SubtitlesContext = createContext<SubtitlesContextType | undefined>(undefined);

export function SubtitlesProvider({ children }: { children: ReactNode }) {
  const [showSubtitles, setShowSubtitles] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('en');

  const toggleSubtitles = () => {
    setShowSubtitles((prev) => !prev);
  }

  return (
    <SubtitlesContext.Provider value={{ showSubtitles, toggleSubtitles, language, setLanguage }}>
      {children}
    </SubtitlesContext.Provider>
  )
}

export function useSubtitles() {
  const context = useContext(SubtitlesContext);
  if (context === undefined) {
    throw new Error('useSubtitles must be used within a SubtitlesProvider');
  }
  return context;
}

export function SubtitlesControl() {
  const { showSubtitles, toggleSubtitles } = useSubtitles()

  return (
    <button
      onClick={toggleSubtitles}
      aria-label={showSubtitles ? 'Disable subtitles' : 'Enable subtitles'}
      className={`w-8 h-8 flex items-center justify-center rounded-full ${
        showSubtitles ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'
      }`}
    >
      <FaClosedCaptioning className="w-4 h-4" />
    </button>
  )
}

export function SubtitlesDisplay({ __scopeMedia, subtitles, style }: MediaScopedProps & { subtitles: Subtitles; style?: CSSProperties }) {
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

  const { language, showSubtitles } = useSubtitles();

  const context = useMediaContext("CurrentSource", __scopeMedia);
  const { progress, fullscreen } = useStore(context.store, ({ progress, fullscreen }) => ({
    progress,
    fullscreen
  }));

  useEffect(() => {
    const updateSubtitle = () => {
      const currentTime = progress ?? 0;
      const activeSubtitle = subtitles[language].find((subtitle: Chunk) => 
        currentTime >= subtitle.timestamp[0] && currentTime < subtitle.timestamp[1]
      );
      setCurrentSubtitle(activeSubtitle ? activeSubtitle.text : '');
    }
    updateSubtitle();
  }, [progress, subtitles]);

  if (!showSubtitles) return null;

  return (
    <>
      <div
        className="absolute bottom-4 left-0 right-0 text-center"
        style={
          /* TODO: handle style prop if needed, if not, skip-- style !== undefined ? style :
          /* TODO: handle fullscreen styles-- fullscreen ? { bottom: '10%' } : */ {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          padding: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px black',
        }}
      >
        {currentSubtitle}
      </div>
    </>
  )
}
'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  playEpicMoment: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted (browser autoplay policy)
  const [volume, setVolumeState] = useState(0.5);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Create audio element
    audioRef.current = new Audio('/audio/fire.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = volume;
    audioRef.current.muted = isMuted;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsMuted(false); // Unmute when user clicks play
      }).catch(console.error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  };

  // Play a short epic moment (for match selection, AI response, etc.)
  const playEpicMoment = () => {
    if (!audioRef.current || isPlaying) return;

    audioRef.current.currentTime = 0;
    audioRef.current.muted = false;
    setIsMuted(false);

    audioRef.current.play().then(() => {
      setIsPlaying(true);
      // Stop after 15 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      }, 15000);
    }).catch(console.error);
  };

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        togglePlay,
        toggleMute,
        setVolume,
        playEpicMoment,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

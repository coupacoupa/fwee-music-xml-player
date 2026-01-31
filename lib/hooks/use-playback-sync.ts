import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '@/lib/stores/playback-store';
import { PlaybackState } from '@/lib/types';

/**
 * Custom hook to sync playback state with UI timer
 * Updates current time display every second during playback
 */
export function usePlaybackSync() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { playbackState, setCurrentTime, position } = usePlaybackStore();

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Start timer if playing
    if (playbackState === PlaybackState.PLAYING) {
      timerRef.current = setInterval(() => {
        setCurrentTime(position.currentTime + 1);
      }, 1000);
    }

    // Cleanup on state change or unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playbackState, position.currentTime, setCurrentTime]);

  return timerRef;
}

/**
 * Format seconds into MM:SS display format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert timestamp (in quarter notes) to seconds based on BPM
 */
export function timestampToSeconds(timestamp: number, bpm: number): number {
  // timestamp is in quarter notes
  // 1 quarter note = 60/BPM seconds
  return (timestamp * 4) * (60 / bpm);
}

/**
 * Convert seconds to timestamp (in quarter notes) based on BPM
 */
export function secondsToTimestamp(seconds: number, bpm: number): number {
  // Inverse of timestampToSeconds
  return (seconds / (60 / bpm)) / 4;
}

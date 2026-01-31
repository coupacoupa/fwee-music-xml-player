import * as Tone from 'tone';
import type { NoteInfo } from '@/lib/types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Get note name from MIDI number
 */
export function getNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
}

/**
 * Get octave number from MIDI number
 */
export function getOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/**
 * Check if a MIDI note is a black key
 */
export function isBlackKey(midi: number): boolean {
  const name = getNoteName(midi);
  return name.includes('#');
}

/**
 * Convert MIDI note number to frequency in Hz
 */
export function midiToFrequency(midi: number): number {
  return Tone.Frequency(midi, 'midi').toFrequency();
}

/**
 * Convert frequency to MIDI note number
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

/**
 * Get full note information from MIDI number
 */
export function getNoteInfo(midi: number): NoteInfo {
  const name = getNoteName(midi);
  const octave = getOctave(midi);
  const frequency = midiToFrequency(midi);
  
  return {
    midi,
    frequency,
    name,
    octave,
    isBlackKey: name.includes('#'),
  };
}

/**
 * Get full note name with octave (e.g., "C4", "A#3")
 */
export function getFullNoteName(midi: number): string {
  return `${getNoteName(midi)}${getOctave(midi)}`;
}

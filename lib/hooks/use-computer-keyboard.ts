import { useEffect, useState } from 'react';
import { usePlaybackStore } from '@/lib/stores/playback-store';
import { midiToFrequency } from '@/lib/utils/music-utils';
import * as Tone from 'tone';

// Key mapping: QWERTY row for upper octave, ZXCV row for lower octave
const KEY_TO_MIDI: { [key: string]: number } = {
  // Lower Octave (C3 - B3)
  'z': 48, // C3
  's': 49, // C#3
  'x': 50, // D3
  'd': 51, // D#3
  'c': 52, // E3
  'v': 53, // F3
  'g': 54, // F#3
  'b': 55, // G3
  'h': 56, // G#3
  'n': 57, // A3
  'j': 58, // A#3
  'm': 59, // B3

  // Upper Octave (C4 - B4)
  'q': 60, // C4
  '2': 61, // C#4
  'w': 62, // D4
  '3': 63, // D#4
  'e': 64, // E4
  'r': 65, // F4
  '5': 66, // F#4
  't': 67, // G4
  '6': 68, // G#4
  'y': 69, // A4
  '7': 70, // A#4
  'u': 71, // B4
};

export const KEY_LABELS: { [midi: number]: string } = {};
Object.entries(KEY_TO_MIDI).forEach(([key, midi]) => {
  KEY_LABELS[midi] = key.toUpperCase();
});

export function useComputerKeyboard() {
  const { sampler, pianoLoaded } = usePlaybackStore();
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const midi = KEY_TO_MIDI[key];

      if (midi) {
        setPressedKeys(prev => {
          if (prev.has(midi)) return prev;
          const next = new Set(prev);
          next.add(midi);
          return next;
        });

        if (sampler && pianoLoaded) {
          await Tone.start();
          const freq = midiToFrequency(midi);
          sampler.triggerAttack(freq);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const midi = KEY_TO_MIDI[key];

      if (midi) {
        setPressedKeys(prev => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
        
        if (sampler && pianoLoaded) {
          const freq = midiToFrequency(midi);
          sampler.triggerRelease(freq);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sampler, pianoLoaded]);

  return { pressedKeys };
}

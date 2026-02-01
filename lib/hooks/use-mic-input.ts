import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { PitchDetector } from 'pitchy';
import { useCoachStore } from '@/lib/stores/coach-store';

interface DetectedNote {
  midi: number;
  frequency: number;
  timestamp: number;
  confidence: number;
}

interface UseMicInputReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useMicInput(): UseMicInputReturn {
  const { 
    setRecording, 
    setDetectedNotes, 
    setMicPermissionGranted, 
    setMicError,
    detectedNotes 
  } = useCoachStore();

  const micRef = useRef<Tone.UserMedia | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const pitchDetectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const analyzerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = useCallback(async () => {
    try {
      console.log('[MIC] Starting recording...');
      setMicError(null);
      
      // Request microphone access
      await Tone.start();
      console.log('[MIC] Tone.js started');
      
      const mic = new Tone.UserMedia();
      await mic.open();
      
      micRef.current = mic;
      setMicPermissionGranted(true);
      console.log('[MIC] Microphone opened successfully');

      // Create audio context for Pitchy
      const audioContext = Tone.getContext().rawContext as AudioContext;
      audioContextRef.current = audioContext;
      const sampleRate = audioContext.sampleRate;

      // Create Tone.js Analyser (time-domain for waveform data)
      const analyser = new Tone.Analyser('waveform', 2048);
      mic.connect(analyser);
      analyserRef.current = analyser;

      // Create Pitchy detector
      const detector = PitchDetector.forFloat32Array(2048);
      pitchDetectorRef.current = detector;
      console.log('[MIC] Pitchy detector initialized (sample rate: ' + sampleRate + ')');

      setRecording(true);

      // Start analyzing audio with Pitchy
      analyzerIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !pitchDetectorRef.current) return;

        // Get time-domain data (waveform)
        const buffer = analyserRef.current.getValue() as Float32Array;
        
        // Detect pitch using Pitchy
        const [frequency, clarity] = pitchDetectorRef.current.findPitch(buffer, sampleRate);

        // Clarity is 0-1, higher is more confident
        // Only accept pitches with reasonable clarity
        if (clarity > 0.9 && frequency > 0) {
          const midi = frequencyToMidi(frequency);
          
          // Only detect piano range (A0 to C8: MIDI 21-108)
          if (midi >= 21 && midi <= 108) {
            const note: DetectedNote = {
              midi: Math.round(midi),
              frequency,
              timestamp: Date.now(),
              confidence: clarity,
            };

            console.log(`[MIC] 🎵 Note detected: MIDI ${Math.round(midi)} (${frequency.toFixed(1)} Hz, clarity: ${(clarity * 100).toFixed(0)}%)`);
            
            // Use functional update to avoid stale closure
            const currentNotes = useCoachStore.getState().detectedNotes;
            setDetectedNotes([...currentNotes, note]);
          }
        }
      }, 100); // Analyze every 100ms

    } catch (err) {
      console.error('Microphone access error:', err);
      setMicError('Failed to access microphone. Please grant permission.');
      setRecording(false);
    }
  }, [setRecording, setDetectedNotes, setMicPermissionGranted, setMicError]);

  const stopRecording = useCallback(() => {
    console.log('[MIC] Stopping recording...');
    
    // Stop analyzer
    if (analyzerIntervalRef.current) {
      clearInterval(analyzerIntervalRef.current);
      analyzerIntervalRef.current = null;
    }

    // Disconnect and close mic
    if (micRef.current) {
      micRef.current.close();
      micRef.current = null;
    }

    // Dispose analyser
    if (analyserRef.current) {
      analyserRef.current.dispose();
      analyserRef.current = null;
    }

    pitchDetectorRef.current = null;
    audioContextRef.current = null;

    setRecording(false);
    console.log('[MIC] Recording stopped');
  }, [setRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    startRecording,
    stopRecording,
  };
}

// Convert frequency to MIDI note number
function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

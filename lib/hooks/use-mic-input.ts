import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { BasicPitch, outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } from '@spotify/basic-pitch';
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

const BASIC_PITCH_SAMPLE_RATE = 22050;
const ANALYSIS_WINDOW_SECONDS = 0.5; // Process every 500ms
const MIN_CONFIDENCE = 0.3; // Basic Pitch confidence threshold

export function useMicInput(): UseMicInputReturn {
  const { 
    setRecording, 
    addDetectedNote, 
    setLiveMicNotes,
    setMicPermissionGranted, 
    setMicError,
  } = useCoachStore();

  const micRef = useRef<Tone.UserMedia | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const basicPitchRef = useRef<BasicPitch | null>(null);
  const analyzerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef(false);
  const lastProcessedFrameRef = useRef(-1);
  
  // Audio buffer to accumulate data for polyphonic detection
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));

  // Initialize Basic Pitch
  useEffect(() => {
    if (!basicPitchRef.current) {
      console.log('[MIC] Initializing Basic Pitch...');
      basicPitchRef.current = new BasicPitch('/models/basic-pitch/model.json');
    }
  }, []);

  const resample = (buffer: Float32Array, fromRate: number, toRate: number): Float32Array => {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const weight = pos - index;
      if (index + 1 < buffer.length) {
        result[i] = buffer[index] * (1 - weight) + buffer[index + 1] * weight;
      } else {
        result[i] = buffer[index];
      }
    }
    return result;
  };

  const startRecording = useCallback(async () => {
    try {
      console.log('[MIC] Starting recording with Basic Pitch...');
      setMicError(null);
      
      await Tone.start();
      
      const mic = new Tone.UserMedia();
      await mic.open();
      
      micRef.current = mic;
      setMicPermissionGranted(true);

      const sampleRate = Tone.getContext().sampleRate;
      const analyser = new Tone.Analyser('waveform', 4096);
      mic.connect(analyser);
      analyserRef.current = analyser;

      setRecording(true);
      audioBufferRef.current = new Float32Array(0);
      lastProcessedFrameRef.current = -1;

      analyzerIntervalRef.current = setInterval(async () => {
        if (!analyserRef.current || !basicPitchRef.current || isAnalyzingRef.current) return;

        const newData = analyserRef.current.getValue() as Float32Array;
        
        // Append to our rolling buffer (keep up to 1 second)
        const maxSamples = sampleRate * 1.0; 
        const combined = new Float32Array(Math.min(maxSamples, audioBufferRef.current.length + newData.length));
        
        if (audioBufferRef.current.length + newData.length > maxSamples) {
          const keepFromOld = maxSamples - newData.length;
          combined.set(audioBufferRef.current.slice(audioBufferRef.current.length - keepFromOld), 0);
          combined.set(newData, keepFromOld);
        } else {
          combined.set(audioBufferRef.current, 0);
          combined.set(newData, audioBufferRef.current.length);
        }
        audioBufferRef.current = combined;

        if (combined.length < sampleRate * 0.2) return;

        isAnalyzingRef.current = true;
        try {
          const resampled = resample(combined, sampleRate, BASIC_PITCH_SAMPLE_RATE);

          const frames: number[][] = [];
          const onsets: number[][] = [];
          const contours: number[][] = [];

          await basicPitchRef.current.evaluateModel(
            resampled,
            (f, o, c) => {
              frames.push(...f);
              onsets.push(...o);
              contours.push(...c);
            },
            () => {}
          );

          // Get polyphonic notes
          // Fine-tuning thresholds: 0.45/0.35 (balancing noise vs D4 detection)
          const detectedNotesRaw = outputToNotesPoly(frames, onsets, 0.45, 0.35, 3);
          const notesWithBends = addPitchBendsToNoteEvents(contours, detectedNotesRaw);
          const notes = noteFramesToTime(notesWithBends);

          const timestamp = Date.now();
          
          // 1. Update LIVE notes for the keyboard (real-time feedback)
          // Keep this sensitive so the user can see noise vs actual notes
          const liveNotes = notes
            .filter(n => n.amplitude > 0.3) 
            .map(n => ({
              midi: Math.round(n.pitchMidi),
              confidence: n.amplitude,
            }));
          
          setLiveMicNotes(liveNotes);

          // 2. Identify NEW notes for the event history (practice mode)
          // Threshold here is the primary noise gate for practice movement
          const bufferDuration = combined.length / sampleRate;
          const newAudioDuration = 0.5; // We shift by 0.5s
          const cutoffTime = bufferDuration - newAudioDuration;

          notes.forEach((note) => {
            // Increased amplitude requirement to 0.4 to reduce noise in practice mode
            if (note.amplitude > 0.4 && note.startTimeSeconds > cutoffTime) {
               console.log(`[MIC] 🎯 NEW note ingest: MIDI ${Math.round(note.pitchMidi)} (amp: ${note.amplitude.toFixed(2)}, start: ${note.startTimeSeconds.toFixed(2)}s)`);
               addDetectedNote({
                 midi: Math.round(note.pitchMidi),
                 frequency: Math.pow(2, (note.pitchMidi - 69) / 12) * 440,
                 timestamp,
                 confidence: note.amplitude,
               });
            } else if (note.amplitude > 0.35) {
               // Already processed in previous window or too quiet
               // console.log(`[MIC] Skipping old/quiet note: MIDI ${Math.round(note.pitchMidi)} at ${note.startTimeSeconds.toFixed(2)}s`);
            }
          });

        } catch (err) {
          console.error('[MIC] Analysis error:', err);
        } finally {
          isAnalyzingRef.current = false;
        }
      }, ANALYSIS_WINDOW_SECONDS * 1000); 

    } catch (err) {
      console.error('Microphone access error:', err);
      setMicError('Failed to access microphone. Please grant permission.');
      setRecording(false);
    }
  }, [setRecording, addDetectedNote, setLiveMicNotes, setMicPermissionGranted, setMicError]);

  const stopRecording = useCallback(() => {
    console.log('[MIC] Stopping recording...');
    
    if (analyzerIntervalRef.current) {
      clearInterval(analyzerIntervalRef.current);
      analyzerIntervalRef.current = null;
    }

    if (micRef.current) {
      micRef.current.close();
      micRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.dispose();
      analyserRef.current = null;
    }

    setRecording(false);
    setLiveMicNotes([]);
    isAnalyzingRef.current = false;
  }, [setRecording, setLiveMicNotes]);

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


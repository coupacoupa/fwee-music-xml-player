import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import * as Tone from 'tone';
import type { PlaybackStoreState, PlaybackState as PlaybackStateEnum } from '@/lib/types';
import { PlaybackState } from '@/lib/types';

export const usePlaybackStore = create<PlaybackStoreState>()(
  devtools(
    (set, get) => ({
      // Initial State
      playbackState: PlaybackState.STOPPED,
      position: {
        currentTime: 0,
        currentTimestamp: 0,
        totalDuration: undefined,
      },
      bpm: 100,
      activeNotes: [],
      pianoLoaded: false,
      osmd: null,
      sampler: null,

      // Actions
      stepForward: () => {
        const { osmd, bpm } = get();
        if (osmd?.cursor) {
          osmd.cursor.next();
          
          const currentTimestamp = osmd.cursor.iterator.currentTimeStamp.RealValue;
          const currentSeconds = (currentTimestamp * 4) * (60 / bpm);
          
          set({
            position: {
              currentTime: currentSeconds,
              currentTimestamp: currentTimestamp,
            },
          });
        }
      },

      stepBackward: () => {
        const { osmd, bpm } = get();
        if (osmd?.cursor) {
          osmd.cursor.previous();
          
          const currentTimestamp = osmd.cursor.iterator.currentTimeStamp.RealValue;
          const currentSeconds = (currentTimestamp * 4) * (60 / bpm);
          
          set({
            position: {
              currentTime: currentSeconds,
              currentTimestamp: currentTimestamp,
            },
          });
        }
      },
      play: async () => {
        const { osmd, pianoLoaded, sampler } = get();
        
        if (!osmd || !pianoLoaded || !sampler) {
          console.warn('Cannot play: OSMD or sampler not ready');
          return;
        }

        await Tone.start();

        // Sync Transport to current cursor position
        const currentTimestamp = osmd.cursor.iterator.currentTimeStamp.RealValue;
        const currentSeconds = (currentTimestamp * 4) * (60 / get().bpm);
        Tone.getTransport().seconds = currentSeconds;
        Tone.getTransport().start();
        
        // Show cursor
        set({ playbackState: PlaybackState.PLAYING });
        
        // Start the playback engine
        get().scheduleNextNote();
      },

      pause: () => {
        Tone.getTransport().pause();
        Tone.getTransport().cancel(); // Clear pending next-note events
        get().sampler?.releaseAll();
        set({ 
          playbackState: PlaybackState.PAUSED,
          activeNotes: [],
        });
      },

      stop: () => {
        Tone.getTransport().stop();
        Tone.getTransport().cancel(); // Clear all scheduled events
        get().sampler?.releaseAll();
        set({ 
          playbackState: PlaybackState.STOPPED,
          activeNotes: [],
        });
      },

      reset: () => {
        const { osmd } = get();
        
        get().stop();
        
        if (osmd?.cursor) {
          osmd.cursor.reset();
          osmd.cursor.show();
        }
        
        set({
          position: {
            currentTime: 0,
            currentTimestamp: 0,
          },
        });
      },

      setBpm: (bpm: number) => {
        Tone.getTransport().bpm.value = bpm;
        set({ bpm });
      },

      setCurrentTime: (currentTime: number) => {
        set((state) => ({
          position: {
            ...state.position,
            currentTime,
          },
        }));
      },

      setActiveNotes: (activeNotes: import('@/lib/types').ActiveNote[]) => {
        set({ activeNotes });
      },

      seekToTimestamp: (targetTimestamp: number) => {
        const { osmd, playbackState } = get();
        
        if (!osmd?.cursor) return;

        // Stop playback if playing
        const wasPlaying = playbackState === PlaybackState.PLAYING;
        if (wasPlaying) {
          get().stop();
        }

        // Reset cursor and seek to target
        const cursor = osmd.cursor;
        cursor.reset();
        
        const iterator = cursor.iterator;
        while (!iterator.EndReached && iterator.currentTimeStamp.RealValue < targetTimestamp) {
          iterator.moveToNext();
        }
        
        cursor.update();
        
        // Update position
        const { bpm } = get();
        const currentTime = (targetTimestamp * 4) * (60 / bpm);
        set({
          position: {
            currentTime,
            currentTimestamp: targetTimestamp,
          },
        });

        // Resume playback if it was playing
        if (wasPlaying) {
          get().play();
        }
      },

      setOsmd: (osmd) => {
        let initialBpm = 100;
        
        if (osmd && osmd.Sheet) {
          try {
            // Try to find BPM in MetronomeMarks (this covers <metronome> tags)
            const sheet = osmd.Sheet as any;
            if (sheet.MetronomeMarks && sheet.MetronomeMarks.length > 0) {
              // MetronomeMarks is often an array of objects with TempoInBPM
              const mark = sheet.MetronomeMarks[0];
              if (mark && mark.TempoInBPM) {
                 initialBpm = mark.TempoInBPM;
              }
            } 
            // Also check the first SourceMeasure for TempoInBPM (often populated types)
            else if (sheet.SourceMeasures && sheet.SourceMeasures.length > 0) {
               const firstMeasure = sheet.SourceMeasures[0];
               if (firstMeasure && firstMeasure.TempoInBPM) {
                 initialBpm = firstMeasure.TempoInBPM;
               }
            }
          } catch (e) {
            console.warn("Failed to extract BPM from sheet", e);
          }
        }
        
        // Ensure reasonable BPM range
        if (initialBpm < 20) initialBpm = 20;
        if (initialBpm > 300) initialBpm = 300;

        // Apply to Tone Transport
        Tone.getTransport().bpm.value = initialBpm;

        set({ osmd, bpm: initialBpm });
      },

      setSampler: (sampler) => {
        set({ sampler });
      },

      setPianoLoaded: (pianoLoaded) => {
        set({ pianoLoaded });
      },

      scheduleNextNote: () => {
        const { osmd, sampler, bpm, playbackState } = get();
        
        // Safety checks
        if (!osmd?.cursor || playbackState !== PlaybackState.PLAYING) return;

        const iterator = osmd.cursor.iterator;
        
        // Check if we've reached the end
        if (iterator.EndReached) {
          get().stop();
          return;
        }

        // Get current voice entries (notes at this position)
        const currentVoiceEntries = iterator.CurrentVoiceEntries;
        
        if (currentVoiceEntries && currentVoiceEntries.length > 0) {
          const activeNotes: import('@/lib/types').ActiveNote[] = [];
          
          // Play notes
          currentVoiceEntries.forEach((entry: any) => {
            // Determine staff index
            let staffId = 1;
            try {
               staffId = entry.ParentSourceStaffEntry?.ParentStaff?.Id || 1;
            } catch (e) {
               console.warn("Could not determine staff ID", e);
            }

            if (entry.Notes) {
              entry.Notes.forEach((note: any) => {
                if (note.Pitch) {
                  const freq = note.Pitch.Frequency;
                  if (freq > 0) {
                    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
                    
                    // Add to active notes for visual feedback regardless of tie state
                    activeNotes.push({ 
                        midi,
                        staffIndex: staffId - 1 
                    });

                    // AUDIO PLAYBACK LOGIC
                    // Check for Ties to determine if we should attack or hold
                    const tie = note.NoteTie;
                    let shouldAttack = true;
                    let duration = note.Length.RealValue;

                    if (tie) {
                        // If we are the destination of a tie (not the start), do not re-attack
                        // NoteTie normally points to the tie object where this note is involved.
                        // If this note is NOT the start note of the tie, it's a continuation.
                        if (tie.StartNote !== note) {
                            shouldAttack = false;
                        } else {
                            // If we ARE the start note, play for the full duration of the tie chain
                            // NoteTie.Notes contains all notes in the tie chain
                            if (tie.Notes) {
                                duration = tie.Notes.reduce((acc: number, n: any) => acc + n.Length.RealValue, 0);
                            }
                        }
                    }

                    if (shouldAttack) {
                        // Convert musical duration to seconds
                        // Formula: RealValue (1.0 = whole) * 4 (quarters) * (60/BPM)
                        const audioDurationSeconds = duration * 4 * (60 / Tone.getTransport().bpm.value);
                        sampler?.triggerAttackRelease(freq, audioDurationSeconds, Tone.now());
                    }
                  }
                }
              });
            }
          });
          
          set({ activeNotes });
        }

        // Calculate duration to next note (for stepper)
        const currentTimestamp = iterator.currentTimeStamp.RealValue;
        let durationToNext = 0;

        // Verify if we have a valid next timestamp from iterator
        if (!iterator.EndReached) {
           // Create a clone to check next timestamp
           const nextIterator = iterator.clone();
           nextIterator.moveToNext();
           if (!nextIterator.EndReached) {
             durationToNext = nextIterator.currentTimeStamp.RealValue - currentTimestamp;
           } else {
             // Fallback if at end
             const timestamps = currentVoiceEntries
              .map((v: any) => v.Notes?.[0]?.Length?.RealValue)
              .filter((d: number) => d > 0);
             if (timestamps.length > 0) durationToNext = Math.min(...timestamps);
             else durationToNext = 0.25;
           }
        } 

        if (durationToNext <= 0) durationToNext = 0.125; // Safety fallback

        // Calculate time in seconds
        const currentBpm = Tone.getTransport().bpm.value;
        const currentSeconds = (currentTimestamp * 4) * (60 / currentBpm);
        const nextSeconds = ((currentTimestamp + durationToNext) * 4) * (60 / currentBpm);
        
        // Update current time
        set({
          position: {
            currentTime: currentSeconds,
            currentTimestamp,
          },
        });

        // Schedule next note
        Tone.getTransport().scheduleOnce(() => {
          osmd.cursor.next();
          get().scheduleNextNote();
        }, nextSeconds);
      },
    }),
    { name: 'PlaybackStore' }
  )
);

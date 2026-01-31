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
      play: async () => {
        const { osmd, pianoLoaded, sampler } = get();
        
        if (!osmd || !pianoLoaded || !sampler) {
          console.warn('Cannot play: OSMD or sampler not ready');
          return;
        }

        await Tone.start();
        Tone.getTransport().start();
        
        // Show cursor
        set({ playbackState: PlaybackState.PLAYING });
        
        // Start the playback engine
        get().scheduleNextNote();
      },

      pause: () => {
        Tone.getTransport().pause();
        Tone.getTransport().cancel(); // Clear pending next-note events to prevent duplication on resume
        set({ 
          playbackState: PlaybackState.PAUSED,
          activeNotes: [],
        });
      },

      stop: () => {
        Tone.getTransport().stop();
        Tone.getTransport().cancel(); // Clear all scheduled events
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
        set({ osmd });
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
          
          // Calculate audio duration based on note lengths
          let audioDuration = 0.5; // fallback
          const noteDurations = currentVoiceEntries
            .map((v: any) => {
              if (v.Notes && v.Notes.length > 0) return v.Notes[0].Length.RealValue;
              return 0;
            })
            .filter((d: number) => d > 0);
            
          if (noteDurations.length > 0) {
            audioDuration = Math.max(...noteDurations) * 4 * (60 / Tone.getTransport().bpm.value);
          }

          // Play notes
          currentVoiceEntries.forEach((entry: any) => {
            // Determine staff index (1-based usually in OSMD, typically 1 for treble, 2 for bass)
            // We'll normalize 1 -> 0 (right/top), 2 -> 1 (left/bottom) if possible, or just store the ID.
            // entry.ParentSourceStaffEntry.ParentStaff.Id
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
                    sampler?.triggerAttackRelease(freq, audioDuration, Tone.now());
                    
                    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
                    activeNotes.push({ 
                        midi,
                        staffIndex: staffId - 1 // Normalize to 0-based index
                    });
                  }
                }
              });
            }
          });
          
          set({ activeNotes });
        }

        // Calculate duration to next note
        const currentTimestamp = iterator.currentTimeStamp.RealValue;
        let durationToNext = 0.25;
        
        const timestamps = currentVoiceEntries
          .map((v: any) => v.Notes?.[0]?.Length?.RealValue)
          .filter((d: number) => d > 0);
          
        if (timestamps.length > 0) {
          durationToNext = Math.min(...timestamps);
        } else if (currentVoiceEntries.length === 0) {
          durationToNext = 0.125; // Rest
        }

        // Calculate time in seconds
        const currentBpm = Tone.getTransport().bpm.value;
        const currentSeconds = (currentTimestamp * 4) * (60 / currentBpm);
        const nextSeconds = ((currentTimestamp + durationToNext) * 4) * (60 / currentBpm);
        const durationSeconds = nextSeconds - currentSeconds;

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
        }, `+${durationSeconds - 0.05}`);
      },
    }),
    { name: 'PlaybackStore' }
  )
);

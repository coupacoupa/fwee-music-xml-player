import { useEffect, useRef } from 'react';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { useCoachStore } from '@/lib/stores/coach-store';
import { usePlaybackStore } from '@/lib/stores/playback-store';

interface UsePracticeModeOptions {
  osmd: OpenSheetMusicDisplay | null;
  enabled?: boolean;
}

export function usePracticeMode({ osmd, enabled = true }: UsePracticeModeOptions) {
  const { detectedNotes, setExpectedNotes, isHintEnabled, setActiveHints } = useCoachStore();
  const currentTimestamp = usePlaybackStore(s => s.position.currentTimestamp);
  const lastProcessedIndexRef = useRef(0);
  const lastHitTimeRef = useRef(0);

  // Update expected notes initially and when OSMD or cursor position changes
  useEffect(() => {
    if (osmd && enabled) {
      const notes = getCurrentExpectedNotes(osmd);
      setExpectedNotes(notes);
    }
  }, [osmd, enabled, setExpectedNotes, currentTimestamp]); // Added currentTimestamp dependency

  const currentExpectedNotes = useCoachStore(s => s.expectedNotes);

  useEffect(() => {
      if (!osmd || !enabled) return;

      if (isHintEnabled) {
          updateHints(osmd);
      } else {
          setActiveHints([]);
      }
  }, [isHintEnabled, currentExpectedNotes, osmd, enabled, setActiveHints]);


  useEffect(() => {
    if (!enabled || !osmd) {
      return;
    }

    // Process new detected notes
    const newNotes = detectedNotes.slice(lastProcessedIndexRef.current);
    
    if (newNotes.length === 0) return;

    newNotes.forEach((note) => {
      // Prevent duplicate processing of the same note (debounce)
      const timeSinceLastHit = Date.now() - lastHitTimeRef.current;
      if (timeSinceLastHit < 200) {
        return;
      }

      // Get expected notes at cursor position
      const expectedNotes = getCurrentExpectedNotes(osmd);
      
      if (expectedNotes.length === 0) {
        return;
      }

      // Check if detected note matches expected note(s)
      if (checkNoteMatch(note.midi, expectedNotes)) {
        console.log('[PRACTICE] ✅ Correct note! Advancing cursor...');
        advanceCursor(osmd);
        lastHitTimeRef.current = Date.now();
        
        // Update expected notes for the new position
        const nextNotes = getCurrentExpectedNotes(osmd);
        setExpectedNotes(nextNotes);
        
        // Trigger visual feedback
        highlightCorrectNote(osmd);
      }
    });

    lastProcessedIndexRef.current = detectedNotes.length;
  }, [detectedNotes, osmd, enabled, setExpectedNotes]);
}

/**
 * Update active hints based on current cursor (Toggle Mode)
 */
function updateHints(osmd: OpenSheetMusicDisplay): void {
  try {
    const cursor = osmd.cursor;
    if (!cursor || !cursor.iterator) return;

    const voiceEntries = cursor.iterator.CurrentVoiceEntries;
    if (!voiceEntries || voiceEntries.length === 0) return;

    const hints: Array<{ midi: number; color: string }> = [];
    
    // Determine right hand staff (heuristic: first staff)
    const staves = osmd.Sheet.Staves;
    const rightStaffId = (staves && staves.length > 0) ? (staves[0] as any).id : -1;

    voiceEntries.forEach(entry => {
      if (!entry.Notes) return;

      // Access staff info via ParentVoice -> ParentStaff
      const parentStaff = (entry as any).ParentVoice?.ParentStaff || (entry as any).ParentSourceStaffEntry?.ParentStaff;
      const parentStaffId = parentStaff ? parentStaff.id : -1;
      
      const isRightHand = rightStaffId !== -1 && parentStaffId === rightStaffId;
      const color = isRightHand ? '#3b82f6' : '#f97316'; // Blue : Orange

      entry.Notes.forEach(note => {
        if (note.Pitch) {
          const freq = note.Pitch.Frequency;
          const midi = Math.round(12 * Math.log2(freq / 440) + 69);
          
          if (!hints.some(h => h.midi === midi)) {
            hints.push({ midi, color });
          }
        }
      });
    });

    // Update store immediately (no timeout)
    useCoachStore.getState().setActiveHints(hints);

  } catch (err) {
    console.error('[PRACTICE] Error updating hints:', err);
  }
}

/**
 * Get expected MIDI notes at current cursor position
 */
function getCurrentExpectedNotes(osmd: OpenSheetMusicDisplay): number[] {
  try {
    const cursor = osmd.cursor;
    if (!cursor || !cursor.iterator) return [];

    const currentVoiceEntries = cursor.iterator.CurrentVoiceEntries;
    if (!currentVoiceEntries || currentVoiceEntries.length === 0) return [];

    const expectedMidis: number[] = [];

    for (const entry of currentVoiceEntries) {
      if (entry.Notes) {
        for (const note of entry.Notes) {
          if (note.Pitch) {
            const freq = note.Pitch.Frequency;
            const midi = Math.round(12 * Math.log2(freq / 440) + 69);
            expectedMidis.push(midi);
          }
        }
      }
    }

    return expectedMidis;
  } catch (err) {
    console.error('[PRACTICE] Error getting expected notes:', err);
    return [];
  }
}

/**
 * Check if detected MIDI matches any expected MIDI (with tolerance)
 */
function checkNoteMatch(detectedMidi: number, expectedMidis: number[]): boolean {
  const tolerance = 1; // Allow ±1 semitone
  
  return expectedMidis.some(expectedMidi => 
    Math.abs(detectedMidi - expectedMidi) <= tolerance
  );
}

/**
 * Advance cursor to next note
 */
function advanceCursor(osmd: OpenSheetMusicDisplay): void {
  try {
    if (osmd.cursor) {
      osmd.cursor.next();
    }
  } catch (err) {
    console.error('[PRACTICE] Error advancing cursor:', err);
  }
}

/**
 * Highlight cursor with green flash for correct note
 */
function highlightCorrectNote(osmd: OpenSheetMusicDisplay): void {
  try {
    const cursorElement = osmd.cursor?.cursorElement;
    if (!cursorElement) return;

    // Add green flash class
    cursorElement.style.filter = 'drop-shadow(0 0 10px #10b981)';
    cursorElement.style.transition = 'filter 0.3s ease-out';

    // Remove after animation
    setTimeout(() => {
      cursorElement.style.filter = '';
    }, 300);
  } catch (err) {
    console.error('[PRACTICE] Error highlighting cursor:', err);
  }
}

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CoachStoreState {
  // State
  isRecording: boolean;
  detectedNotes: Array<{ midi: number; frequency: number; timestamp: number; confidence: number }>;
  micPermissionGranted: boolean;
  micError: string | null;
  expectedNotes: number[];
  isHintEnabled: boolean;
  activeHints: Array<{ midi: number; color: string }>;

  // Actions
  setRecording: (isRecording: boolean) => void;
  setDetectedNotes: (notes: Array<{ midi: number; frequency: number; timestamp: number; confidence: number }>) => void;
  setMicPermissionGranted: (granted: boolean) => void;
  setMicError: (error: string | null) => void;
  setExpectedNotes: (notes: number[]) => void;
  toggleHint: () => void;
  setActiveHints: (hints: Array<{ midi: number; color: string }>) => void;
}

export const useCoachStore = create<CoachStoreState>()(
  devtools(
    (set, get) => ({
      // Initial State
      isRecording: false,
      detectedNotes: [],
      micPermissionGranted: false,
      micError: null,
      expectedNotes: [],
      hintTimestamp: 0,
      activeHints: [],
      isHintEnabled: false,

      // Actions
      setRecording: (isRecording: boolean) => {
        set({ isRecording });
      },

      setDetectedNotes: (detectedNotes) => {
        set({ detectedNotes });
      },

      setMicPermissionGranted: (micPermissionGranted: boolean) => {
        set({ micPermissionGranted });
      },

      setMicError: (micError: string | null) => {
        set({ micError });
      },

      setExpectedNotes: (expectedNotes) => {
        // Only update if changed to avoid re-renders
        const current = get().expectedNotes;
        if (current.length === expectedNotes.length && current.every((n, i) => n === expectedNotes[i])) {
          return;
        }
        set({ expectedNotes });
      },

      toggleHint: () => {
        set((state) => ({ isHintEnabled: !state.isHintEnabled }));
      },

      setActiveHints: (activeHints) => {
        set({ activeHints });
      },
    }),
    { name: 'CoachStore' }
  )
);

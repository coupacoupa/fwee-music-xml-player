import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UIStoreState } from '@/lib/types';

export const useUIStore = create<UIStoreState>()(
  devtools(
    (set) => ({
      // Initial State
      isKeyboardVisible: true,
      isScoreManagerOpen: false,
      showPlaybackControls: true,
      showBPM: true,
      showTimer: true,
      zoom: 1.0,
      pianoKeySize: 28,
      contextMenu: null,

      // Actions
      toggleKeyboard: () => {
        set((state) => ({ isKeyboardVisible: !state.isKeyboardVisible }));
      },

      setScoreManagerOpen: (open: boolean) => {
        set({ isScoreManagerOpen: open });
      },

      togglePlaybackControls: () => {
        set((state) => ({ showPlaybackControls: !state.showPlaybackControls }));
      },

      toggleBPM: () => {
        set((state) => ({ showBPM: !state.showBPM }));
      },

      toggleTimer: () => {
        set((state) => ({ showTimer: !state.showTimer }));
      },

      setZoom: (zoom: number) => {
        // Clamp between 0.3 and 3.0
        const clampedZoom = Math.max(0.3, Math.min(3.0, zoom));
        set({ zoom: clampedZoom });
      },

      setPianoKeySize: (size: number) => {
        // Clamp between 20 and 50
        const clampedSize = Math.max(20, Math.min(50, size));
        set({ pianoKeySize: clampedSize });
      },

      showContextMenu: (x: number, y: number, sheetId: string) => {
        set({ contextMenu: { x, y, sheetId } });
      },

      hideContextMenu: () => {
        set({ contextMenu: null });
      },
    }),
    { name: 'UIStore' }
  )
);

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UIStoreState, ContextMenuState } from '@/lib/types';

export const useUIStore = create<UIStoreState>()(
  devtools(
    (set) => ({
      // Initial State
      isSidebarOpen: true,
      isKeyboardVisible: true,
      zoom: 1.0,
      pianoKeySize: 28,
      contextMenu: null,

      // Actions
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      toggleKeyboard: () => {
        set((state) => ({ isKeyboardVisible: !state.isKeyboardVisible }));
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

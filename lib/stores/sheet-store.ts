import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SheetStoreState } from '@/lib/types';
import type { Sheet } from '@/lib/db/schema';
import { getUserSheets, getMusicXMLContent, uploadSheet, deleteSheet } from '@/app/actions/sheet-actions';

export const useSheetStore = create<SheetStoreState>()(
  devtools(
    (set, get) => ({
      // Initial State
      sheets: [],
      selectedSheet: null,
      musicXmlUrl: null,
      loading: false,
      contentLoading: false,
      uploading: false,

      // Actions
      loadSheets: async (userId: string) => {
        set({ loading: true });
        
        try {
          const result = await getUserSheets(userId);
          if (result.success && result.sheets) {
            set({ sheets: result.sheets });
          }
        } catch (error) {
          console.error('Failed to load sheets:', error);
        } finally {
          set({ loading: false });
        }
      },

      selectSheet: (sheet: Sheet | null) => {
        set({ selectedSheet: sheet });
        
        // Load content if sheet is selected
        if (sheet) {
          get().loadSheetContent(sheet.id);
        } else {
          set({ musicXmlUrl: null });
        }
      },

      uploadSheet: async (formData: FormData, userId: string) => {
        set({ uploading: true });
        
        try {
          const result = await uploadSheet(formData);
          
          if (result.success && result.sheetId) {
            // Reload sheets
            await get().loadSheets(userId);
            
            // Select the newly uploaded sheet
            const freshSheets = await getUserSheets(userId);
            if (freshSheets.success && freshSheets.sheets) {
              const newSheet = freshSheets.sheets.find((s) => s.id === result.sheetId);
              if (newSheet) {
                get().selectSheet(newSheet);
              }
            }
          } else {
            throw new Error(result.error || 'Upload failed');
          }
        } catch (error) {
          console.error('Upload error:', error);
          throw error;
        } finally {
          set({ uploading: false });
        }
      },

      deleteSheet: async (sheetId: string, userId: string) => {
        try {
          const result = await deleteSheet(sheetId, userId);
          
          if (result.success) {
            // If the deleted sheet was selected, clear selection
            const { selectedSheet } = get();
            if (selectedSheet?.id === sheetId) {
              set({ selectedSheet: null, musicXmlUrl: null });
            }
            
            // Reload sheets
            await get().loadSheets(userId);
          } else {
            throw new Error(result.error || 'Delete failed');
          }
        } catch (error) {
          console.error('Delete error:', error);
          throw error;
        }
      },

      loadSheetContent: async (sheetId: string) => {
        set({ contentLoading: true });
        
        try {
          const result = await getMusicXMLContent(sheetId);
          
          if (result.success && result.url) {
            set({ musicXmlUrl: result.url });
          } else {
            throw new Error(result.error || 'Failed to load sheet content');
          }
        } catch (error) {
          console.error('Failed to load content:', error);
          throw error;
        } finally {
          set({ contentLoading: false });
        }
      },

      setMusicXmlUrl: (url: string | null) => {
        set({ musicXmlUrl: url });
      },
    }),
    { name: 'SheetStore' }
  )
);

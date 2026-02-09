import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type * as Tone from 'tone';
import type { Sheet } from '@/lib/db/schema';

// ============================================================================
// Playback Types
// ============================================================================

export enum PlaybackState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused',
}

export interface MusicPosition {
  /** Current time in seconds */
  currentTime: number;
  /** Current timestamp in OSMD notation (quarter notes) */
  currentTimestamp: number;
  /** Total duration in seconds (if available) */
  totalDuration?: number;
}

export interface PianoNote {
  /** MIDI note number (0-127) */
  midi: number;
  /** Frequency in Hz */
  frequency: number;
  /** Note name (e.g., "C4", "A#3") */
  name: string;
  /** Octave number */
  octave: number;
}

// ============================================================================
// Store State Types
// ============================================================================

export interface ActiveNote {
  midi: number;
  staffIndex: number; // 0 for top staff (usually right hand), 1 for bottom (usually left)
}

export interface PlaybackStoreState {
  // State
  playbackState: PlaybackState;
  position: MusicPosition;
  bpm: number;
  activeNotes: ActiveNote[];
  pianoLoaded: boolean;
  
  // References
  osmd: OpenSheetMusicDisplay | null;
  sampler: Tone.Sampler | null;
  
  // Actions
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  setBpm: (bpm: number) => void;
  setCurrentTime: (time: number) => void;
  setActiveNotes: (notes: ActiveNote[]) => void;
  seekToTimestamp: (timestamp: number) => void;
  setOsmd: (osmd: OpenSheetMusicDisplay | null) => void;
  setSampler: (sampler: Tone.Sampler | null) => void;
  setPianoLoaded: (loaded: boolean) => void;
  scheduleNextNote: () => void;
  stepForward: () => void;
  stepBackward: () => void;
}

export interface SheetStoreState {
  // State
  sheets: Sheet[];
  selectedSheet: Sheet | null;
  musicXmlUrl: string | null;
  loading: boolean;
  contentLoading: boolean;
  uploading: boolean;
  
  // Actions
  loadSheets: (userId: string) => Promise<void>;
  selectSheet: (sheet: Sheet | null) => void;
  uploadSheet: (formData: FormData, userId: string) => Promise<void>;
  deleteSheet: (sheetId: string, userId: string) => Promise<void>;
  renameSheet: (sheetId: string, userId: string, newTitle: string) => Promise<void>;
  loadSheetContent: (sheetId: string) => Promise<void>;
  setMusicXmlUrl: (url: string | null) => void;
}

export interface UIStoreState {
  // State
  isKeyboardVisible: boolean;
  isScoreManagerOpen: boolean;
  showPlaybackControls: boolean;
  showBPM: boolean;
  showTimer: boolean;
  zoom: number;
  pianoKeySize: number;
  contextMenu: ContextMenuState | null;
  
  showKeyBindings: boolean;
  
  // Actions
  toggleKeyboard: () => void;
  setScoreManagerOpen: (open: boolean) => void;
  togglePlaybackControls: () => void;
  toggleBPM: () => void;
  toggleTimer: () => void;
  toggleKeyBindings: () => void;
  setZoom: (zoom: number) => void;
  setPianoKeySize: (size: number) => void;
  showContextMenu: (x: number, y: number, sheetId: string) => void;
  hideContextMenu: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  sheetId: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface PianoKeyboardProps {
  /** Array of active MIDI note numbers to highlight */
  activeNotes?: ActiveNote[];
  /** Callback when a key is clicked */
  onNoteClick?: (midiNote: number) => void;
  /** Width of white keys in pixels */
  keyWidth?: number;
}

export interface MusicXMLDisplayProps {
  /** URL or path to the MusicXML file */
  url: string;
  /** Zoom level (0.3 - 3.0) */
  zoom?: number;
  /** Callback when OSMD instance is initialized */
  onOsmdInit?: (osmd: OpenSheetMusicDisplay) => void;
  /** Enable click-to-seek functionality */
  enableClickInteraction?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface NoteInfo {
  midi: number;
  frequency: number;
  name: string;
  octave: number;
  isBlackKey: boolean;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

export interface ChatStoreState {
  // State
  isChatOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;

  // Actions
  toggleChat: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  sendMessage: (content: string, image?: string) => Promise<void>;
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { Upload, Music2, ZoomIn, ZoomOut, LogOut, Trash2, FileMusic } from "lucide-react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { Play, Pause, RefreshCcw, Keyboard, Timer } from "lucide-react";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { useSheetStore } from "@/lib/stores/sheet-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAudioEngine } from "@/lib/hooks/use-audio-engine";
import { usePlaybackSync } from "@/lib/hooks/use-playback-sync";
import { formatTime } from "@/lib/utils/time-utils";
import { PlaybackState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Select, type SelectOption } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ContextMenu, type MenuItem } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { Dialog } from "@/components/ui/dialog";

const MusicXMLDisplay = dynamic(
  () => import("@/components/sheet-music/musicxml-display").then((mod) => mod.MusicXMLDisplay),
  { ssr: false }
);

export default function Home() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  
  // Dialog states
  const [uploadErrorDialog, setUploadErrorDialog] = useState<{open: boolean; message: string}>({ open: false, message: '' });
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; sheetId: string | null}>({ open: false, sheetId: null });
  
  // Initialize audio engine
  useAudioEngine();
  usePlaybackSync();
  
  // Playback store
  const {
    playbackState,
    position,
    bpm,
    pianoLoaded,
    play,
    pause,
    reset,
    setBpm,
    setOsmd,
  } = usePlaybackStore();
  
  // Sheet store
  const {
    sheets,
    selectedSheet,
    musicXmlUrl,
    loading: sheetsLoading,
    contentLoading,
    uploading,
    loadSheets,
    selectSheet,
    uploadSheet,
    deleteSheet,
  } = useSheetStore();
  
  // UI store
  const {
    isKeyboardVisible,
    zoom,
    pianoKeySize,
    contextMenu,
    toggleKeyboard,
    setZoom,
    setPianoKeySize,
    showContextMenu,
    hideContextMenu,
  } = useUIStore();

  // Load sheets when user logs in
  useEffect(() => {
    if (user) {
      loadSheets(user.id);
    }
  }, [user, loadSheets]);

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => {
      hideContextMenu();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [hideContextMenu]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['xml', 'musicxml', 'mxl'];
    
    if (!validExtensions.includes(extension || '')) {
      setUploadErrorDialog({ 
        open: true, 
        message: 'Please select a valid MusicXML file (.xml, .musicxml, or .mxl)' 
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      await uploadSheet(formData, user.id);
    } catch (err) {
      setUploadErrorDialog({ 
        open: true, 
        message: 'Upload failed. Please try again.' 
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteRequest = (sheetId: string) => {
    setDeleteDialog({ open: true, sheetId });
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteDialog.sheetId) return;
    
    try {
      await deleteSheet(deleteDialog.sheetId, user.id);
    } catch (err) {
      setUploadErrorDialog({ 
        open: true, 
        message: 'Failed to delete sheet. Please try again.' 
      });
    }
  };

  const togglePlayback = async () => {
    if (!pianoLoaded) return;
    
    if (playbackState === PlaybackState.PLAYING) {
      pause();
    } else {
      await play();
    }
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
  };

  // Convert sheets to SelectOptions
  const sheetOptions: SelectOption[] = useMemo(() => 
    sheets.map(sheet => ({
      id: sheet.id,
      label: sheet.title,
      icon: <FileMusic className="w-3.5 h-3.5" />,
    })),
    [sheets]
  );

  // Context menu items
  const contextMenuItems = useMemo<MenuItem[]>(() => {
    if (!contextMenu) return [];
    return [
      {
        id: 'open',
        label: 'Open Score',
        onClick: () => {
          const s = sheets.find(sh => sh.id === contextMenu.sheetId);
          if (s) selectSheet(s);
          hideContextMenu();
        },
      },
      {
        id: 'rename',
        label: 'Rename',
        onClick: () => hideContextMenu(),
      },
      {
        id: 'divider',
        label: '',
        divider: true,
      },
      {
        id: 'delete',
        label: 'Remove from Library',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        variant: 'danger' as const,
        onClick: () => {
          handleDeleteRequest(contextMenu.sheetId);
          hideContextMenu();
        },
      },
    ];
  }, [contextMenu, sheets, hideContextMenu]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4f7]">
      <Spinner size="lg" className="text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f7] text-[#1d1d1f] font-sans overflow-hidden">
      {/* Login Screen */}
      {!user ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Music2 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Piano&nbsp;Coach</h1>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Professional score management for piano practice. Sign in to access your library.
            </p>
            <Button
              onClick={signInWithGoogle}
              variant="secondary"
              size="md"
              className="w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Top Menu Bar */}
          <div className="h-9 bg-white border-b border-gray-200 flex items-center px-4 gap-4 text-[13px] select-none shrink-0 relative z-50">
            <div className="flex items-center gap-2 font-bold text-blue-600 mr-2">
              <div className="w-4 h-4 bg-blue-600 rounded-[3px] flex items-center justify-center">
                <Music2 className="w-2.5 h-2.5 text-white" />
              </div>
              Piano&nbsp;Coach
            </div>
            <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors">File</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors hidden sm:block">Edit</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors">View</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors hidden md:block">Score</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors hidden md:block">Window</button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-gray-400">
               <span className="text-[11px] font-medium hidden sm:block">{user?.email}</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0 shadow-sm z-[100] sticky top-0 no-scrollbar overflow-x-auto">
            
            {/* Sheet Library Select */}
            <Select
              value={selectedSheet?.id}
              onChange={(id: string) => {
                const sheet = sheets.find(s => s.id === id);
                if (sheet) selectSheet(sheet);
              }}
              options={sheetOptions}
              placeholder="Select Score…"
              disabled={sheetsLoading}
            />
            
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Playback Core */}
            <div className="flex items-center gap-2">
              <IconButton
                onClick={reset}
                variant="ghost"
                icon={<RefreshCcw className="w-4 h-4" />}
                label="Restart"
              />
              
              <IconButton
                onClick={togglePlayback}
                disabled={!pianoLoaded}
                variant="round"
                icon={!pianoLoaded ? <Spinner size="sm" /> : (playbackState === PlaybackState.PLAYING ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />)}
                label={!pianoLoaded ? "Loading Samples…" : (playbackState === PlaybackState.PLAYING ? "Pause" : "Play")}
                className={playbackState === PlaybackState.PLAYING ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : ''}
              />
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md font-mono text-sm text-gray-600 select-none min-w-[100px] justify-center">
              <Timer className="w-3.5 h-3.5 opacity-50" />
              <span>{formatTime(position.currentTime)}</span>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* BPM Control */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">BPM</span>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                <IconButton
                  onClick={() => handleBpmChange(Math.max(20, bpm - 5))}
                  variant="ghost"
                  size="sm"
                  icon={<span className="font-bold">-</span>}
                  label="Decrease BPM"
                  className="hover:bg-white"
                />
                <span className="text-[13px] font-bold text-gray-700 w-10 text-center select-none">{bpm}</span>
                <IconButton
                  onClick={() => handleBpmChange(Math.min(300, bpm + 5))}
                  variant="ghost"
                  size="sm"
                  icon={<span className="font-bold">+</span>}
                  label="Increase BPM"
                  className="hover:bg-white"
                />
              </div>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <IconButton
                onClick={toggleKeyboard}
                variant="ghost"
                icon={<Keyboard className="w-5 h-5" />}
                label="Toggle Keyboard"
                className={isKeyboardVisible ? 'bg-blue-50 text-blue-600' : ''}
              />
              
              {/* Piano Key Size Control */}
              {isKeyboardVisible && selectedSheet && (
                <Slider
                  value={pianoKeySize}
                  onChange={setPianoKeySize}
                  min={20}
                  max={50}
                  label="Size"
                  className="bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200"
                />
              )}
              
              {selectedSheet && (
                <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                  <IconButton
                    onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
                    variant="ghost"
                    size="sm"
                    icon={<ZoomOut className="w-4 h-4" />}
                    label="Zoom Out"
                    className="hover:bg-white"
                  />
                  <span className="text-[11px] font-bold text-gray-600 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                  <IconButton
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    variant="ghost"
                    size="sm"
                    icon={<ZoomIn className="w-4 h-4" />}
                    label="Zoom In"
                    className="hover:bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <label>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload XML</span>
                </Button>
                <input type="file" accept=".xml,.musicxml,.mxl" onChange={handleFileSelect} className="hidden" disabled={uploading} />
              </label>
              
              <IconButton
                onClick={signOut}
                variant="danger"
                icon={<LogOut className="w-5 h-5" />}
                label="Log Out"
              />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {/* Context Menu */}
            {contextMenu && (
              <div 
                className="fixed z-[100]"
                style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                <ContextMenu
                  items={contextMenuItems}
                  onOpenChange={(open) => !open && hideContextMenu()}
                >
                  <div />  {/* Portal target */}
                </ContextMenu>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <main className="main-viewport flex-1 bg-gray-100 flex flex-col items-center p-4 sm:p-8 custom-scrollbar relative">
                {contentLoading && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-[2px]">
                    <Spinner size="lg" className="text-blue-500" />
                  </div>
                )}

                {selectedSheet ? (
                  <div className="w-full max-w-[1000px] mx-auto">
                    <div className="sheet-container mb-32 p-4 sm:p-12 overflow-visible bg-white">
                      <MusicXMLDisplay 
                        url={musicXmlUrl!} 
                        zoom={zoom} 
                        onOsmdInit={setOsmd}
                        enableClickInteraction={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
                    <div className="w-20 h-20 bg-white rounded-[24px] shadow-sm border border-gray-200 flex items-center justify-center mb-6">
                      <FileMusic className="w-10 h-10 text-gray-200" />
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-gray-900">Professional Score Reader</h2>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-8">
                      Piano Coach Studio works with MusicXML and MXL files. Open a score from your library or import a new file to begin practice.
                    </p>
                    <label className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold text-[13px] hover:bg-blue-700 transition-all cursor-pointer shadow-lg active:scale-[0.98]">
                      Import New Music Score
                      <input type="file" accept=".xml,.musicxml,.mxl" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                )}
              </main>

              {/* Fixed Piano Keyboard */}
              {isKeyboardVisible && selectedSheet && (
                <div className="shrink-0 z-30 transition-all duration-500">
                  <PianoKeyboard keyWidth={pianoKeySize} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Dialogs */}
      <Dialog
        open={uploadErrorDialog.open}
        onOpenChange={(open) => setUploadErrorDialog({ open, message: '' })}
        title="Upload Error"
        description={uploadErrorDialog.message}
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setUploadErrorDialog({ open: false, message: '' })}
      />
      
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, sheetId: null })}
        title="Delete Sheet"
        description="Are you sure you want to delete this sheet? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </div>
  );
}

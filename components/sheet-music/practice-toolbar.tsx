'use client';

import { useCoachStore } from '@/lib/stores/coach-store';
import { cn } from '@/lib/utils/cn';
import { useEffect, useState } from 'react';

// Helper to convert MIDI to note name (e.g., 60 -> C4)
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];
  return `${noteName}${octave}`;
}

export function PracticeToolbar() {
  const { 
    isRecording, 
    detectedNotes, 
    expectedNotes,
    isHintEnabled,
  } = useCoachStore();
  
  const [lastPlayedNote, setLastPlayedNote] = useState<{name: string, correct: boolean} | null>(null);

  // Update last played note when detected notes change
  useEffect(() => {
    if (detectedNotes.length > 0) {
      const lastNote = detectedNotes[detectedNotes.length - 1];
      const isCorrect = expectedNotes.some(expected => 
        Math.abs(expected - lastNote.midi) <= 1
      );
      setLastPlayedNote({
        name: midiToNoteName(lastNote.midi),
        correct: isCorrect
      });
    }
  }, [detectedNotes, expectedNotes]);

  if (!isRecording) return null;

  return (
    <div className="h-12 bg-zinc-50 border-b border-gray-200 flex items-center justify-center px-6 shrink-0 shadow-inner animate-in slide-in-from-top-2 fade-in duration-300 relative z-30">
        
        {/* Left: Mode Indicator (Absolute) */}
        <div className="absolute left-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-2 ring-blue-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">PRACTICE MODE</span>
        </div>

        {/* Center: Practice Info */}
        <div className="flex items-center gap-6 sm:gap-8">
            
            {/* Next Notes */}
            <div className="flex items-center gap-3">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Next</span>
                 <div className="text-xl font-bold text-gray-800 font-mono tracking-tight bg-white px-3 py-0.5 rounded border border-gray-200 shadow-sm min-w-[3rem] text-center">
                    {expectedNotes.length > 0 
                      ? expectedNotes.map(midiToNoteName).join(' ') 
                      : <span className="text-gray-300 text-base">...</span>}
                 </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {/* Last Played */}
            <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Last</span>
                  <div className={cn(
                      "text-xl font-bold font-mono min-w-[2rem] text-center",
                      lastPlayedNote 
                        ? (lastPlayedNote.correct ? "text-emerald-600" : "text-amber-600")
                        : "text-gray-300"
                  )}>
                      {lastPlayedNote ? lastPlayedNote.name : "-"}
                  </div>
            </div>

            <div className="h-4 w-px bg-gray-300 hidden sm:block" />

            {/* History Trail */}
            <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mr-1 opacity-50">History</span>
                <div className="flex gap-1.5 opacity-60">
                    {detectedNotes.slice(-5, -1).reverse().map((note, i) => (
                      <span key={`${note.timestamp}-${i}`} className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 rounded">
                        {midiToNoteName(note.midi)}
                      </span>
                    ))}
                    {detectedNotes.length === 0 && <span className="text-xs text-gray-300 italic">No notes played</span>}
                </div>
            </div>

            <div className="h-4 w-px bg-gray-300" />
            
            {/* Hint Switch */}
            <div 
              onClick={() => useCoachStore.getState().toggleHint()}
              className="flex items-center gap-2 cursor-pointer group select-none"
            >
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider transition-colors",
                  isHintEnabled ? "text-gray-700" : "text-gray-400 group-hover:text-gray-500"
                )}>Hint</span>
                <div className={cn(
                  "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out",
                  isHintEnabled ? "bg-blue-500" : "bg-gray-200 group-hover:bg-gray-300"
                )}>
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                    isHintEnabled ? "translate-x-4" : "translate-x-0"
                  )} />
                </div>
            </div>
        </div>
    </div>
  );
}

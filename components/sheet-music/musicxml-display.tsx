'use client';

import { useEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { PointF2D } from 'opensheetmusicdisplay';
import { usePlaybackStore } from '@/lib/stores/playback-store';
import { useCoachStore } from '@/lib/stores/coach-store';
import { Spinner } from '@/components/ui/spinner';
import { usePracticeMode } from '@/lib/hooks/use-practice-mode';

interface MusicXMLDisplayProps {
  url: string;
  zoom?: number;
  onOsmdInit?: (osmd: OpenSheetMusicDisplay) => void;
  enableClickInteraction?: boolean;
}

export function MusicXMLDisplay({ url, zoom = 1.0, onOsmdInit, enableClickInteraction = false }: MusicXMLDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enable practice mode (auto-advance cursor on correct note)
  usePracticeMode({ osmd: osmdRef.current, enabled: true });


  /* 
   * HELPER: Calculate click coordinates in OSMD internal units (approx 10px per unit)
   * Uses SVG matrix transformation to be robust against zoom and layout changes.
   */
  const getClickCoordinates = (e: React.MouseEvent, container: HTMLDivElement): PointF2D | null => {
    const svg = container.querySelector('svg');
    if (!svg) return null;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // Transform screen -> SVG coordinates
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
    // OSMD factor: 1 unit = 10 pixels
    return new PointF2D(svgP.x / 10.0, svgP.y / 10.0);
  };

  /*
   * HELPER: Find the music system (line of music) closest vertically to the click.
   * "Snaps" the click to a specific system to implement timeline-like behavior.
   */
  const findClosestSystem = (graphicSheet: any, unitY: number): any | null => {
     if (!graphicSheet || !graphicSheet.MusicPages) return null;

     let closestSystem: any = null;
     let minDistance = Number.MAX_VALUE;

     for (const page of graphicSheet.MusicPages) {
         for (const system of page.MusicSystems) {
             const pos = system.PositionAndShape.AbsolutePosition;
             const border = system.PositionAndShape.BorderMarginBottom + system.PositionAndShape.BorderMarginTop;
             const systemCenterY = pos.y + (border / 2);
             
             const dist = Math.abs(unitY - systemCenterY);
             if (dist < minDistance) {
                 minDistance = dist;
                 closestSystem = system;
             }
         }
     }
     return closestSystem;
  };

  /*
   * HELPER: Find the note horizontally closest to the click within a specific system.
   * Iterates all notes in the system to guarantee finding a note (ignoring hit-test limitations).
   */
  const findClosestNoteInSystem = (system: any, unitX: number): any | null => {
      let bestNote: any = null;
      let minXDist = Number.MAX_VALUE;

      const measures: any[][] = system.GraphicalMeasures;
      for (const measureColumn of measures) {
          for (const measure of measureColumn) {
              if (!measure) continue;
              
              for (const entry of measure.staffEntries) {
                  for (const voiceEntry of entry.graphicalVoiceEntries) {
                      for (const note of voiceEntry.notes) {
                          const notePos = note.PositionAndShape?.AbsolutePosition;
                          if (notePos) {
                              const dist = Math.abs(unitX - notePos.x);
                              if (dist < minXDist) {
                                  minXDist = dist;
                                  bestNote = note;
                              }
                          }
                      }
                  }
              }
          }
      }
      return bestNote;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!osmdRef.current || isLoading || !enableClickInteraction || !containerRef.current) return;

    try {
      const coords = getClickCoordinates(e, containerRef.current);
      if (!coords) return;
      
      const graphicSheet = osmdRef.current.GraphicSheet as any;
      
      // 1. Find the system (vertical snap)
      const closestSystem = findClosestSystem(graphicSheet, coords.y);
      if (!closestSystem) return;

      // 2. Find the note in that system (horizontal snap)
      const bestNote = findClosestNoteInSystem(closestSystem, coords.x);
      
      if (bestNote && bestNote.sourceNote) {
           const note = bestNote.sourceNote;
           const timestamp = note.getAbsoluteTimestamp ? note.getAbsoluteTimestamp() : note.AbsoluteTimestamp;
           
           if (timestamp) {
               const { seekToTimestamp } = usePlaybackStore.getState();
               seekToTimestamp(timestamp.RealValue);
           }
      }

    } catch (err) {
      console.warn("Click seek logic failed", err);
    }
  };


  useEffect(() => {
    if (!containerRef.current || !url) return;

    const initOSMD = async () => {
      const container = containerRef.current;
      if (!container) return;
      
      setIsLoading(true);
      setError(null);
      
      // Clear expected notes immediately to prevent showing stale "Next" notes
      useCoachStore.getState().setExpectedNotes([]);
      
      try {
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        
        // Clear container before creating new instance to prevent duplicates
        container.innerHTML = '';
        
        // Always create a fresh instance
        osmdRef.current = new OpenSheetMusicDisplay(container, {
            autoResize: true,
            backend: 'svg',
            followCursor: true,
            drawTitle: true,
            drawSubtitle: true,
            drawComposer: true,
            drawLyricist: true,
            drawPartNames: true,
            drawFingerings: true,
            drawMeasureNumbers: true,

          });
        
        // Load and Render
        await osmdRef.current.load(url);
        osmdRef.current.Zoom = zoom;
        osmdRef.current.render();
        
        // Enable and show cursor after render
        if (osmdRef.current.cursor) {
          osmdRef.current.cursor.show();
          osmdRef.current.cursor.reset();
        }
        
        if (onOsmdInit) onOsmdInit(osmdRef.current);
        
        // Register OSMD instance with playback store
        usePlaybackStore.getState().setOsmd(osmdRef.current);

        // HARD RESET: Ensure everything is clean when a new sheet loads
        usePlaybackStore.getState().reset();
        useCoachStore.getState().reset();
        
        setIsLoading(false);
      } catch (err) {
        console.error('OSMD rendering error:', err);
        setError(`Failed to render MusicXML: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    initOSMD();

    return () => {
      // Cleanup: clear container and dispose OSMD
      if (osmdRef.current) {
        try {
          osmdRef.current.clear();
        } catch (e) {
          console.warn('Error clearing OSMD:', e);
        }
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      osmdRef.current = null;
    };
  }, [url]);



  // Handle zoom changes WITHOUT creating duplicates
  useEffect(() => {
    if (osmdRef.current && !isLoading) {
      try {
        osmdRef.current.Zoom = zoom;
        osmdRef.current.render();
      } catch (e) {
        console.warn('Error adjusting zoom:', e);
      }
    }
  }, [zoom, isLoading]);

  return (
    <div className="musicxml-display flex flex-col w-full h-full min-h-[500px] relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10 rounded-xl">
          <Spinner size="lg" className="text-blue-400 mb-4" />
          <p className="text-gray-300 font-medium text-lg">Rendering sheet music...</p>
        </div>
      )}

      <div 
        ref={containerRef} 
        onClick={handleContainerClick}
        className="osmd-container bg-white w-full h-auto relative cursor-pointer select-none"
        style={{ 
          color: '#000'
        }}
      />


    </div>
  );
}

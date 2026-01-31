'use client';

import { useEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { PointF2D } from 'opensheetmusicdisplay';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { usePlaybackStore } from '@/lib/stores/playback-store';

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



  const handleContainerClick = (e: React.MouseEvent) => {
    if (!osmdRef.current || isLoading || !enableClickInteraction) return;

    try {
      // Calculate click position relative to the container
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;
      const point = new PointF2D(x, y);

      // Find nearest object
      const graphicSheet = osmdRef.current.GraphicSheet as any;
      if (!graphicSheet || !graphicSheet.GetNearestGraphicalObject) return;
      
      const clickObj = graphicSheet.GetNearestGraphicalObject(point);
      
      if (clickObj) {
        // Determine timestamp from the object
        let timestamp: any = null;
        
        if ((clickObj as any).sourceNote) {
          timestamp = (clickObj as any).sourceNote.SourceMeasure.AbsoluteTimestamp;
        } else if ((clickObj as any).sourceStaffEntry) {
          timestamp = (clickObj as any).sourceStaffEntry.AbsoluteTimestamp;
        } else if ((clickObj as any).SourceMeasure) {
          timestamp = (clickObj as any).SourceMeasure.AbsoluteTimestamp;
        }

        if (timestamp) {
          // Use store's seekToTimestamp action
          const { seekToTimestamp } = usePlaybackStore.getState();
          seekToTimestamp(timestamp.RealValue);
        }
      }
    } catch (err) {
      console.warn("Click seek failed", err);
    }
  };


  useEffect(() => {
    if (!containerRef.current || !url) return;

    const initOSMD = async () => {
      const container = containerRef.current;
      if (!container) return;
      
      setIsLoading(true);
      setError(null);
      
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
            // @ts-ignore - Handle version differences
            cursorsOptions: [{
              type: 0, // Standard cursor (wider and more visible than type 1)
              color: '#ff0000',
              alpha: 0.5,
              follow: true,
            }]
          });
        
        // Load and Render
        await osmdRef.current.load(url);
        osmdRef.current.Zoom = zoom;
        osmdRef.current.render();
        
        // Debug: Check if cursor exists
        console.log('🔍 OSMD Debug:');
        console.log('- OSMD instance:', osmdRef.current);
        console.log('- Cursor object:', osmdRef.current.cursor);
        console.log('- Cursors array:', osmdRef.current.cursors);
        
        // Enable and show cursor after render
        if (osmdRef.current.cursor) {
          console.log('✅ Cursor exists! Showing and resetting...');
          osmdRef.current.cursor.show();
          osmdRef.current.cursor.reset();
          
          // Check cursor element in DOM
          const cursorEl = osmdRef.current.cursor.cursorElement;
          console.log('- Cursor element:', cursorEl);
          console.log('- Cursor element ID:', cursorEl?.id);
          console.log('- Cursor element computed style:', cursorEl ? window.getComputedStyle(cursorEl) : 'N/A');
          console.log('- Cursor hidden state:', osmdRef.current.cursor.hidden);
          
          const c = osmdRef.current.cursor as any;
          if (c.update) c.update();
          
          // Try to find cursor in DOM
          setTimeout(() => {
            const cursorInDom = document.getElementById(cursorEl?.id || 'cursorImg-0');
            console.log('- Cursor found in DOM:', cursorInDom);
            if (cursorInDom) {
              console.log('- Cursor parent:', cursorInDom.parentElement);
              console.log('- Cursor display:', window.getComputedStyle(cursorInDom).display);
              console.log('- Cursor visibility:', window.getComputedStyle(cursorInDom).visibility);
              console.log('- Cursor position:', window.getComputedStyle(cursorInDom).position);
              console.log('- Cursor zIndex:', window.getComputedStyle(cursorInDom).zIndex);
            }
          }, 100);
        } else {
          console.error('❌ Cursor does not exist!');
        }
        
        if (onOsmdInit) onOsmdInit(osmdRef.current);
        
        // Register OSMD instance with playback store
        usePlaybackStore.getState().setOsmd(osmdRef.current);
        
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
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-4" />
          <p className="text-gray-300 font-medium text-lg">Rendering sheet music...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl max-w-md">
            <p className="text-red-400 font-medium mb-2">Error</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
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

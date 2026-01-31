'use client';

import { useEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { PointF2D } from 'opensheetmusicdisplay';
import { usePlaybackStore } from '@/lib/stores/playback-store';
import { Spinner } from '@/components/ui/spinner';

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

'use client';

import { useState, useCallback } from 'react';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ScreenCaptureToolProps {
  onCapture: (imageData: string) => void;
  disabled?: boolean;
}

interface SelectionRect {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export function ScreenCaptureTool({ onCapture, disabled }: ScreenCaptureToolProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startSelection = useCallback(() => {
    setIsSelecting(true);
    setSelection(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setSelection({
      startX: e.clientX,
      startY: e.clientY,
      width: 0,
      height: 0,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selection) return;
    
    setSelection({
      startX: selection.startX,
      startY: selection.startY,
      width: e.clientX - selection.startX,
      height: e.clientY - selection.startY,
    });
  }, [selection]);

  const handleMouseUp = useCallback(async () => {
    if (!selection) {
      setIsSelecting(false);
      return;
    }

    // Normalize selection coordinates
    const x = selection.width < 0 ? selection.startX + selection.width : selection.startX;
    const y = selection.height < 0 ? selection.startY + selection.height : selection.startY;
    const width = Math.abs(selection.width);
    const height = Math.abs(selection.height);

    // Ignore tiny selections
    if (width < 10 || height < 10) {
      setIsSelecting(false);
      setSelection(null);
      return;
    }

    // Hide overlay and start capture
    setIsSelecting(false);
    setSelection(null);
    setIsCapturing(true);

    try {
      // Wait for overlay to disappear
      await new Promise(resolve => setTimeout(resolve, 50));

      // Find SVG element at selection center
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const elements = document.elementsFromPoint(centerX, centerY);
      const svgElement = elements.find(el => el.tagName === 'svg') as SVGElement | undefined;

      if (!svgElement) {
        throw new Error('No SVG element found at selection');
      }

      // Create canvas for capture
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size with device pixel ratio for sharp images
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // Serialize SVG to image
      const svgRect = svgElement.getBoundingClientRect();
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Load and draw SVG
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Calculate portion of SVG to capture
          const offsetX = x - svgRect.left;
          const offsetY = y - svgRect.top;
          
          ctx.drawImage(img, offsetX, offsetY, width, height, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG image'));
        };
        img.src = url;
      });

      // Convert to base64 and send to callback
      const imageData = canvas.toDataURL('image/png');
      onCapture(imageData);
      
    } catch (error) {
      console.error('Screen capture error:', error);
      alert('Failed to capture region. Please try selecting a portion of the sheet music.');
    } finally {
      setIsCapturing(false);
    }
  }, [selection, onCapture]);

  const cancelSelection = useCallback(() => {
    setIsSelecting(false);
    setSelection(null);
  }, []);

  const renderSelection = () => {
    if (!selection) return null;

    const x = selection.width < 0 ? selection.startX + selection.width : selection.startX;
    const y = selection.height < 0 ? selection.startY + selection.height : selection.startY;
    const width = Math.abs(selection.width);
    const height = Math.abs(selection.height);

    return (
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
        style={{ left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` }}
      />
    );
  };

  return (
    <>
      <button
        onClick={startSelection}
        disabled={disabled || isSelecting || isCapturing}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 active:bg-gray-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'text-gray-600 hover:text-gray-800'
        )}
        title="Select screen region"
      >
        <Camera className="w-4 h-4" />
      </button>

      {isSelecting && (
        <div
          className="fixed inset-0 z-[9999] cursor-crosshair bg-black/20 backdrop-blur-[1px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {renderSelection()}
          
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium text-gray-700 pointer-events-none">
            Click and drag to select a region
          </div>

          <button
            onClick={cancelSelection}
            className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}

      {isCapturing && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg">
            <p className="text-sm font-medium text-gray-700">Capturing...</p>
          </div>
        </div>
      )}
    </>
  );
}

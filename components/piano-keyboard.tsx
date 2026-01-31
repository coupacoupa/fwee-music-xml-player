'use client';

import React, { useState } from 'react';
import * as Tone from 'tone';
import { usePlaybackStore } from '@/lib/stores/playback-store';
import { isBlackKey, midiToFrequency } from '@/lib/utils/music-utils';

interface PianoKeyboardProps {
  keyWidth?: number; // Width in pixels for white keys
}

export function PianoKeyboard({ keyWidth = 28 }: PianoKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  
  // Get active notes from store
  const activeNotes = usePlaybackStore((state) => state.activeNotes);
  const { sampler, pianoLoaded } = usePlaybackStore();
  
  // 88 keys: MIDI 21 (A0) to 108 (C8)
  const totalKeys = 88;
  const startNote = 21;

  const handleKeyDown = async (midi: number) => {
    setPressedKeys(prev => new Set(prev).add(midi));
    
    // Play note using the shared sampler from store
    if (sampler && pianoLoaded) {
      await Tone.start();
      const freq = midiToFrequency(midi);
      sampler.triggerAttackRelease(freq, '8n');
    }
    
    // Visual feedback duration
    setTimeout(() => {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 200);
  };

  // Calculate dynamic heights based on key width
  const whiteKeyHeight = keyWidth * 5; // ~5:1 ratio
  const blackKeyHeight = whiteKeyHeight * 0.6;
  const blackKeyWidth = keyWidth * 0.6;

  const renderKeys = () => {
    const keys = [];
    for (let i = 0; i < totalKeys; i++) {
      const midi = startNote + i;
      const isActive = activeNotes.includes(midi);
      const isPressed = pressedKeys.has(midi);
      const black = isBlackKey(midi);

      const combinedActive = isActive || isPressed;

      keys.push(
        <div
          key={midi}
          onMouseDown={() => handleKeyDown(midi)}
          className={`
            relative flex-shrink-0 cursor-pointer select-none touch-manipulation transition-[background,transform,box-shadow]
            ${black 
              ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-black z-10 shadow-2xl' 
              : 'bg-gradient-to-b from-gray-50 via-white to-gray-100 border-r border-gray-300 shadow-inner'
            }
            ${combinedActive 
              ? (black 
                  ? '!bg-gradient-to-b !from-blue-600 !via-blue-500 !to-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.8)]' 
                  : '!bg-gradient-to-b !from-blue-200 !via-blue-100 !to-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                )
              : ''
            }
            ${isPressed && !black ? 'translate-y-[2px]' : ''}
            hover:brightness-95 active:brightness-90
          `}
          style={{
            width: black ? `${blackKeyWidth}px` : `${keyWidth}px`,
            height: black ? `${blackKeyHeight}px` : `${whiteKeyHeight}px`,
            marginLeft: black ? `-${blackKeyWidth/2}px` : '0',
            marginRight: black ? `-${blackKeyWidth/2}px` : '0',
            borderBottomLeftRadius: black ? '4px' : '6px',
            borderBottomRightRadius: black ? '4px' : '6px',
            touchAction: 'manipulation',
          }}
        >
          {/* Reflection highlight for white keys */}
          {!black && (
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
          )}
          
          {/* Active indicator dot */}
          {combinedActive && !black && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-lg animate-pulse" />
          )}
          
          {/* Shadow depth for black keys */}
          {black && (
            <div className="absolute inset-x-0 bottom-0 h-2 bg-black/30 pointer-events-none" style={{ borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' }} />
          )}
        </div>
      );
    }
    return keys;
  };

  return (
    <div className="w-full bg-gray-900/10 backdrop-blur-sm border-t border-gray-200/50 shadow-lg relative">
      {/* Keys container */}
      <div className="max-w-fit mx-auto flex px-6 py-4 overflow-x-auto no-scrollbar">
        <div className="flex shadow-lg rounded-b-lg overflow-hidden">
          {renderKeys()}
        </div>
      </div>
    </div>
  );
}

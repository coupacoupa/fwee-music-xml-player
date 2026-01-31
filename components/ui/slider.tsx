'use client';

import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  className,
  disabled = false,
}: SliderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {label && (
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
      <BaseSlider.Root
        value={value}
        onValueChange={(newValue) => onChange(newValue as number)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label || 'Slider control'}
        className={cn(
          'relative flex items-center select-none touch-none w-20 h-1',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <BaseSlider.Track className="bg-gray-300 relative grow rounded-full h-1">
          <BaseSlider.Indicator className="absolute bg-blue-500 rounded-full h-1" />
        </BaseSlider.Track>
        <BaseSlider.Thumb className="block w-3 h-3 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all" />
      </BaseSlider.Root>
    </div>
  );
}

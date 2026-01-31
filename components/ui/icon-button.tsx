'use client';

import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './spinner';

export interface IconButtonProps extends React.ComponentPropsWithoutRef<typeof BaseButton> {
  variant?: 'ghost' | 'primary' | 'secondary' | 'danger' | 'round';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  label: string; // For accessibility
  icon: React.ReactNode;
}

const iconButtonVariants = {
  ghost: 'text-gray-400 hover:text-black hover:bg-gray-100',
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
  secondary: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200',
  danger: 'text-red-600 hover:text-red-500 hover:bg-red-50',
  round: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md rounded-full',
};

const iconButtonSizes = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', loading = false, disabled, label, icon, className, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <BaseButton
        ref={ref}
        disabled={isDisabled}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center shrink-0 transition-[background-color,transform,opacity,color]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'round' ? 'rounded-full active:scale-95' : 'rounded-md',
          iconButtonVariants[variant],
          iconButtonSizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <span className={iconSizes[size]}>{icon}</span>
        )}
      </BaseButton>
    );
  }
);

IconButton.displayName = 'IconButton';

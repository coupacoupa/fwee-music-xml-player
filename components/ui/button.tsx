'use client';

import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './spinner';

export interface ButtonProps extends React.ComponentPropsWithoutRef<typeof BaseButton> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'round';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-[0.98]',
  secondary: 'bg-gray-900 text-white hover:bg-black shadow-sm active:scale-[0.98]',
  ghost: 'bg-transparent text-gray-400 hover:text-black hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]',
  round: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95 rounded-full',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <BaseButton
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-[background-color,transform,opacity]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          buttonVariants[variant],
          variant !== 'round' && buttonSizes[size],
          variant === 'round' && 'w-10 h-10 p-0',
          className
        )}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </BaseButton>
    );
  }
);

Button.displayName = 'Button';

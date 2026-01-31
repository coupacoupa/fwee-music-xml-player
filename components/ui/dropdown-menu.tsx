'use client';

import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export interface DropdownMenuProps {
  label: string;
  items: DropdownMenuItem[];
  className?: string;
}

export function DropdownMenu({ label, items, className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        className={cn(
          'px-2 py-1 hover:bg-gray-100 rounded transition-colors',
          'flex items-center gap-1 text-[13px] select-none cursor-default',
          open && 'bg-gray-100',
          className
        )}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-[9999]" align="start" sideOffset={8}>
          <Menu.Popup
            className={cn(
              'min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-xl py-1',
              'text-[13px] overflow-hidden',
              'animate-in fade-in-0 zoom-in-95 duration-100'
            )}
          >
            {items.map((item) => (
              <React.Fragment key={item.id}>
                {item.divider && <Menu.Separator className="h-px bg-gray-100 my-1" />}
                {!item.divider && (
                  <Menu.Item
                    onClick={(e) => item.onClick?.(e)}
                    disabled={item.disabled}
                    className={cn(
                      'w-full text-left px-4 py-2 transition-colors flex items-center gap-2',
                      'cursor-pointer outline-none',
                      item.disabled && 'opacity-40 cursor-not-allowed',
                      !item.disabled && item.variant === 'danger'
                        ? 'text-red-600 hover:bg-red-50 data-[highlighted]:bg-red-50'
                        : !item.disabled && 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700'
                    )}
                  >
                    {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.checked && <span className="text-blue-600">✓</span>}
                  </Menu.Item>
                )}
              </React.Fragment>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

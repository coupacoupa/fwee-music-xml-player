'use client';

import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils/cn';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  divider?: boolean;
  onClick?: () => void;
}

export interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenu({ items, children, onOpenChange }: ContextMenuProps) {
  return (
    <Menu.Root onOpenChange={onOpenChange}>
      <Menu.Trigger>{children}</Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-[9999]">
          <Menu.Popup
            className={cn(
              'w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1',
              'text-[13px] overflow-hidden',
              'animate-in fade-in-0 zoom-in-95'
            )}
          >
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.divider && <Menu.Separator className="h-px bg-gray-100 my-1" />}
                <Menu.Item
                  onClick={item.onClick}
                  className={cn(
                    'w-full text-left px-4 py-2 transition-colors flex items-center gap-2',
                    'cursor-pointer outline-none',
                    item.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50 data-[highlighted]:bg-red-50'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700'
                  )}
                >
                  {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
                  {item.label}
                </Menu.Item>
              </React.Fragment>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

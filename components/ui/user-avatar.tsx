'use client';

import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

export interface UserAvatarMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  divider?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface UserAvatarProps {
  name: string;
  email: string;
  menuItems: UserAvatarMenuItem[];
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(email: string): string {
  // Generate consistent color based on email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-fuchsia-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({ name, email, menuItems, className }: UserAvatarProps) {
  const [open, setOpen] = React.useState(false);
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(email);

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        className={cn(
          'flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded transition-colors',
          'text-[13px] select-none cursor-pointer',
          open && 'bg-gray-100',
          className
        )}
      >
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center',
            'text-white text-[10px] font-bold',
            avatarColor
          )}
        >
          {initials}
        </div>
        <span className="font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
          {name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-[9999]">
          <Menu.Popup
            className={cn(
              'min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-xl py-1',
              'text-[13px] overflow-hidden',
              'animate-in fade-in-0 zoom-in-95 duration-100'
            )}
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'text-white text-sm font-bold',
                    avatarColor
                  )}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{name}</div>
                  <div className="text-xs text-gray-500 truncate">{email}</div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            {menuItems.map((item) => (
              <React.Fragment key={item.id}>
                {item.divider && <Menu.Separator className="h-px bg-gray-100 my-1" />}
                {!item.divider && (
                  <Menu.Item
                    onClick={item.onClick}
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
                    {item.label}
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

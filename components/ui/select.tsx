'use client';

import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  meta?: string;
}

export interface SelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  searchable?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
  renderOption,
  searchable = false,
}: SelectProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerQuery) || 
      opt.meta?.toLowerCase().includes(lowerQuery)
    );
  }, [options, searchQuery]);

  return (
    <BaseSelect.Root value={value ?? null} onValueChange={(val: string | null) => val && onChange(val)} disabled={disabled}>
      <BaseSelect.Trigger
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200',
          'transition-colors text-[13px] font-medium min-w-[180px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
          className
        )}
      >
        {selectedOption?.icon && (
          <span className="w-4 h-4 text-gray-600 shrink-0">
            {selectedOption.icon}
          </span>
        )}
        <span className="flex-1 truncate text-left">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner 
          className="z-[9999]"
          sideOffset={4}
          side="bottom"
          align="start"
        >
          <BaseSelect.Popup
            className={cn(
              'w-80 bg-white border border-gray-200 rounded-lg shadow-2xl',
              'max-h-[400px] flex flex-col overflow-hidden',
              'animate-in fade-in-0 zoom-in-95'
            )}
          >
            <div className="p-3 border-b border-gray-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {placeholder}
                </span>
                <span className="bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {options.length}
                </span>
              </div>
              {searchable && (
                <input
                  type="text"
                  placeholder="Filter options..."
                  className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all placeholder:text-gray-400"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  value={searchQuery}
                  autoFocus
                />
              )}
            </div>

            <BaseSelect.List className="flex-1 overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  No matches found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <BaseSelect.Item
                    key={option.id}
                    value={option.id}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-all flex items-center gap-2',
                      'cursor-pointer outline-none',
                      'hover:bg-gray-100 text-gray-600',
                      'data-[selected]:bg-blue-50 data-[selected]:text-blue-700 data-[selected]:font-medium',
                      'data-[selected]:ring-1 data-[selected]:ring-blue-200',
                      'data-[highlighted]:bg-gray-50'
                    )}
                  >
                    {renderOption ? (
                      renderOption(option)
                    ) : (
                      <>
                        {option.icon && (
                          <span className="w-3.5 h-3.5 shrink-0 data-[selected]:text-blue-500">
                            {option.icon}
                          </span>
                        )}
                        <span className="truncate text-[13px] flex-1">{option.label}</span>
                        <BaseSelect.ItemIndicator className="ml-auto">
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        </BaseSelect.ItemIndicator>
                      </>
                    )}
                  </BaseSelect.Item>
                ))
              )}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

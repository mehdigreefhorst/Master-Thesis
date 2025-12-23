'use client';

import React from 'react';
import { BaseSelector, BaseSelectorItem } from '@/components/ui/BaseSelector';

export interface SimpleSelectorItem {
  id: string;
  name?: string;
  value?: any;
  [key: string]: any;
}

interface SimpleSelectorProps<T extends SimpleSelectorItem> {
  items: T[] | string[];
  selectedItemId?: string | null;
  onSelect: (item: T) => void;
  onClear?: () => void;
  placeholder?: string;
  title?: string;
  className?: string;
  enableSearch?: boolean;
  disabled?: boolean;
}

export function SimpleSelector<T extends SimpleSelectorItem>({
  items,
  selectedItemId,
  onSelect,
  onClear,
  placeholder = 'Select an item',
  title,
  className = '',
  enableSearch = false,
  disabled = false,
}: SimpleSelectorProps<T>) {
  // Convert items to BaseSelector format
  const baseSelectorItems: (BaseSelectorItem & T)[] = items.map(item => {
    // Handle string arrays
    if (typeof item === 'string') {
      return {
        id: item,
        label: item,
      } as BaseSelectorItem & T;
    }

    // Handle object arrays
    return {
      ...item,
      label: item.name || item.id,
    } as BaseSelectorItem & T;
  });

  // Find selected item
  const selectedItem = selectedItemId
    ? baseSelectorItems.find(item => item.id === selectedItemId) || null
    : null;

  // Handle selection
  const handleSelect = (item: BaseSelectorItem & T) => {
    onSelect(item);
  };

  // Handle clear
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <BaseSelector<BaseSelectorItem & T>
      items={baseSelectorItems}
      selectedItem={selectedItem}
      onSelect={handleSelect}
      onClear={handleClear}
      placeholder={placeholder}
      title={title}
      isLoading={false}
      disabled={disabled}
      enableSearch={enableSearch}
      searchPlaceholder="Search..."
      className={className}
      emptyText="No items available"
    />
  );
}

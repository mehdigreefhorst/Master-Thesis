'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface BaseSelectorItem {
  id: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

interface BaseSelectorProps<T extends BaseSelectorItem> {
  // Data
  items: T[];
  selectedItem: T | null;

  // Callbacks
  onSelect: (item: T) => void;
  onClear: () => void;

  // UI Customization
  placeholder?: string;
  title?: string;
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
  renderSelectedItem?: (item: T) => React.ReactNode;

  // State
  isLoading?: boolean;
  disabled?: boolean;

  // Search
  enableSearch?: boolean;
  searchPlaceholder?: string;

  // Styling
  className?: string;
  dropdownClassName?: string;

  // Empty state
  emptyText?: string;
}

export function BaseSelector<T extends BaseSelectorItem>({
  items,
  selectedItem,
  onSelect,
  onClear,
  placeholder = 'Select an item',
  title,
  renderItem,
  renderSelectedItem,
  isLoading = false,
  disabled = false,
  enableSearch = false,
  searchPlaceholder = 'Search...',
  className = '',
  dropdownClassName = '',
  emptyText = 'No items available'
}: BaseSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search query
  const filteredItems = enableSearch && searchQuery
    ? items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle item selection
  const handleSelect = (item: T) => {
    onSelect(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  // Default item renderer
  const defaultRenderItem = (item: T, isSelected: boolean) => (
    <div className="flex items-center justify-between">
      <span className={isSelected ? 'font-semibold' : ''}>{item.label}</span>
      {isSelected && (
        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );

  // Default selected item renderer
  const defaultRenderSelectedItem = (item: T) => item.label;

  const itemRenderer = renderItem || defaultRenderItem;
  const selectedItemRenderer = renderSelectedItem || defaultRenderSelectedItem;

  return (
    <div className={`relative ${className}`}>
      {/* Title */}
      {title && (
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          {title}
        </label>
      )}

      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        className={`
          relative w-full px-4 py-2.5 border-2 rounded-lg
          flex items-center justify-between
          transition-all duration-200
          ${disabled || isLoading
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
            : 'bg-white border-[var(--border)] hover:border-[var(--primary)] cursor-pointer'
          }
          ${isOpen && !disabled && !isLoading ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : ''}
        `}
      >
        {/* Selected Item or Placeholder */}
        <div className="flex-1 flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500">Loading...</span>
            </div>
          ) : selectedItem ? (
            <div className="flex-1 text-left font-medium text-[var(--foreground)]">
              {selectedItemRenderer(selectedItem)}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          {/* Clear button (X) */}
          {selectedItem && !disabled && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 rounded hover:bg-gray-100 transition-colors group"
              aria-label="Clear selection"
            >
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Chevron */}
          {!isLoading && (
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && !isLoading && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 w-full mt-2
            bg-white border-2 border-[var(--border)] rounded-lg shadow-lg
            max-h-80 overflow-hidden
            animate-[slideInDown_200ms_ease-out]
            ${dropdownClassName}
          `}
        >
          {/* Search Input */}
          {enableSearch && (
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* Items List */}
          <div className="overflow-y-auto max-h-64">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'No results found' : emptyText}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`
                      px-4 py-3 cursor-pointer transition-colors
                      ${isSelected
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    {itemRenderer(item, isSelected)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from './Input';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

export interface ComplexSelectorItem {
  id: string;
  [key: string]: any; // Allow additional properties
}

export interface ComplexSelectorTab<T extends ComplexSelectorItem> {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
  filter?: (item: T) => boolean;
}

export interface ComplexSelectorGroup<T extends ComplexSelectorItem> {
  id: string;
  label: string;
  items: T[];
}

interface ComplexSelectorProps<T extends ComplexSelectorItem> {
  // Data
  items: T[];
  selectedItem: T | null;

  // Callbacks
  onSelect: (item: T) => void;
  onClear?: () => void;

  // Tabs
  tabs?: ComplexSelectorTab<T>[];
  defaultTab?: string;

  // Grouping
  groupBy?: (items: T[]) => ComplexSelectorGroup<T>[];

  // UI Customization
  label?: string;
  placeholder?: string;
  renderSelectedItem?: (item: T) => React.ReactNode;
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
  renderFooter?: () => React.ReactNode;

  // Layout
  gridColumns?: 1 | 2 | 3 | 4;

  // Search
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;

  // State
  isLoading?: boolean;
  disabled?: boolean;

  // Styling
  className?: string;
  dropdownClassName?: string;
  dropdownWidth?: string;

  // Empty state
  emptyText?: string;
  emptyTabText?: (tabId: string) => string;
}

export function ComplexSelector<T extends ComplexSelectorItem>({
  items,
  selectedItem,
  onSelect,
  onClear,
  tabs,
  defaultTab,
  groupBy,
  label,
  placeholder = 'Select an item',
  renderSelectedItem,
  renderItem,
  renderFooter,
  gridColumns = 2,
  enableSearch = false,
  searchPlaceholder = 'Search...',
  searchFilter,
  isLoading = false,
  disabled = false,
  className = '',
  dropdownClassName = '',
  dropdownWidth = 'w-full',
  emptyText = 'No items available',
  emptyTabText,
}: ComplexSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.id || 'all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

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

  // Filter items based on search and active tab
  const filteredItems = items.filter((item) => {
    // Apply search filter
    const matchesSearch = !enableSearch || !searchQuery || !searchFilter
      ? true
      : searchFilter(item, searchQuery);

    // Apply tab filter
    const currentTab = tabs?.find((t) => t.id === activeTab);
    const matchesTab = !currentTab?.filter || currentTab.filter(item);

    return matchesSearch && matchesTab;
  });

  // Group items if groupBy is provided
  const groups = groupBy ? groupBy(filteredItems) : null;

  // Grid columns class mapping
  const gridColumnsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  // Default item renderer
  const defaultRenderItem = (item: T, isSelected: boolean) => (
    <Card
      className={`p-3 cursor-pointer transition-all duration-200 border-2 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={isSelected ? 'font-semibold' : ''}>{item.id}</span>
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
    </Card>
  );

  // Default selected item renderer
  const defaultRenderSelectedItem = (item: T) => item.id;

  const itemRenderer = renderItem || defaultRenderItem;
  const selectedItemRenderer = renderSelectedItem || defaultRenderSelectedItem;

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        className={`
          w-full h-12 px-4 py-2 border rounded-lg
          flex items-center justify-between
          transition-all duration-200
          ${disabled || isLoading
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
            : 'bg-white border-gray-300 hover:border-blue-500 cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 text-left">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500">Loading...</span>
            </div>
          ) : selectedItem ? (
            <div className="text-gray-900 font-medium">{selectedItemRenderer(selectedItem)}</div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>

        {!isLoading && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && !isLoading && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 mt-2 ${dropdownWidth} bg-white rounded-lg shadow-xl border border-gray-200
            animate-[panelExpand_200ms_ease-out]
            ${dropdownClassName}
          `}
        >
          {/* Search Bar */}
          {enableSearch && (
            <div className="p-3 border-b border-gray-200">
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                variant="primary"
                className="text-sm"
              />
            </div>
          )}

          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant={activeTab === tab.id ? 'primary' : 'invisible'}
                  className={`flex-1 rounded-none border-0 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 bg-blue-50/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <Badge variant="error" className="px-1.5 py-0.5">
                        {tab.badge}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}

          {/* Items List */}
          <div className="max-h-[500px] overflow-y-auto p-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {emptyTabText && activeTab ? emptyTabText(activeTab) : emptyText}
              </div>
            ) : groups ? (
              // Grouped rendering
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.id}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {group.label}
                    </h3>
                    <div className={`grid ${gridColumnsClass[gridColumns]} gap-3`}>
                      {group.items.map((item) => {
                        const isSelected = selectedItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                          >
                            {itemRenderer(item, isSelected)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Flat rendering
              <div className={`grid ${gridColumnsClass[gridColumns]} gap-3`}>
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                    >
                      {itemRenderer(item, isSelected)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {renderFooter && (
            <Card className="m-0 rounded-t-none border-t border-gray-200 bg-gray-50">
              {renderFooter()}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

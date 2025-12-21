'use client';

import { useState } from 'react';
import { FilterMisc } from '@/types/filtering';

interface MiscFilterFormProps {
  filterMisc: FilterMisc;
  onChange: (filter: FilterMisc) => void;
  disabled?: boolean;
}

interface FilterRowProps {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const FilterRow: React.FC<FilterRowProps> = ({ label, enabled, onToggle, children, disabled = false }) => {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 relative">
      {/* Toggle */}
      <button
        onClick={() => !disabled && onToggle(!enabled)}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 z-10 ${
          enabled ? 'bg-blue-500' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>

      {/* Label - Fixed width for alignment */}
      <div className="w-32 text-sm font-medium text-gray-700 flex-shrink-0">{label}</div>

      {/* Inputs */}
      <div className={`flex-1 flex items-center gap-2 min-w-0 ${!enabled || disabled ? 'opacity-40' : ''}`}>
        {children}
      </div>
    </div>
  );
};

interface CompactRangeInputProps {
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  disabled?: boolean;
  type?: "number" | "date";
}

const CompactRangeInput: React.FC<CompactRangeInputProps> = ({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  disabled,
  type = "number"
}) => {
  return (
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={minValue ?? ''}
        onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : undefined)}
        placeholder="Min"
        disabled={disabled}
        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <span className="text-gray-400">–</span>
      <input
        type={type}
        value={maxValue ?? ''}
        onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : undefined)}
        placeholder="Max"
        disabled={disabled}
        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
};

export const MiscFilterForm: React.FC<MiscFilterFormProps> = ({
  filterMisc,
  onChange,
  disabled = false
}) => {
  // Track which filters are enabled
  const [enabledFilters, setEnabledFilters] = useState<Record<string, boolean>>({
    upvotes: false,
    downvotes: false,
    depth: false,
    nested_replies: false,
    min_date: false,
    max_date: false,
    message_type: false
  });

  const updateFilter = (key: keyof FilterMisc, value: any) => {
    onChange({
      ...filterMisc,
      [key]: value
    });
  };

  const toggleFilter = (filterKey: string, enabled: boolean) => {
    setEnabledFilters(prev => ({ ...prev, [filterKey]: enabled }));

    // Clear filter values when disabled
    if (!enabled) {
      switch (filterKey) {
        case 'upvotes':
          updateFilter('min_upvotes', undefined);
          updateFilter('max_upvotes', undefined);
          break;
        case 'downvotes':
          updateFilter('min_downvotes', undefined);
          updateFilter('max_downvotes', undefined);
          break;
        case 'depth':
          updateFilter('min_depth', undefined);
          updateFilter('max_depth', undefined);
          break;
        case 'nested_replies':
          updateFilter('min_total_nested_replies', undefined);
          updateFilter('max_total_nested_replies', undefined);
          break;
        case 'min_date':
          updateFilter('min_date', undefined);
          break;
        case 'max_date':
          updateFilter('max_date', undefined);
          break;
        case 'message_type':
          updateFilter('reddit_message_type', undefined);
          break;
      }
    }
  };

  return (
    <div className="space-y-0">
      <FilterRow
        label="Upvotes"
        enabled={enabledFilters.upvotes}
        onToggle={(enabled) => toggleFilter('upvotes', enabled)}
        disabled={disabled}
      >
        <CompactRangeInput
          minValue={filterMisc.min_upvotes}
          maxValue={filterMisc.max_upvotes}
          onMinChange={(val) => updateFilter('min_upvotes', val)}
          onMaxChange={(val) => updateFilter('max_upvotes', val)}
          disabled={!enabledFilters.upvotes || disabled}
        />
      </FilterRow>

      <FilterRow
        label="Downvotes"
        enabled={enabledFilters.downvotes}
        onToggle={(enabled) => toggleFilter('downvotes', enabled)}
        disabled={disabled}
      >
        <CompactRangeInput
          minValue={filterMisc.min_downvotes}
          maxValue={filterMisc.max_downvotes}
          onMinChange={(val) => updateFilter('min_downvotes', val)}
          onMaxChange={(val) => updateFilter('max_downvotes', val)}
          disabled={!enabledFilters.downvotes || disabled}
        />
      </FilterRow>

      <FilterRow
        label="Thread Depth"
        enabled={enabledFilters.depth}
        onToggle={(enabled) => toggleFilter('depth', enabled)}
        disabled={disabled}
      >
        <CompactRangeInput
          minValue={filterMisc.min_depth}
          maxValue={filterMisc.max_depth}
          onMinChange={(val) => updateFilter('min_depth', val)}
          onMaxChange={(val) => updateFilter('max_depth', val)}
          disabled={!enabledFilters.depth || disabled}
        />
      </FilterRow>

      <FilterRow
        label="Nested Replies"
        enabled={enabledFilters.nested_replies}
        onToggle={(enabled) => toggleFilter('nested_replies', enabled)}
        disabled={disabled}
      >
        <CompactRangeInput
          minValue={filterMisc.min_total_nested_replies}
          maxValue={filterMisc.max_total_nested_replies}
          onMinChange={(val) => updateFilter('min_total_nested_replies', val)}
          onMaxChange={(val) => updateFilter('max_total_nested_replies', val)}
          disabled={!enabledFilters.nested_replies || disabled}
        />
      </FilterRow>

      {/* Min Date - Separate row */}
      <FilterRow
        label="Min Date"
        enabled={enabledFilters.min_date}
        onToggle={(enabled) => toggleFilter('min_date', enabled)}
        disabled={disabled}
      >
        <input
          type="datetime-local"
          value={filterMisc.min_date ? new Date(filterMisc.min_date).toISOString().slice(0, 16) : ''}
          onChange={(e) => updateFilter('min_date', e.target.value ? new Date(e.target.value) : undefined)}
          disabled={!enabledFilters.min_date || disabled}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </FilterRow>

      {/* Max Date - Separate row */}
      <FilterRow
        label="Max Date"
        enabled={enabledFilters.max_date}
        onToggle={(enabled) => toggleFilter('max_date', enabled)}
        disabled={disabled}
      >
        <input
          type="datetime-local"
          value={filterMisc.max_date ? new Date(filterMisc.max_date).toISOString().slice(0, 16) : ''}
          onChange={(e) => updateFilter('max_date', e.target.value ? new Date(e.target.value) : undefined)}
          disabled={!enabledFilters.max_date || disabled}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </FilterRow>

      <FilterRow
        label="Message Type"
        enabled={enabledFilters.message_type}
        onToggle={(enabled) => toggleFilter('message_type', enabled)}
        disabled={disabled}
      >
        <select
          value={filterMisc.reddit_message_type ?? 'all'}
          onChange={(e) => updateFilter('reddit_message_type', e.target.value as any)}
          disabled={!enabledFilters.message_type || disabled}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="all">All</option>
          <option value="post">Posts only</option>
          <option value="comment">Comments only</option>
        </select>
      </FilterRow>

      <div className="pt-3 mt-3 border-t border-gray-200">
        <button
          onClick={() => {
            onChange({});
            setEnabledFilters({
              upvotes: false,
              downvotes: false,
              depth: false,
              nested_replies: false,
              min_date: false,
              max_date: false,
              message_type: false
            });
          }}
          disabled={disabled}
          className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
};
'use client';

import React, { useState, useRef, useEffect } from 'react';

interface KeywordFilterProps {
  keywords: string[];
  selectedKeywords: Set<string>;
  onToggleKeyword: (keyword: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const KeywordFilter: React.FC<KeywordFilterProps> = ({
  keywords,
  selectedKeywords,
  onToggleKeyword,
  onSelectAll,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allSelected = selectedKeywords.size === keywords.length;
  const noneSelected = selectedKeywords.size === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2.5
          bg-white border-2 rounded-lg
          font-medium text-sm
          transition-all duration-200
          hover:shadow-md
          ${
            noneSelected
              ? 'border-gray-200 text-gray-600'
              : 'border-purple-500 text-purple-700 bg-purple-50'
          }
        `}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <span>
          Filter Keywords
          {!allSelected && !noneSelected && (
            <span className="ml-1 text-xs">({selectedKeywords.size})</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
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
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="
            absolute top-full mt-2 left-0 z-30
            w-80 max-h-96 overflow-y-auto
            bg-white border-2 border-gray-200 rounded-lg shadow-xl
            animate-[slideInDown_200ms_ease-out]
          "
        >
          {/* Header with actions */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Select Keywords
              </span>
              <span className="text-xs text-gray-500">
                {selectedKeywords.size} / {keywords.length}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSelectAll();
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => {
                  onClearAll();
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Keyword list */}
          <div className="p-2">
            {keywords.map((keyword) => {
              const isSelected = selectedKeywords.has(keyword);
              return (
                <label
                  key={keyword}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                    transition-all duration-150
                    hover:bg-gray-50
                    ${isSelected ? 'bg-purple-50' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleKeyword(keyword)}
                    className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    {keyword}
                  </span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-purple-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

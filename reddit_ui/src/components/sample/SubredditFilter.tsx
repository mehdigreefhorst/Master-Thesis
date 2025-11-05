'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SubredditFilterProps {
  subreddits: string[];
  selectedSubreddits: Set<string>;
  onToggleSubreddit: (subreddit: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const SubredditFilter: React.FC<SubredditFilterProps> = ({
  subreddits,
  selectedSubreddits,
  onToggleSubreddit,
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

  const allSelected = selectedSubreddits.size === subreddits.length;
  const noneSelected = selectedSubreddits.size === 0;

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
              : 'border-orange-500 text-orange-700 bg-orange-50'
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
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span>
          Filter Subreddits
          {!allSelected && !noneSelected && (
            <span className="ml-1 text-xs">({selectedSubreddits.size})</span>
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
                Select Subreddits
              </span>
              <span className="text-xs text-gray-500">
                {selectedSubreddits.size} / {subreddits.length}
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

          {/* Subreddit list */}
          <div className="p-2">
            {subreddits.map((subreddit) => {
              const isSelected = selectedSubreddits.has(subreddit);
              return (
                <label
                  key={subreddit}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                    transition-all duration-150
                    hover:bg-gray-50
                    ${isSelected ? 'bg-orange-50' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSubreddit(subreddit)}
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    r/{subreddit}
                  </span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-orange-500"
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

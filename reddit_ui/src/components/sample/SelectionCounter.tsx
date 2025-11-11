'use client';

import React from 'react';

interface SelectionCounterProps {
  selectedCount: number;
  totalCount: number;
  nameTextSelected?: string
}

export const SelectionCounter: React.FC<SelectionCounterProps> = ({
  selectedCount,
  totalCount,
  nameTextSelected = "posts selected",
}) => {
  return (
    <div className="flex items-center gap-4">
      <div
        className="
          relative
          bg-white border-2 border-gray-200
          rounded-xl px-6 py-4
          shadow-md
          transition-all duration-300
        "
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              transition-all duration-300
              ${
                selectedCount > 0
                  ? 'bg-green-100 text-green-600 scale-110'
                  : 'bg-gray-100 text-gray-400'
              }
            `}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Counter text */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span
                className={`
                  text-3xl font-bold
                  transition-all duration-300
                  ${selectedCount > 0 ? 'text-green-600' : 'text-gray-400'}
                `}
                key={selectedCount}
              >
                {selectedCount}
              </span>
              <span className="text-lg text-gray-400">/</span>
              <span className="text-lg text-gray-600 font-medium">
                {totalCount}
              </span>
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {nameTextSelected}
            </span>
          </div>
        </div>

        {/* Animated pulse effect when selection changes */}
        {selectedCount > 0 && (
          <div
            className="
              absolute inset-0 rounded-xl
              bg-green-500 opacity-0
              animate-[ping_600ms_ease-out]
            "
            key={`pulse-${selectedCount}`}
          />
        )}
      </div>
    </div>
  );
};

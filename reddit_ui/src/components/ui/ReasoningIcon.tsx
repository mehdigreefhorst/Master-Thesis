'use client';

import React, { useState } from 'react';

interface ReasoningIconProps {
  per_label_labels?: Record<string,(string | boolean | number)[]>
  className?: string;
  isOpen?: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ReasoningIcon: React.FC<ReasoningIconProps> = ({
  per_label_labels,
  className = '',
  isOpen = false,
  setIsOpen
}) => {

  return (
    <>
      <span
        className={`inline-block cursor-pointer text-xl transition-transform duration-200 hover:scale-110 hover:rotate-6 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        
      </span>
      {isOpen && (
        <div
          className="w-full bg-(--muted) border border-(--border) rounded-(--radius) p-4 animate-[panelExpand_300ms_ease-out] cursor-pointer hover:bg-[oklch(0.94_0_0)] transition-colors wrap-break-word whitespace-normal"
          onClick={() => setIsOpen(!isOpen)}
        >
          {per_label_labels && Object.entries(per_label_labels).map(([per_label, per_label_value_runs])=> (
            per_label_value_runs.map((per_label_value, index) => (
              <div key={index} className="mb-2 last:mb-0">
                <span className='font-bold'>{per_label}-{index + 1} </span>
                <span className="text-sm text-gray-700">{JSON.stringify(per_label_value)}</span>
              </div>
            ))
            
          ))}
          
        </div>
      )}
    </>
  );
};

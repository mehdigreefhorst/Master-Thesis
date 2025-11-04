'use client';

import React, { useState } from 'react';

interface ReasoningIconProps {
  reasoning: string | React.ReactNode;
  className?: string;
  isOpen?: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ReasoningIcon: React.FC<ReasoningIconProps> = ({
  reasoning,
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
          {reasoning}
        </div>
      )}
    </>
  );
};

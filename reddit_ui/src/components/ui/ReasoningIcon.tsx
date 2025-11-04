'use client';

import React, { useState } from 'react';

interface ReasoningIconProps {
  reasoning: string | React.ReactNode;
  className?: string;
}

export const ReasoningIcon: React.FC<ReasoningIconProps> = ({
  reasoning,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline-block">
      <span
        className={`inline-block cursor-pointer text-xl transition-transform duration-200 hover:scale-110 hover:rotate-6 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        💬
      </span>
      {isOpen && (
        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] p-4 mt-2 animate-[panelExpand_300ms_ease-out]">
          {reasoning}
        </div>
      )}
    </div>
  );
};

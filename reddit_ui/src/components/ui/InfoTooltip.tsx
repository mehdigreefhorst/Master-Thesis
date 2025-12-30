'use client';

import React, { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // 8px spacing above the icon
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
  }, [isVisible]);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-gray-400 text-gray-500 cursor-help text-xs font-bold hover:border-blue-500 hover:text-blue-500 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        i
      </div>

      {isVisible && (
        <div
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="relative">
            {text}
            {/* Arrow pointing down */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

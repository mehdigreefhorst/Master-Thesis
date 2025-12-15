'use client';

import { useState } from 'react';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function TruncatedText({ text, maxLength = 30, className = '' }: TruncatedTextProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? `${text.substring(0, maxLength)}...` : text;

  const handleClick = (e: React.MouseEvent) => {
    if (isTruncated) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left,
        y: rect.top - 10
      });
      setShowTooltip(!showTooltip);
    }
  };

  const handleMouseLeave = () => {
    // Optional: auto-close on mouse leave
    // setShowTooltip(false);
  };

  return (
    <>
      <span
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        className={`${className} ${isTruncated ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
        title={isTruncated ? 'Click to see full name' : ''}
      >
        {displayText}
      </span>

      {/* Tooltip Popup */}
      {showTooltip && isTruncated && (
        <>
          {/* Backdrop to close tooltip when clicking outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTooltip(false)}
          />

          {/* Tooltip */}
          <div
            className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl max-w-md break-words"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-sm">{text}</div>
            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
          </div>
        </>
      )}
    </>
  );
}

import React from 'react';

interface KeywordTagProps {
  keyword: string;
  onRemove?: () => void;
  isEditable?: boolean;
  className?: string;
}

export const KeywordTag: React.FC<KeywordTagProps> = ({
  keyword,
  onRemove,
  isEditable = true,
  className = ''
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-full border border-[var(--border)] transition-all duration-200 hover:shadow-[var(--shadow-sm)] animate-[fadeIn_300ms_ease-out] ${className}`}
    >
      <span className="text-sm font-medium">{keyword}</span>
      {isEditable && onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-[var(--destructive)] hover:text-white rounded-full p-0.5 transition-colors duration-150"
          aria-label="Remove keyword"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 3L11 11M11 3L3 11" />
          </svg>
        </button>
      )}
    </div>
  );
};

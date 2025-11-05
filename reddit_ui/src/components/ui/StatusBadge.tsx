import React from 'react';
import Link from 'next/link';
import type { StatusType } from '@/types/scraper-cluster';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  href,
  onClick
}) => {
  const getStatusStyles = (status: StatusType) => {
    switch (status) {
      case 'initialized':
        return {
          base: 'bg-gray-100 text-gray-700 border-gray-400',
          hover: 'hover:bg-gray-700 hover:text-gray-100 hover:border-gray-700'
        };
      case 'ongoing':
        return {
          base: 'bg-blue-100 text-blue-700 border-blue-400',
          hover: 'hover:bg-blue-700 hover:text-blue-100 hover:border-blue-700'
        };
      case 'paused':
        return {
          base: 'bg-yellow-100 text-yellow-700 border-yellow-400',
          hover: 'hover:bg-yellow-700 hover:text-yellow-100 hover:border-yellow-700'
        };
      case 'completed':
        return {
          base: 'bg-green-100 text-green-700 border-green-400',
          hover: 'hover:bg-green-700 hover:text-green-100 hover:border-green-700'
        };
      case 'error':
        return {
          base: 'bg-red-100 text-red-700 border-red-400',
          hover: 'hover:bg-red-700 hover:text-red-100 hover:border-red-700'
        };
      default:
        return {
          base: 'bg-gray-100 text-gray-700 border-gray-400',
          hover: 'hover:bg-gray-700 hover:text-gray-100 hover:border-gray-700'
        };
    }
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'initialized':
        return '○';
      case 'ongoing':
        return '◐';
      case 'paused':
        return '⏸';
      case 'completed':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const styles = getStatusStyles(status);
  const isClickable = !!href;

  const badgeContent = (
    <span
      className={`
        inline-flex items-center justify-center gap-2
        px-2 py-2 rounded-md
        text-sm font-semibold
        border-2
        transition-all duration-300 ease-in-out
        ${styles.base}
        ${isClickable ? `${styles.hover} cursor-pointer transform hover:scale-105 hover:shadow-md` : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <span className="text-base">{getStatusIcon(status)}</span>
      <span className="capitalize">{status}</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} onClick={(e) => e.stopPropagation()}>
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
};

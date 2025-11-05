'use client';

import { memo } from 'react';

export type Status = 'pending' | 'ongoing' | 'done' | 'error';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

const statusConfig = {
  pending: {
    icon: '⏳',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    label: 'Pending',
  },
  ongoing: {
    icon: '⚡',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    label: 'In Progress',
  },
  done: {
    icon: '✅',
    color: 'bg-green-100 text-green-700 border-green-300',
    label: 'Completed',
  },
  error: {
    icon: '❌',
    color: 'bg-red-100 text-red-700 border-red-300',
    label: 'Error',
  },
};

const StatusBadgeComponent: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  pulse = false,
}) => {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <div className="relative inline-flex">
      <span
        className={`
          ${sizeMap[size]} ${config.color}
          inline-flex items-center gap-1.5
          font-semibold rounded-full border
          transition-all duration-300
        `}
      >
        <span className={pulse && status === 'ongoing' ? 'animate-pulse' : ''}>
          {config.icon}
        </span>
        {displayLabel}
      </span>

      {/* Ping animation for ongoing status */}
      {status === 'ongoing' && pulse && (
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
        </span>
      )}
    </div>
  );
};

export const StatusBadge = memo(StatusBadgeComponent);

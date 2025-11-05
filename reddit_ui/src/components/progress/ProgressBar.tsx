'use client';

import { memo } from 'react';

interface ProgressBarProps {
  percentage: number;
  height?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'gradient';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const heightMap = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
};

const ProgressBarComponent: React.FC<ProgressBarProps> = ({
  percentage,
  height = 'md',
  color = 'gradient',
  showLabel = false,
  animated = true,
  className = '',
}) => {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`relative w-full ${className}`}>
      {/* Background track */}
      <div className={`w-full ${heightMap[height]} bg-gray-200 rounded-full overflow-hidden`}>
        {/* Progress fill */}
        <div
          className={`${heightMap[height]} ${colorMap[color]} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
          style={{ width: `${clampedPercentage}%` }}
        >
          {/* Animated shimmer effect */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
          )}
        </div>
      </div>

      {/* Percentage label */}
      {showLabel && (
        <div className="absolute right-0 -top-6 text-sm font-semibold text-gray-700">
          {Math.round(clampedPercentage)}%
        </div>
      )}
    </div>
  );
};

export const ProgressBar = memo(ProgressBarComponent);

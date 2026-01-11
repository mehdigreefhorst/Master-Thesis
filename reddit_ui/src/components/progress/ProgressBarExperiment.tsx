'use client';

import { memo } from 'react';
import { ProgressBarData } from '@/types/experiment';
import { StatusType } from '@/types/scraper-cluster';

interface ProgressBarExperimentProps {
  progressBarData: ProgressBarData;
  status: StatusType;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const heightMap = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
};

const ProgressBarExperimentComponent: React.FC<ProgressBarExperimentProps> = ({
  progressBarData,
  status,
  height = 'md',
  className = '',
}) => {
  const { total_expected, completed_predictions, failed_predictions } = progressBarData;

  // Calculate percentages
  const completedPercentage = total_expected > 0
    ? (completed_predictions / total_expected) * 100
    : 0;
  const failedPercentage = total_expected > 0
    ? (failed_predictions / total_expected) * 100
    : 0;

  // Clamp values to ensure they don't exceed 100%
  const clampedCompletedPercentage = Math.min(100, completedPercentage);
  const clampedFailedPercentage = Math.min(100 - clampedCompletedPercentage, failedPercentage);
  const totalFilledPercentage = clampedCompletedPercentage + clampedFailedPercentage;
  const emptyPercentage = 100 - totalFilledPercentage;

  // Determine if we have enough space to show text
  const showCompletedText = clampedCompletedPercentage > 15;
  const showFailedText = clampedFailedPercentage > 15;

  // Animation settings based on status
  const shouldAnimate = status === 'ongoing' || status === 'initialized';
  const showEmptyAnimation = shouldAnimate && emptyPercentage > 0;

  // Border animation for different statuses
  const getBorderAnimation = () => {
    switch (status) {
      case 'ongoing':
        return 'animate-[pulse_2s_ease-in-out_infinite]';
      case 'initialized':
        return 'animate-[pulse_3s_ease-in-out_infinite]';
      case 'error':
        return 'animate-[pulse_1s_ease-in-out_infinite] border-red-400';
      case 'paused':
        return 'opacity-70';
      case 'completed':
      default:
        return '';
    }
  };

  return (
    <div className={`relative w-full mb-3 ${className}`}>
      {/* Battery container */}
      <div className="relative">
        {/* Battery outer shell - light grey with border */}
        <div
          className={`w-full ${heightMap[height]} bg-gray-100 border-2 rounded-md overflow-hidden relative ${getBorderAnimation()}`}
        >
          {/* Empty/Pending area animation (for ongoing/initialized status) */}
          {showEmptyAnimation && (
            <div
              className="absolute top-0 right-0 h-full bg-blue-50/50 transition-all duration-700 ease-out"
              style={{ width: `${emptyPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/40 to-transparent animate-[shimmer_3s_infinite]" />
            </div>
          )}

          {/* Failed predictions bar (Red) - positioned first */}
          {failed_predictions > 0 && (
            <div
              className={`absolute left-0 top-0 ${heightMap[height]} bg-red-500 transition-all duration-700 ease-out overflow-hidden z-10`}
              style={{ width: `${clampedFailedPercentage}%` }}
            >
              {/* Animated shimmer effect */}
              {shouldAnimate && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
              )}

              {/* Failed text */}
              {showFailedText && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold px-2 whitespace-nowrap">
                    failed: {failed_predictions}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Completed predictions bar (Green) - positioned after failed */}
          {completed_predictions > 0 && (
            <div
              className={`absolute top-0 ${heightMap[height]} bg-green-500 transition-all duration-700 ease-out overflow-hidden z-10`}
              style={{
                left: `${clampedFailedPercentage}%`,
                width: `${clampedCompletedPercentage}%`
              }}
            >
              {/* Animated shimmer effect */}
              {shouldAnimate && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
              )}

              {/* Completed text */}
              {showCompletedText && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold px-2 whitespace-nowrap">
                    completed: {completed_predictions}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Total expected count inside the battery on the right */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center text-[10px] leading-tight text-gray-600 font-medium z-20">
            <span className="text-xs font-semibold">{total_expected}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProgressBarExperiment = memo(ProgressBarExperimentComponent);

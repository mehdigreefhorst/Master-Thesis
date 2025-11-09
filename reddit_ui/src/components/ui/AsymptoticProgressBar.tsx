import React, { useEffect, useState } from 'react';

interface AsymptoticProgressBarProps {
  isActive: boolean;
  duration?: number; // Duration in milliseconds (default 60000ms = 60s)
  maxProgress?: number; // Maximum progress to approach (default 95%)
  className?: string;
}

/**
 * Progress bar that fills quickly at first, then slows down asymptotically
 * Uses exponential decay: progress = max * (1 - e^(-t/tau))
 */
export const AsymptoticProgressBar: React.FC<AsymptoticProgressBarProps> = ({
  isActive,
  duration = 60000,
  maxProgress = 95,
  className = ''
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const tau = duration / 5; // Time constant for exponential decay

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const t = elapsed / 1000; // Convert to seconds

      // Exponential approach: progress = max * (1 - e^(-t/tau))
      const currentProgress = maxProgress * (1 - Math.exp(-t / (tau / 1000)));

      setProgress(Math.min(currentProgress, maxProgress));

      if (currentProgress < maxProgress) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);

    return () => {
      setProgress(0);
    };
  }, [isActive, duration, maxProgress]);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
      </div>
      <div className="mt-2 text-center text-sm text-gray-600 font-medium">
        {Math.round(progress)}%
      </div>
    </div>
  );
};

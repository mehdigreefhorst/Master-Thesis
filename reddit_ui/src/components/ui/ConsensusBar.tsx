import React from 'react';
import { Check, X } from 'lucide-react';

interface ConsensusBarProps {
  value: number; // 0-3 representing how many runs matched
  predictedValues?: (string | boolean | number)[]  // actual values of the predictions
  groundTruth?: boolean | null | string | number; // The ground truth * total -> this is what we would like to see
  total?: number; // Total runs (default 3)
  isPartial?: boolean; // Whether this is a partial match (warning state)
}

export const ConsensusBar: React.FC<ConsensusBarProps> = ({
  value,
  predictedValues,
  groundTruth,
  total = 3,
}) => {
  // Helper function to get color based on correctness
  const getSegmentColor = (predictedValue: string | boolean | number, isCorrect: boolean) => {
    // Special handling for booleans
    if (typeof predictedValue === 'boolean') {
      if (isCorrect) {
        // Correctly predicted false → grey
        if (predictedValue === false) {
          return 'bg-gray-400 dark:bg-gray-500';
        }
        // Correctly predicted true → green
        return 'bg-green-500';
      } else {
        // Incorrectly predicted (either false when should be true, or true when should be false) → red
        return 'bg-red-400';
      }
    }

    // For non-boolean values, use standard green/red
    if (isCorrect) {
      return 'bg-green-500';
    } else {
      return 'bg-red-400';
    }
  };

  // Helper function to render label (icon for boolean, text for others)
  const renderLabel = (value: string | boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-3 h-3" strokeWidth={3} />
      ) : (
        <X className="w-3 h-3" strokeWidth={3} />
      );
    }

    // For non-boolean values, return text
    if (typeof value === 'string') {
      // Abbreviate long category names
      if (value.length > 8) {
        return value.substring(0, 6) + '..';
      }
      return value;
    }
    return String(value);
  };

  // If we have predicted values, render segments
  if (predictedValues && predictedValues.length > 0) {
    const segmentWidth = 100 / predictedValues.length;

    return (
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative flex">
        {predictedValues.map((predictedValue, index) => {
          const isCorrect = predictedValue === groundTruth;
          const label = renderLabel(predictedValue);

          return (
            <div
              key={index}
              className={`relative flex items-center justify-center transition-all duration-300 ${getSegmentColor(predictedValue, isCorrect)}`}
              style={{ width: `${segmentWidth}%` }}
              title={`Run ${index + 1}: ${predictedValue} ${isCorrect ? '✓' : '✗'}`}
            >
              {/* Icon or tiny label inside segment */}
              {typeof predictedValue === 'boolean' ? (
                <div className="text-white flex items-center justify-center">
                  {label}
                </div>
              ) : (
                <span className="text-[8px] font-semibold text-white opacity-90 select-none">
                  {label}
                </span>
              )}

              {/* Divider between segments (except last) */}
              {index < predictedValues.length - 1 && (
                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/30" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to original bar if no predicted values
  const percentage = (value / total) * 100;

  return (
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
      <div
        className={`h-full rounded transition-all duration-500 ease-out ${
          !groundTruth && value > 0 || groundTruth && value !== total ? 'bg-yellow-500' : 'bg-green-500'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

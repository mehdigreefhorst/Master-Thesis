'use client';

import { Card } from '@/components/ui/Card';

interface FilterCountDisplayProps {
  beforeCount: number;
  afterCount: number;
}

export const FilterCountDisplay: React.FC<FilterCountDisplayProps> = ({
  beforeCount,
  afterCount
}) => {
  const percentage = beforeCount > 0
    ? ((afterCount / beforeCount) * 100).toFixed(1)
    : 0;

  const removed = beforeCount - afterCount;
  const removedPercentage = beforeCount > 0
    ? ((removed / beforeCount) * 100).toFixed(1)
    : 0;

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Filter Results</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Before Filtering */}
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-600 mb-1">Before Filtering</div>
          <div className="text-3xl font-bold text-blue-900">{beforeCount.toLocaleString()}</div>
          <div className="text-xs text-blue-600 mt-1">Total Documents</div>
        </div>

        {/* After Filtering */}
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-green-600 mb-1">After Filtering</div>
          <div className="text-3xl font-bold text-green-900">{afterCount.toLocaleString()}</div>
          <div className="text-xs text-green-600 mt-1">{percentage}% Remaining</div>
        </div>

        {/* Removed */}
        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Filtered Out</div>
          <div className="text-3xl font-bold text-gray-900">{removed.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">{removedPercentage}% Removed</div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Filtering Impact</span>
          <span className="text-sm text-gray-600">{percentage}% pass rate</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Effectiveness:</span>
          <span className="font-medium">
            {afterCount === 0 ? "No matches" :
             afterCount === beforeCount ? "No filtering applied" :
             removed < beforeCount * 0.1 ? "Light filtering" :
             removed < beforeCount * 0.5 ? "Moderate filtering" :
             "Heavy filtering"}
          </span>
        </div>
      </div>
    </Card>
  );
};

import React from 'react';
import { Button } from '../ui/Button';

interface PageHeaderProps {
  title: string;
  currentSample?: number;
  totalSamples?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  currentSample,
  totalSamples,
  onPrevious,
  onNext,
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {currentSample !== undefined && totalSamples !== undefined && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            #{currentSample} / {totalSamples}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onPrevious}>
              ← Previous
            </Button>
            <Button variant="secondary" onClick={onNext}>
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

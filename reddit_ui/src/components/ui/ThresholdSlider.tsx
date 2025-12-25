import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { InfoTooltip } from './InfoTooltip';

interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  onReset: () => void;
  label?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const ThresholdSlider: React.FC<ThresholdSliderProps> = ({
  value,
  onChange,
  onCommit,
  onReset,
  label = 'Threshold',
  helpText = 'Adjust the threshold value',
  min = 0,
  max = 1,
  step = 0.01,
  className = ''
}) => {
  const handleCommit = () => {
    if (onCommit) {
      onCommit(value);
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex ">
        <div className="flex justify-between items-center mb-2 flex-row">
          <label className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
          <InfoTooltip text={helpText} className='mb-4'/>
          <Button
            variant="invisible"
            size="sm"
            px="px-2"
            py="py-1"
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Reset
          </Button>
        </div>
        <div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
            <span>{min.toFixed(1)}</span>
            <span className="font-medium text-[var(--foreground)]">{value.toFixed(2)}</span>
            <span>{max.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      
    </Card>
  );
};

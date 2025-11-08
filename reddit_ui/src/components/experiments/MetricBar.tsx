import React from 'react';

interface MetricBarProps {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning';
  className?: string;
}

export const MetricBar: React.FC<MetricBarProps> = ({
  label,
  value,
  variant = 'default',
  className = ''
}) => {
  const getVariantColor = () => {
    if (variant === 'success' || value >= 90) return 'bg-(--success)';
    if (variant === 'warning' || value < 75) return 'bg-(--warning)';
    return 'bg-(--primary)';
  };

  const getIcon = () => {
    if (value >= 90) return '✓';
    if (value < 75) return '⚠';
    return '';
  };

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-(--muted-foreground)">{label}</span>
        <span className="text-sm font-semibold text-foreground">
          {getIcon()} {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 bg-(--bar-empty) rounded-full overflow-hidden">
        <div
          className={`h-full ${getVariantColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

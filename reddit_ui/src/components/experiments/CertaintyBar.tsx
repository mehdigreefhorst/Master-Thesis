import React from 'react';

interface CertaintyBarProps {
  certaintyDistribution: Record<1 | 2 | 3 | 4 | 5, number>; // Count of samples with x/runs_per_unit agreement
  runsPerUnit: 1 | 2 | 3 | 4 | 5; // Number of runs per unit (denominator)
  total: number;      // Total samples with this label
  className?: string;
}

export const CertaintyBar: React.FC<CertaintyBarProps> = ({
  certaintyDistribution,
  runsPerUnit,
  total,
  className = ''
}) => {
  // Get all agreement levels present in the distribution, sorted descending
  const agreementLevels = Object.keys(certaintyDistribution)
    .map(Number)
    .sort((a, b) => b - a);

  // Calculate color class based on agreement ratio
  const getColorClass = (level: number) => {
    const ratio = level / runsPerUnit;
    if (ratio === 1) return 'bg-(--success)';
    if (ratio >= 0.6) return 'bg-(--warning)';
    return 'bg-(--muted)';
  };

  const getTextColorClass = (level: number) => {
    const ratio = level / runsPerUnit;
    if (ratio >= 0.6) return 'text-white';
    return 'text-(--muted-foreground)';
  };

  const getSymbol = (level: number) => {
    const ratio = level / runsPerUnit;
    if (ratio === 1) return '▓';
    if (ratio >= 0.6) return '▒';
    return '░';
  };

  return (
    <div className={className}>
      <div className="flex gap-0.5 h-4 rounded overflow-hidden">
        {agreementLevels.map((level) => {
          const count = certaintyDistribution[level as keyof typeof certaintyDistribution] || 0;
          const pct = (count / total) * 100;

          return (
            <div
              key={level}
              className={`${getColorClass(level)} ${getTextColorClass(level)} transition-all duration-500 flex items-center justify-center text-[10px] font-bold`}
              style={{ width: `${pct}%` }}
              title={`${count} samples (${pct.toFixed(0)}%) - ${level}/${runsPerUnit} agreement`}
            >
              {pct > 15 ? getSymbol(level) : ''}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-(--muted-foreground) mt-1">
        <span>
          {agreementLevels.map(level => {
            const count = certaintyDistribution[level as keyof typeof certaintyDistribution] || 0;
            const pct = (count / total) * 100;
            return pct.toFixed(0);
          }).join('%-')}%
        </span>
      </div>
    </div>
  );
};

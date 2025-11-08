import React from 'react';

interface ConfusionMatrixProps {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  className?: string;
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({
  truePositive,
  falsePositive,
  falseNegative,
  trueNegative,
  className = ''
}) => {
  return (
    <div className={`inline-block ${className}`}>
      <div className="grid grid-cols-2 gap-1 border border-(--border) rounded overflow-hidden">
        {/* True Positive */}
        <div
          className="bg-[oklch(0.65_0.18_145_/_0.2)] border-r border-b border-(--border) p-2 text-center hover:bg-[oklch(0.65_0.18_145_/_0.3)] transition-colors"
          title="True Positive: Correctly predicted True"
        >
          <div className="text-lg font-bold text-foreground">{truePositive}</div>
        </div>

        {/* False Negative */}
        <div
          className="bg-[oklch(0.60_0.22_25_/_0.15)] border-b border-(--border) p-2 text-center hover:bg-[oklch(0.60_0.22_25_/_0.25)] transition-colors"
          title="False Negative: Missed True labels"
        >
          <div className="text-lg font-bold text-foreground">{falseNegative}</div>
        </div>

        {/* False Positive */}
        <div
          className="bg-[oklch(0.70_0.18_60_/_0.15)] border-r border-(--border) p-2 text-center hover:bg-[oklch(0.70_0.18_60_/_0.25)] transition-colors"
          title="False Positive: Incorrectly predicted True"
        >
          <div className="text-lg font-bold text-foreground">{falsePositive}</div>
        </div>

        {/* True Negative */}
        <div
          className="bg-[oklch(0.65_0.18_145_/_0.2)] p-2 text-center hover:bg-[oklch(0.65_0.18_145_/_0.3)] transition-colors"
          title="True Negative: Correctly predicted False"
        >
          <div className="text-lg font-bold text-foreground">{trueNegative}</div>
        </div>
      </div>
      <div className="text-[9px] text-(--muted-foreground) text-center mt-1">
        <div className="grid grid-cols-2 gap-1">
          <div>Predicted ✓</div>
          <div>Predicted ✗</div>
        </div>
      </div>
    </div>
  );
};

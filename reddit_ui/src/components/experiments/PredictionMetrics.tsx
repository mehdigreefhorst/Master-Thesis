import React from 'react';
import { CertaintyBar } from './CertaintyBar';
import { ConfusionMatrix } from './ConfusionMatrix';

export interface PredictionMetric {
  labelName: string;
  prevalence: number;
  prevalenceCount: number;
  totalSamples: number;
  accuracy: number;
  certaintyDistribution: {
    certain: number;
    uncertain: number;
    split: number;
  };
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
}

interface PredictionMetricVisualizationProps {
  metrics: PredictionMetric[];
  className?: string;
}

export const PredictionMetricVisualization: React.FC<PredictionMetricVisualizationProps> = ({
  metrics,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {metrics.map((metric) => (
        <div
          key={metric.labelName}
          className="border-b border-(--border) pb-3 last:border-b-0 animate-[insightAppear_300ms_ease-out]"
        >
          <h4 className="text-sm font-semibold mb-2 text-foreground">
            {metric.labelName.replace(/_/g, ' ')}
          </h4>

          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            {/* Left column: Metrics */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-(--muted-foreground)">Prevalence:</span>
                <span className="font-semibold">
                  {metric.prevalence.toFixed(0)}% ({metric.prevalenceCount}/{metric.totalSamples})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-(--muted-foreground)">Accuracy:</span>
                <span className={`font-semibold ${metric.accuracy >= 90 ? 'text-(--success)' : metric.accuracy < 75 ? 'text-(--warning)' : ''}`}>
                  {metric.accuracy >= 90 ? '✓' : metric.accuracy < 75 ? '⚠' : ''} {metric.accuracy.toFixed(0)}%
                </span>
              </div>

              <div>
                <div className="text-(--muted-foreground) mb-1">Certainty:</div>
                <CertaintyBar
                  certain={metric.certaintyDistribution.certain}
                  uncertain={metric.certaintyDistribution.uncertain}
                  split={metric.certaintyDistribution.split}
                  total={metric.prevalenceCount}
                />
              </div>
            </div>

            {/* Right column: Confusion Matrix */}
            <div>
              <div className="text-[9px] text-(--muted-foreground) mb-1 text-center">Confusion</div>
              <ConfusionMatrix
                truePositive={metric.confusionMatrix.tp}
                falsePositive={metric.confusionMatrix.fp}
                falseNegative={metric.confusionMatrix.fn}
                trueNegative={metric.confusionMatrix.tn}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="text-[10px] text-(--muted-foreground) pt-2 border-t border-(--border)">
        💡 Certainty: <span className="font-mono">▓</span> 3/3 runs agree •
        <span className="font-mono">▒</span> 2/3 runs •
        <span className="font-mono">░</span> split/uncertain
      </div>
    </div>
  );
};

import React from 'react';
import { CertaintyBar } from './CertaintyBar';
import { ConfusionMatrix } from './ConfusionMatrix';

export interface PredictionMetric {
  labelName: string;
  prevalence: Record<string, number> | null;
  prevalenceCount: Record<string, number>;
  totalSamples: number;
  accuracy: number;
  certaintyDistribution: Record<string, Record<string, number>>; // ← Fixed: nested structure
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
}

interface PredictionMetricVisualizationProps {
  metrics: PredictionMetric[];
  combinedMetrics?: PredictionMetric[]; // Optional combined labels metrics
  runsPerUnit: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

export const PredictionMetricVisualization: React.FC<PredictionMetricVisualizationProps> = ({
  metrics,
  combinedMetrics,
  runsPerUnit,
  className = ''
}) => {
  // Combine metrics with combined metrics first (if available)
  const allMetrics = combinedMetrics && combinedMetrics.length > 0
    ? [...combinedMetrics, ...metrics]
    : metrics;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Combined Labels Section Header */}
      {combinedMetrics && combinedMetrics.length > 0 && (
        <div className="mb-2 pb-2 border-b-2 border-(--border)">
          <h3 className="text-sm font-bold text-(--foreground) uppercase tracking-wide">
            Combined Labels Metrics
          </h3>
        </div>
      )}

      {allMetrics.map((metric, index) => {
        // Show divider between combined and regular metrics
        const isCombinedMetric = combinedMetrics && index < combinedMetrics.length;
        const isFirstRegularMetric = combinedMetrics && index === combinedMetrics.length;
        const showSectionDivider = isFirstRegularMetric;
        // Extract prevalence data (API returns {"True": 0.6} or {"False": 1.0})
        const prevalenceValue = metric.prevalence 
          ? Object.values(metric.prevalence)[0] * 100 
          : 0;
        const prevalenceCountValue = Object.values(metric.prevalenceCount)[0] || 0;
        
        // Extract certainty distribution for "True" predictions only
        // If no "True" key exists, try "False" or use empty object
        const trueCertainty = metric.certaintyDistribution?.True || 
                              metric.certaintyDistribution?.False || 
                              {};
        
        // Convert string keys to numbers for CertaintyBar
        const certaintyForBar: Record<number, number> = {};
        Object.entries(trueCertainty).forEach(([key, value]) => {
          certaintyForBar[parseInt(key)] = value;
        });

        return (
          <React.Fragment key={`${metric.labelName}-${index}`}>
            {/* Section Divider between combined and regular metrics */}
            {showSectionDivider && (
              <div className="my-4 pt-3 border-t-2 border-(--border)">
                <h3 className="text-sm font-bold text-(--foreground) uppercase tracking-wide mb-2">
                  Individual Labels Metrics
                </h3>
              </div>
            )}

            <div
              className="border-b border-(--border) pb-3 last:border-b-0 animate-[insightAppear_300ms_ease-out]"
            >
              <h4 className="text-sm font-semibold mb-2 text-foreground">
                {metric.labelName.replace(/_/g, ' ')}
                {isCombinedMetric && <span className="ml-2 text-xs text-(--muted-foreground)">(Combined)</span>}
              </h4>

            <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
              {/* Left column: Metrics */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-(--muted-foreground)">Prevalence:</span>
                  <span className="font-semibold">
                    {prevalenceValue.toFixed(0)}% ({prevalenceCountValue}/{metric.totalSamples})
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
                    certaintyDistribution={certaintyForBar as Record<1 | 2 | 3 | 4 | 5, number>}
                    runsPerUnit={runsPerUnit}
                    total={prevalenceCountValue}
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
          </React.Fragment>
        );
      })}

      <div className="text-[10px] text-(--muted-foreground) pt-2 border-t border-(--border)">
        💡 Certainty: <span className="font-mono">▓</span> 5/{runsPerUnit} runs agree •
        <span className="font-mono">▒</span> 3/{runsPerUnit} runs •
        <span className="font-mono">░</span> split/uncertain {runsPerUnit} runs
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MetricBar } from './MetricBar';
import { LabelMetrics, LabelMetric } from './LabelMetrics';

export interface ExperimentData {
  id: string;
  name: string;
  model: string;
  created: string;
  totalSamples: number;
  overallAccuracy: number;
  overallConsistency: number;
  labelMetrics: LabelMetric[];
}

interface ExperimentCardProps {
  experiment: ExperimentData;
  onView?: (id: string) => void;
  onClone?: (id: string) => void;
  className?: string;
}

export const ExperimentCard: React.FC<ExperimentCardProps> = ({
  experiment,
  onView,
  onClone,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={`p-4 hover:shadow-(--shadow-md) transition-shadow duration-200 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-semibold mb-1">📝 {experiment.name}</h3>
          <div className="flex gap-2 text-xs text-(--muted-foreground)">
            <Badge variant="default">{experiment.model}</Badge>
            <span>•</span>
            <span>{experiment.created}</span>
            <span>•</span>
            <span>{experiment.totalSamples} samples</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="invisible"
            className="mt-0! py-1! px-2! text-xs"
            onClick={() => onView?.(experiment.id)}
          >
            View
          </Button>
          <Button
            variant="invisible"
            className="mt-0! !py-1 px-2! text-xs"
            onClick={() => onClone?.(experiment.id)}
          >
            Clone
          </Button>
        </div>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <MetricBar
          label="Overall Accuracy"
          value={experiment.overallAccuracy}
        />
        <MetricBar
          label="Overall Consistency"
          value={experiment.overallConsistency}
        />
      </div>

      {/* Expand/Collapse Toggle */}
      <Button
        variant="invisible"
        className="mt-0! w-full py-1! text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▲ Hide Details' : '▼ Show Label Details'}
      </Button>

      {/* Expandable Label Metrics */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-(--border) animate-[panelExpand_300ms_ease-out]">
          <LabelMetrics metrics={experiment.labelMetrics} />
        </div>
      )}
    </Card>
  );
};

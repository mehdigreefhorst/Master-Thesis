import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MetricBar } from './MetricBar';
import { PredictionMetricVisualization, PredictionMetric } from './PredictionMetrics';
import { StatusType } from '@/types/scraper-cluster';
import { TokenStatistics as TokenStatsDisplay } from './TokenStatistics';

export interface TokenStatistics {
  total_successful_predictions: number;
  total_failed_attempts: number;
  total_tokens_used: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number;
  };
  tokens_wasted_on_failures: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tokens_from_retries: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ExperimentData {
  id: string;
  name: string;
  model: string;
  created: string;
  totalSamples: number;
  overallAccuracy: number;
  overallKappa: number;
  predictionMetrics: PredictionMetric[];
  runsPerUnit: 1 | 2 | 3 | 4 | 5
  status: StatusType
  tokenStatistics?: TokenStatistics;
}

interface ExperimentCardProps {
  experiment: ExperimentData;
  onView?: (experiment_id: string) => void;
  onClone?: (experiment_id: string) => void;
  onContinue?: (experiment_id: string) => void;
  className?: string;
}

export const ExperimentCard: React.FC<ExperimentCardProps> = ({
  experiment,
  onView,
  onClone,
  onContinue,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get status badge color and styles
  const getStatusStyles = (status: StatusType): { bg: string; text: string; label: string } => {
    switch (status) {
      case 'initialized':
        return {
          bg: '#E3F2FD',
          text: '#1976D2',
          label: 'Initialized'
        };
      case 'ongoing':
        return {
          bg: '#FFF3E0',
          text: '#F57C00',
          label: 'Running'
        };
      case 'paused':
        return {
          bg: '#F5F5F5',
          text: '#616161',
          label: 'Paused'
        };
      case 'completed':
        return {
          bg: '#E8F5E9',
          text: '#388E3C',
          label: 'Completed'
        };
      case 'error':
        return {
          bg: '#FFEBEE',
          text: '#D32F2F',
          label: 'Error'
        };
      default:
        return {
          bg: '#F5F5F5',
          text: '#616161',
          label: status
        };
    }
  };

  const statusStyles = getStatusStyles(experiment.status);


  return (
    <Card className={`p-4 hover:shadow-(--shadow-md) transition-shadow duration-200 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold">📝 {experiment.name}</h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: statusStyles.bg,
                color: statusStyles.text
              }}
            >
              {statusStyles.label}
            </span>
          </div>
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
            onClick={() => onContinue?.(experiment.id)}
          >
            Continue
          </Button>
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
          label="Overall Kappa"
          value={experiment.overallKappa}
        />
      </div>

      {/* Token Statistics - Always visible if available */}
      {experiment.tokenStatistics && (
        <div className="mt-3 pt-3 border-t border-(--border)">
          <TokenStatsDisplay stats={experiment.tokenStatistics} />
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <Button
        variant="invisible"
        className="mt-0! w-full py-1! text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▲ Hide Label Details' : '▼ Show Label Details'}
      </Button>

      {/* Expandable Label Metrics */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-(--border) animate-[panelExpand_300ms_ease-out]">
          <PredictionMetricVisualization metrics={experiment.predictionMetrics} runsPerUnit={experiment.runsPerUnit}/>
        </div>
      )}
    </Card>
  );
};

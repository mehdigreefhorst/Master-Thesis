import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TruncatedText } from '../ui/TruncatedText';
import { Ribbon } from '../ui/Ribbon';
import { MetricBar } from './MetricBar';
import { PredictionMetricVisualization, PredictionMetric } from './PredictionMetrics';
import { StatusType } from '@/types/scraper-cluster';
import { TokenStatistics as TokenStatsDisplay } from './TokenStatistics';
import { experimentApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { useToast } from '@/components/ui/use-toast';
import { PromptCategory, ReasoningEffort } from '@/types/experiment';

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

export interface ExperimentCost {
    //cost in dollar spend on experiment
    total: number
    completion: number
    prompt: number
    internal_reasoning: number
}

export interface ExperimentData {
  id: string;
  name: string;
  model_id: string;
  input_id: string;
  input_type: string;
  prompt_id: string;
  created: string;
  totalSamples: number;
  overallAccuracy: number;
  overallKappa: number;
  predictionMetrics: PredictionMetric[];
  combinedLabelsAccuracy?: number; // Combined labels accuracy (optional)
  combinedLabelsKappa?: number // Combined labels kappa (optional)
  combinedLabelsPredictionMetrics?: PredictionMetric[]; // Combined labels metrics (optional)
  runsPerUnit: 1 | 2 | 3 | 4 | 5;
  thresholdRunsTrue: 1 | 2 | 3 | 4 | 5;
  status: StatusType
  reasoningEffort: ReasoningEffort
  tokenStatistics?: TokenStatistics;
  experimentCost?: ExperimentCost;
  predictionErrors?: string[] | null
  labelTemplateId: string;
  experimentType: PromptCategory
}

interface ExperimentCardProps {
  experiment: ExperimentData;
  onView?: (experiment: ExperimentData) => void ; //experiment_id: string, label_template_id: string) => void;
  onClone?: (experiment: ExperimentData) => void;
  onContinue?: (experiment: ExperimentData) => void;
  onFilterSelect?: (experiment: ExperimentData) => void;
  onTest?: (experiment: ExperimentData) => void;
  onThresholdUpdate?: (experiment_id: string) => void;
  className?: string;
}

export const ExperimentCard: React.FC<ExperimentCardProps> = ({
  experiment,
  onView,
  onClone,
  onContinue,
  onFilterSelect,
  onTest,
  onThresholdUpdate,
  className = ''
}) => {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

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

  // Get experiment type ribbon configuration
  const getExperimentTypeConfig = (type: PromptCategory): { bg: string; label: string } => {
    switch (type) {
      case 'classify_cluster_units':
        return {
          bg: '#7C3AED', // Purple
          label: 'Classify'
        };
      case 'rewrite_cluster_unit_standalone':
        return {
          bg: '#059669', // Green
          label: 'Enrich'
        };
      case 'summarize_prediction_notes':
        return {
          bg: '#F59E0B', // Amber
          label: 'Summarize'
        };
      default:
        return {
          bg: '#6B7280', // Gray
          label: type
        };
    }
  };

  const experimentTypeConfig = getExperimentTypeConfig(experiment.experimentType);

  const handleThresholdUpdate = async (newThreshold: number) => {
    try {
      setIsUpdatingThreshold(true);
      await experimentApi.UpdateExperimentThreshold(
        authFetch,
        experiment.id,
        newThreshold
      );

      toast({
        title: "Success",
        description: "Threshold updated successfully",
        variant: "success"
      });

      // Wait 500ms before triggering refresh
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger parent to refresh this specific experiment
      onThresholdUpdate?.(experiment.id);

      setIsEditingThreshold(false);
    } catch (error) {
      console.error('Failed to update threshold:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update threshold',
        variant: "destructive"
      });
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  return (
    <Card className={`p-4 pl-8 hover:shadow-(--shadow-md) transition-shadow duration-200 relative overflow-visible ${className}`}>
      {/* Experiment Type Ribbon */}
      <Ribbon
        text={experimentTypeConfig.label}
        backgroundColor={experimentTypeConfig.bg}
        textColor="#FFFFFF"
        size="sm"
        corner='top-right'

      />


      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold">
              📝 <TruncatedText text={experiment.name} maxLength={5} />
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: statusStyles.bg,
                color: statusStyles.text
              }}
            >
              {statusStyles.label}
            </span>
            <div className="flex gap-2 ">
              <Button
                variant="invisible"
                className="mt-0! py-1! px-2! text-xs"
                onClick={() => onTest?.(experiment)}
              >
                Test
              </Button>
              <Button
                variant="invisible"
                className="mt-0! py-1! px-2! text-xs"
                onClick={() => onContinue?.(experiment)}
              >
                Continue
              </Button>
              <Button
                variant="invisible"
                className="mt-0! py-1! px-2! text-xs"
                onClick={() => onView?.(experiment)}
              >
                View
              </Button>
              <Button
                variant="invisible"
                className="mt-0! py-1! px-2! text-xs"
                onClick={() => onFilterSelect?.(experiment)}
              >
                Filter
              </Button>
              <Button
                variant="invisible"
                className="mt-0! !py-1 px-2! text-xs"
                onClick={() => onClone?.(experiment)}
              >
                Clone
              </Button>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-(--muted-foreground)">
            <Badge variant="default">{experiment.model_id}</Badge>
            <span>•</span>
            <span>{experiment.created}</span>
            <span>•</span>
            <span>samples {experiment.totalSamples} </span>
            <span>reasoning {experiment.reasoningEffort}</span>
            <span>•</span>
            <span>Runs: {experiment.runsPerUnit}</span>
            <span>•</span>
            {isEditingThreshold ? (
              <div className="inline-flex items-center gap-1">
                <span>Threshold:</span>
                <select
                  value={experiment.thresholdRunsTrue}
                  onChange={(e) => handleThresholdUpdate(Number(e.target.value))}
                  disabled={isUpdatingThreshold}
                  className="px-1 py-0 border border-gray-300 rounded text-xs bg-white"
                  onBlur={() => setIsEditingThreshold(false)}
                  autoFocus
                >
                  {Array.from({ length: experiment.runsPerUnit }, (_, i) => i + 1).map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingThreshold(true)}
                className="cursor-pointer hover:text-blue-600 transition-colors"
                title="Click to edit threshold"
              >
                Threshold: {experiment.thresholdRunsTrue} ✏️
              </span>
            )}
          </div>
          
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
      
      {/* Combined Labels Metrics - Only visible if available */}
      {(experiment.combinedLabelsAccuracy || experiment.combinedLabelsKappa) && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {experiment.combinedLabelsAccuracy && (
            <MetricBar
              label="Combined Accuracy"
              value={(experiment.combinedLabelsAccuracy)|| 0}
            />
          )}
          {experiment.combinedLabelsKappa && (
            <MetricBar
              label="Combined Kappa"
              value={experiment.combinedLabelsKappa || 0}
            />
          )}
        </div>
      )}

      {/* Token Statistics - Always visible if available */}
      {experiment.tokenStatistics && (
        <div className="mt-3 pt-3 border-t border-(--border)">
          <TokenStatsDisplay stats={experiment.tokenStatistics} />
        </div>
      )}

      {/* Prediction Errors - Only visible if errors exist */}
      {experiment.predictionErrors && experiment.predictionErrors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-(--border)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="text-base">⚠️</span> Prediction Errors
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                {experiment.predictionErrors.length} errors
              </span>
            </div>

            {/* Collapsible Error List */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                View error details
              </summary>
              <div className="mt-3 space-y-2 text-xs max-h-60 overflow-y-auto">
                {experiment.predictionErrors.map((error, index) => (
                  <div
                    key={index}
                    className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-2"
                  >
                    <div className="font-medium text-red-900 dark:text-red-100 mb-1">
                      Error {index + 1}
                    </div>
                    <div className="text-red-700 dark:text-red-300 font-mono text-xs whitespace-pre-wrap break-words">
                      {error}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Experiment Cost - Always visible */}
      <div className="mt-3 pt-3 border-t border-(--border)">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Experiment Cost</h4>
          <span className="text-lg font-bold text-green-600">
            ${(experiment.experimentCost?.total ?? 0).toFixed(4)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-500">Prompt</span>
            <span className="font-medium text-gray-700">
              ${(experiment.experimentCost?.prompt ?? 0).toFixed(4)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Completion</span>
            <span className="font-medium text-gray-700">
              ${(experiment.experimentCost?.completion ?? 0).toFixed(4)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Reasoning</span>
            <span className="font-medium text-gray-700">
              ${(experiment.experimentCost?.internal_reasoning ?? 0).toFixed(4)}
            </span>
          </div>
        </div>
      </div>

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
           <PredictionMetricVisualization
             metrics={experiment.predictionMetrics}
             combinedMetrics={experiment.combinedLabelsPredictionMetrics}
             runsPerUnit={experiment.runsPerUnit}
           />
         </div>
        // JSON.stringify(experiment.predictionMetrics)
      )}
    </Card>
  );
};

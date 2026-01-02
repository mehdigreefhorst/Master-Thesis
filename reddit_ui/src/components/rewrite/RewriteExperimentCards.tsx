'use client';

import React, { useState } from 'react';
import { ExperimentAllPredictedData, ExperimentModelInformation, LabelResult } from '@/types/cluster-unit';
import { ReasoningIcon } from '../ui/ReasoningIcon';
import { Card } from '../ui/Card';

interface RewriteExperimentCardsProps {
  allExperimentsModelInformation: ExperimentModelInformation[];
  clusterUnitEntityExperimentData: ExperimentAllPredictedData;
  labelTemplateId: string;
  className?: string;
}

/**
 * Displays rewrite experiment results in a card-based grid layout.
 * Each experiment is shown as a separate card with all runs visible.
 */
export const RewriteExperimentCards: React.FC<RewriteExperimentCardsProps> = ({
  allExperimentsModelInformation,
  clusterUnitEntityExperimentData,
  labelTemplateId,
  className = ''
}) => {
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpandedStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get color based on model
  const getModelColor = (modelId: string) => {
    const lower = modelId.toLowerCase();
    if (lower.includes('gpt')) return 'border-blue-400 bg-blue-50';
    if (lower.includes('claude')) return 'border-purple-400 bg-purple-50';
    if (lower.includes('gemini')) return 'border-green-400 bg-green-50';
    return 'border-gray-400 bg-gray-50';
  };

  const getModelIcon = (modelId: string) => {
    const lower = modelId.toLowerCase();
    if (lower.includes('gpt')) return '🔵';
    if (lower.includes('claude')) return '🟣';
    if (lower.includes('gemini')) return '🟢';
    return '⚪';
  };

  return (
    <div className={className}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {allExperimentsModelInformation.map((experiment, experimentIndex) => {
          const modelColor = getModelColor(experiment.model_id);
          const modelIcon = getModelIcon(experiment.model_id);

          // Check if errors exist for this experiment
          const experimentErrors = clusterUnitEntityExperimentData?.errors?.[experiment.experiment_id];
          const hasErrors = experimentErrors && experimentErrors.errors.length > 0;

          return (
            <Card
              key={experimentIndex}
              className={`border-2 ${modelColor} hover:shadow-lg transition-shadow overflow-hidden flex-shrink-0 w-80`}
            >
              {/* Card Header */}
              <div className="p-4 border-b-2 border-current bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{modelIcon}</span>
                  <h4 className="font-bold text-gray-900">{experiment.model_id}</h4>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">{experiment.prompt_name}</div>
                  {experiment.version && (
                    <div className="text-xs text-gray-600">Version: {experiment.version}</div>
                  )}
                </div>

                {/* Error Toggle */}
                {hasErrors && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800 list-none flex items-center gap-1">
                      <span>▶</span>
                      Errors ({experimentErrors.errors.length})
                    </summary>
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto">
                      {experimentErrors.errors.map((error: string, errorIdx: number) => (
                        <div key={errorIdx} className="text-xs text-red-700 mb-1 pb-1 border-b border-red-200 last:border-b-0">
                          {error}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Card Body - Labels and Runs */}
              <div className="p-4 bg-white space-y-4">
                {clusterUnitEntityExperimentData.label_name_predicted_data.map((labelData, labelIndex) => {
                  const result = labelData.results[experimentIndex];
                  const cardKey = `${experimentIndex}-${labelIndex}`;
                  const isExpanded = expandedStates[cardKey];

                  if (!result) {
                    return (
                      <div key={labelIndex} className="text-center text-gray-400 py-2">
                        <strong className="text-xs">{labelData.label_name}:</strong> —
                      </div>
                    );
                  }

                  // values is an array - each item is a different run
                  const runs = Array.isArray(result.values) ? result.values : [result.values];

                  return (
                    <div key={labelIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {/* Label Name (if multiple labels) */}
                      {clusterUnitEntityExperimentData.label_name_predicted_data.length > 1 && (
                        <div className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                          {labelData.label_name}
                        </div>
                      )}

                      {/* Runs Display */}
                      <div className="space-y-2">
                        {runs.map((runValue, runIndex) => (
                          <div key={runIndex} className="bg-white border border-gray-200 rounded p-2">
                            {/* Run Label (only if more than 1 run) */}
                            {runs.length > 1 && (
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">
                                Run {runIndex + 1}
                              </div>
                            )}

                            {/* Run Value */}
                            <div className="text-sm text-gray-900 leading-relaxed">
                              {runValue || '—'}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Per Label Labels Toggle */}
                      {result.per_label_labels && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-block cursor-pointer text-lg transition-transform duration-200 hover:scale-110 hover:rotate-6"
                              onClick={() => toggleExpanded(cardKey)}
                            >
                              💬
                            </span>
                            <span className="text-xs text-gray-600">
                              {isExpanded ? 'Hide' : 'View'} additional details
                            </span>
                          </div>

                          {/* Expanded Details */}
                          <ReasoningIcon
                            per_label_labels={result.per_label_labels}
                            setIsOpen={() => toggleExpanded(cardKey)}
                            isOpen={isExpanded}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { ModelSelector } from './ModelSelector';
import { ModelInfo } from '@/types/model';

interface ExperimentConfigPanelProps {
  availableModels: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string, modelInfo: ModelInfo) => void;
  runsPerUnit: number;
  onRunsChange: (runs: number) => void;
  reasoningEffort: string;
  onReasoningEffortChange: (effort: string) => void;
  className?: string;
}

export const ExperimentConfigPanel: React.FC<ExperimentConfigPanelProps> = ({
  availableModels,
  selectedModel,
  onModelChange,
  runsPerUnit,
  onRunsChange,
  reasoningEffort,
  onReasoningEffortChange,
  className = '',
}) => {
  const handleSelectModel = (model: ModelInfo) => {
    onModelChange(model.id, model);
  };

  return (
    <div className={className}>
      {/* Model Selector Only */}
      <ModelSelector
        selectedModelId={selectedModel}
        onModelChange={handleSelectModel}
        availableModels={availableModels}
      />
    </div>
  );
};

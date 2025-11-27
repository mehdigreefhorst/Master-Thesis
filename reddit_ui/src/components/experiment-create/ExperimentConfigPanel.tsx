import React from 'react';
import { ModelSelector } from './ModelSelector';
import { ModelInfo } from '@/types/model';

interface ExperimentConfigPanelProps {
  availableModels: ModelInfo[];
  selectedModel?: ModelInfo;
  onModelChange: (modelInfo: ModelInfo) => void;
  className?: string;
}

export const ExperimentConfigPanel: React.FC<ExperimentConfigPanelProps> = ({
  availableModels,
  selectedModel,
  onModelChange,
  className = '',
}) => {


  return (
    <div className={className}>
      {/* Model Selector Only */}
      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        availableModels={availableModels}
      />
    </div>
  );
};

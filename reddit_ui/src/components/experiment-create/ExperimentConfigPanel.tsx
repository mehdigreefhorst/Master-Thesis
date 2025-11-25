import React from 'react';
import { ModelSelector } from './ModelSelector';
import { AVAILABLE_MODELS } from '@/types/model';

interface ExperimentConfigPanelProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  runsPerUnit: number;
  onRunsChange: (runs: number) => void;
  reasoningEffort: string;
  onReasoningEffortChange: (effort: string) => void;
  className?: string;
}

const RUNS_OPTIONS = [1, 2, 3, 4, 5];
const REASONING_EFFORTS = ['low', 'medium', 'high'];

export const ExperimentConfigPanel: React.FC<ExperimentConfigPanelProps> = ({
  selectedModel,
  onModelChange,
  runsPerUnit,
  onRunsChange,
  reasoningEffort,
  onReasoningEffortChange,
  className = '',
}) => {
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  const supportsReasoningEffort = selectedModelInfo?.supports_reasoning || false;

  const selectClassName = `w-full h-12 px-4 py-2 border-2 border-[var(--border)] rounded-lg
    bg-[var(--card)] text-[var(--foreground)] text-sm
    focus:outline-none focus:ring-2 focus:border-[var(--primary)] focus:shadow-[var(--shadow)]
    cursor-pointer transition-all`;

  return (
    <div className={`flex items-end gap-4 ${className}`}>
      {/* Model Selector - Now with advanced dropdown */}
      <div className="flex-1">
        <ModelSelector
          selectedModelId={selectedModel}
          onModelChange={onModelChange}
        />
      </div>

      {/* Runs Per Unit Selector */}
      <div className="flex-1">
        <label htmlFor="runsSelector" className="block text-sm font-bold text-[var(--foreground)] mb-2">
          Runs per Unit
        </label>
        <select
          id="runsSelector"
          value={runsPerUnit}
          onChange={(e) => onRunsChange(Number(e.target.value))}
          className={selectClassName}
        >
          {RUNS_OPTIONS.map((runs) => (
            <option key={runs} value={runs}>
              {runs}
            </option>
          ))}
        </select>
      </div>

      {/* Reasoning Effort Selector */}
      <div className="flex-1">
        <label htmlFor="reasoningSelector" className="block text-sm font-bold text-[var(--foreground)] mb-2">
          Reasoning Effort
        </label>
        <select
          id="reasoningSelector"
          value={reasoningEffort}
          onChange={(e) => onReasoningEffortChange(e.target.value)}
          disabled={!supportsReasoningEffort}
          className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {REASONING_EFFORTS.map((effort) => (
            <option key={effort} value={effort}>
              {effort.charAt(0).toUpperCase() + effort.slice(1)}
            </option>
          ))}
        </select>
        {!supportsReasoningEffort && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Only available for GPT-5 models
          </p>
        )}
      </div>
    </div>
  );
};

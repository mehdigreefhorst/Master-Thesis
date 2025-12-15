import React from 'react';
import { InfoTooltip } from '@/components/ui';

interface PromptEntity {
  id: string;
  name: string;
  system_prompt: string;
  prompt: string;
  category?: string;
}

interface PromptSelectorProps {
  prompts: PromptEntity[];
  selectedPromptId: string;
  onPromptSelect: (promptId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const PromptSelector: React.FC<PromptSelectorProps> = ({
  prompts,
  selectedPromptId,
  onPromptSelect,
  isLoading = false,
  className = '',
}) => {
  
  return (
    <div className={className}>
      <label htmlFor="promptSelector" className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] mb-2">
        Load Prompt
        <InfoTooltip text="Select a saved prompt template to use for this experiment. The prompt defines how the AI model will analyze each cluster unit." />
      </label>
      <select
        id="promptSelector"
        value={selectedPromptId}
        onChange={(e) => onPromptSelect(e.target.value)}
        disabled={isLoading}
        className="w-full h-12 px-2 py-2 border-2 border-[var(--border)] rounded-lg
                 bg-[var(--card)] text-[var(--foreground)] text-sm
                 focus:outline-none focus:ring-2 focus:border-[var(--primary)] focus:shadow-[var(--shadow)]
                 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {isLoading ? 'Loading prompts...' : 'Select prompt'}
        </option>
        {prompts.map((prompt) => (
          <option key={prompt.id} value={prompt.id}>
            {prompt.name || `Prompt ${prompt.id.substring(0, 4)}...`}
          </option>
        ))}
      </select>
    </div>
  );
};

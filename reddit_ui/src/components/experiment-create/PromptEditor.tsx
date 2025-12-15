import React from 'react';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { ThreadFromUnit } from '../thread/ThreadFromUnit';
import { ClusterUnitEntity } from '@/types/cluster-unit';
import { PromptVariablesPanel } from './PromptVariablesPanel';

interface PromptEditorProps {
  currentUnit: ClusterUnitEntity;
  rawPrompt: string;
  onRawPromptChange: (value: string) => void;
  parsedPrompt: string;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  className?: string;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  currentUnit,
  rawPrompt,
  onRawPromptChange,
  parsedPrompt,
  systemPrompt,
  onSystemPromptChange,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Variables Panel - Horizontal Bar */}
      <PromptVariablesPanel rawPrompt={rawPrompt} />

      {/* Raw and Parsed Prompts - Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Raw Prompt */}
        <Textarea
          id="rawPrompt"
          label="Raw Prompt (with variables)"
          value={rawPrompt}
          onChange={(e) => onRawPromptChange(e.target.value)}
          placeholder="Enter your prompt here with variables like {{conversation_thread}}, {{final_reddit_author}}..."
          className="h-[400px] font-mono"
          variant="primary"
        />

        {/* Thread Preview */}
        {currentUnit && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            {/* <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview: Current Cluster Unit</h2> */}
            <ThreadFromUnit currentUnit={currentUnit} />
          </div>
        )}


      </div>
        <div className="grid grid-cols-2 gap-6">

        {/* Right: Parsed Prompt */}
        <div>
          <label htmlFor="parsedPrompt" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Parsed Prompt (with substituted values)
          </label>
          <Card className="w-full h-[400px] px-4 py-3 bg-[var(--muted)]/30 overflow-y-auto">
            <div className="text-sm font-mono whitespace-pre-wrap text-[var(--foreground)]">
              {parsedPrompt || (
                <span className="text-[var(--muted-foreground)]">
                  Parsed prompt will appear here after clicking "Parse Prompt"...
                </span>
              )}
            </div>
          </Card>

        </div>
        {/* System Prompt - Full Width */}
      <Textarea
        id="systemPrompt"
        label="System Prompt"
        value={systemPrompt}
        onChange={(e) => onSystemPromptChange(e.target.value)}
        placeholder="Enter the system prompt here (optional)..."
        className="h-32 font-mono resize-y"
        variant="primary"
      />
    
      </div>
      </div>
  );
};

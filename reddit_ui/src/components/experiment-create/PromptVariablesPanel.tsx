import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';

interface PromptVariable {
  name: string;
  description: string;
}

interface PromptVariablesPanelProps {
  rawPrompt: string;
  className?: string;
}

const AVAILABLE_VARIABLES: PromptVariable[] = [
  {
    name: 'conversation_thread',
    description: 'The full Reddit conversation thread with all messages'
  },
  {
    name: 'final_reddit_author',
    description: 'The author of the final message in the thread'
  },
  {
    name: 'label_template_name',
    description: 'The name of the label template being used'
  },
  {
    name: 'label_template_description',
    description: 'Description of what the label template is for'
  },
  {
    name: 'label_template_variable_descriptions',
    description: 'Descriptions of all variables in the label template'
  },
  {
    name: 'label_template_variable_expected_output',
    description: 'Expected output format for the label template'
  },
  {
    name: 'label_template_one_shot_example',
    description: 'Example usage of the label template'
  }
];

export const PromptVariablesPanel: React.FC<PromptVariablesPanelProps> = ({
  rawPrompt,
  className = ''
}) => {
  const [copiedVariable, setCopiedVariable] = React.useState<string | null>(null);

  // Check which variables are currently used in the prompt
  const usedVariables = useMemo(() => {
    const used = new Set<string>();
    AVAILABLE_VARIABLES.forEach(variable => {
      const pattern = `{{${variable.name}}}`;
      if (rawPrompt.includes(pattern)) {
        used.add(variable.name);
      }
    });
    return used;
  }, [rawPrompt]);

  const handleCopyVariable = (variableName: string) => {
    navigator.clipboard.writeText(`{{${variableName}}}`);
    setCopiedVariable(variableName);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  return (
    <Card className={`p-3 overflow-visible ${className}`}>
      <div className="flex items-center gap-4 overflow-visible">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h3 className="text-md font-semibold text-[var(--foreground)] whitespace-nowrap">
            Available Variables
          </h3>
          <InfoTooltip text="Click on a variable to copy it to clipboard. Variables highlighted in green are currently used in your prompt." />
        </div>

        {/* Horizontal scrollable variable list */}
        <div className="flex-1 overflow-x-auto overflow-y-visible">
          <div className="flex items-center gap-2 pb-1">
            {AVAILABLE_VARIABLES.map((variable) => {
              const isUsed = usedVariables.has(variable.name);
              const isCopied = copiedVariable === variable.name;

              return (
                <div key={variable.name} className="flex items-center gap-1 flex-shrink-0">
                  <button
                  onClick={() => handleCopyVariable(variable.name)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-md
                    transition-all duration-200
                    border relative
                    ${isUsed
                      ? 'bg-green-50 border-green-300 hover:bg-green-100'
                      : 'bg-[var(--muted)]/30 border-[var(--border)] hover:bg-[var(--muted)]/50'
                    }
                    group cursor-pointer
                  `}
                  title={variable.description}
                >
                  <div className="flex items-center gap-2">
                    <code
                      className={`
                        text-xs font-mono font-semibold whitespace-nowrap
                        ${isUsed ? 'text-green-700' : 'text-[var(--foreground)]'}
                      `}
                    >
                      {`{{${variable.name}}}`}
                    </code>

                    {/* Status indicators */}
                    <div className="flex items-center">
                      {isCopied ? (
                        // Checkmark animation when copied
                        <svg
                          className="w-3.5 h-3.5 text-green-600 animate-in zoom-in duration-200"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <>
                          {/* Green dot for used variables */}
                          {isUsed && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 group-hover:hidden" />
                          )}
                          {/* Copy icon on hover */}
                          <svg
                            className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isUsed ? 'text-green-600' : 'text-[var(--muted-foreground)]'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </>
                      )}
                    </div>
                  </div>

                  {/* "Copied!" tooltip */}
                  {isCopied && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
                      Copied!
                    </div>
                  )}
                </button>

                {/* Info tooltip for each variable */}
                <InfoTooltip text={variable.description} />
              </div>
              );
            })}
          </div>
        </div>

        {/* Usage counter */}
        <div className="flex-shrink-0 text-sm text-[var(--muted-foreground)] whitespace-nowrap">
          <span className="font-semibold">{usedVariables.size}</span>/{AVAILABLE_VARIABLES.length} used
        </div>
      </div>
    </Card>
  );
};

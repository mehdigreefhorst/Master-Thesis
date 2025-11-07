'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/utils/fetch';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { experimentApi } from '@/lib/api';

interface PromptEntity {
  id: string;
  name: string;
  system_prompt: string;
  prompt: string;
  category?: string;
}

export default function PromptTesterPage() {
  const authFetch = useAuthFetch();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [parsedPrompt, setParsedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Sample cluster unit variables matching backend parse_classification_prompt
  const [conversationThread, setConversationThread] = useState(
    'User: My laptop keeps crashing when I run Adobe Premiere.\n' +
    'Helper: Have you tried updating your graphics drivers?\n' +
    'User: Yes I updated them yesterday but still getting blue screens.'
  );
  const [finalRedditMessage, setFinalRedditMessage] = useState(
    'Yes I updated them yesterday but still getting blue screens. So frustrated this keeps happening during renders...'
  );

  // Fetch prompts on mount
  useEffect(() => {
    async function fetchPrompts() {
      try {
        setIsLoadingPrompts(true);
        const response = await experimentApi.getPrompts(authFetch);
        const data = await response.json();
        setPrompts(data.prompts || data.prompt_entities || data);
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    fetchPrompts();
  }, [authFetch]);

  // Handle prompt selection from dropdown
  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    const selectedPrompt = prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      setSystemPrompt(selectedPrompt.system_prompt || '');
      setRawPrompt(selectedPrompt.prompt || '');
      setParsedPrompt(''); // Clear parsed prompt when selecting new prompt
    }
  };

  const handleParsePrompt = async () => {
    if (!rawPrompt.trim()) {
      setError('Please enter a prompt to parse');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Client-side parsing using the same variables as backend parse_classification_prompt
      // Replace {conversation_thread} and {final_reddit_message}
      let parsed = rawPrompt;
      parsed = parsed.replaceAll('{conversation_thread}', conversationThread);
      parsed = parsed.replaceAll('{final_reddit_message}', finalRedditMessage);

      setParsedPrompt(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSystemPrompt('');
    setRawPrompt('');
    setParsedPrompt('');
    setError(null);
    setSelectedPromptId('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[95vw] mx-auto">
        {/* Page Header */}
          <div className={`flex justify-between items-center`}>
            <h1 className="text-2xl font-semibold">Prompt Tester</h1>
            <div>
              <label htmlFor="promptSelector" className="block text-sm font-medium text-gray-700 mb-2">
                Load Existing Prompt
              </label>
              <select
                id="promptSelector"
                value={selectedPromptId}
                onChange={(e) => handlePromptSelect(e.target.value)}
                disabled={isLoadingPrompts}
                className="w-full h-12 px-4 py-2 border border-gray-300 rounded-lg
                        bg-white text-gray-900 text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        cursor-pointer transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingPrompts ? 'Loading prompts...' : 'Select a prompt from database'}
                </option>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name || `Prompt ${prompt.id}`}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Select a prompt to auto-fill the system prompt and raw prompt fields
              </p>
            </div>
          </div>



        {/* System Prompt Section - Split into two columns */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left: System Prompt */}
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter the system prompt here (optional)..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       resize-y transition-shadow"
            />
            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleParsePrompt}
                disabled={isLoading || !rawPrompt.trim()}
              >
                {isLoading ? 'Parsing...' : 'Parse Prompt'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClear}
                disabled={isLoading}
              >
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Variables Configuration */}
        <div className="mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Test Data (Cluster Unit Variables):</h3>

          <div>
            <label htmlFor="conversationThread" className="block text-xs font-medium text-gray-700 mb-1">
              Conversation Thread <code className="text-blue-600">{'{conversation_thread}'}</code>
            </label>
            <textarea
              id="conversationThread"
              value={conversationThread}
              onChange={(e) => setConversationThread(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-xs font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       resize-y transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="finalMessage" className="block text-xs font-medium text-gray-700 mb-1">
              Final Reddit Message <code className="text-blue-600">{'{final_reddit_message}'}</code>
            </label>
            <textarea
              id="finalMessage"
              value={finalRedditMessage}
              onChange={(e) => setFinalRedditMessage(e.target.value)}
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-xs font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       resize-y transition-shadow"
            />
          </div>
          
        </div>

          {/* Right: Prompt Selector Dropdown */}
          
        </div>

        

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        

        {/* Two-Column Layout: Raw Prompt (Left) | Parsed Prompt (Right) */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Raw Prompt */}
          <div>
            <label htmlFor="rawPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              Raw Prompt (with variables)
            </label>
            <textarea
              id="rawPrompt"
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              placeholder="Enter your prompt here with variables like {conversation_thread}, {final_reddit_message}..."
              className="w-full h-[500px] px-4 py-3 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       resize-none transition-shadow"
            />
          </div>

          {/* Right: Parsed Prompt */}
          <div>
            <label htmlFor="parsedPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              Parsed Prompt (with substituted values)
            </label>
            <div
              className="w-full h-[500px] px-4 py-3 border border-gray-300 rounded-lg
                       bg-gray-50 text-gray-900 text-sm font-mono
                       overflow-y-auto whitespace-pre-wrap"
            >
              {parsedPrompt || (
                <span className="text-gray-400">
                  Parsed prompt will appear here after clicking "Parse Prompt"...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Note:</span> This page is for testing purposes only.
            No prompt entities are created or saved. Use the variables listed above to test
            how your prompt will look when parsed with actual cluster unit data.
          </p>
        </div>
      </div>
    </div>
  );
}

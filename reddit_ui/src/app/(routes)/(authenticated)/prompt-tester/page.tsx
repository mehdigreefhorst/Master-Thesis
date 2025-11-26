'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { experimentApi } from '@/lib/api';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { ThreadFromUnit } from '@/components/thread/ThreadFromUnit';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { PromptEntity } from '@/types/prompt';

export default function PromptTesterPage() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  const [systemPrompt, setSystemPrompt] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [parsedPrompt, setParsedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const router = useRouter()
  

  // Model and runs configuration
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-nano');
  const [runsPerUnit, setRunsPerUnit] = useState<number>(3);
  const [reasoningEffort, setReasoningEffort] = useState<string>('medium');

  // Check if selected model supports reasoning effort
  const supportsReasoningEffort = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'].includes(selectedModel);

  // Cluster unit pagination state
  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const { toast } = useToast()

  // Sample cluster unit variables matching backend parse_classification_prompt
  const [conversationThread, setConversationThread] = useState(
    'User: My laptop keeps crashing when I run Adobe Premiere.\n' +
    'Helper: Have you tried updating your graphics drivers?\n' +
    'User: Yes I updated them yesterday but still getting blue screens.'
  );
  const [finalRedditMessage, setFinalRedditMessage] = useState(
    'Yes I updated them yesterday but still getting blue screens. So frustrated this keeps happening during renders...'
  );

  // Fetch sample units on mount
  useEffect(() => {
    async function fetchSampleUnits() {
      if (!scraperClusterId) return;

      try {
        setIsLoadingUnits(true);
        const units = await experimentApi.getSampleUnits(authFetch, scraperClusterId);
        setClusterUnits(units);

        // Initialize with first unit if available
        if (units.length > 0) {
          updateClusterUnitData(units[0]);
        }
      } catch (err) {
        console.error('Failed to fetch sample units:', err);
        setError('Failed to load cluster units');
      } finally {
        setIsLoadingUnits(false);
      }
    }

    fetchSampleUnits();
  }, [scraperClusterId, authFetch]);

  // Fetch prompts on mount
  useEffect(() => {
    async function fetchPrompts() {
      try {
        setIsLoadingPrompts(true);
        const prompts = await experimentApi.getPrompts(authFetch);
        setPrompts(prompts);
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    fetchPrompts();
  }, [authFetch]);

  // Update conversation thread and final message from cluster unit
  const updateClusterUnitData = (unit: ClusterUnitEntity) => {
    // Set conversation thread from enriched_comment_thread_text or thread_path_text
    const thread = unit.enriched_comment_thread_text ||
                   (unit.thread_path_text ? unit.thread_path_text.join('\n') : '');
    setConversationThread(thread);

    // Set final message from the unit's text
    setFinalRedditMessage(unit.text);
  };

  // Auto-parse prompt when cluster unit or prompt changes
  const autoParsePrompt = async () => {
    if (!rawPrompt.trim() || !selectedPromptId) return;

    try {
      setSuccess(null); // Clear success message
      const parsed = await experimentApi.parseRawPrompt(authFetch, clusterUnits[currentUnitIndex].id, rawPrompt)
      // let parsed = rawPrompt;
      // parsed = parsed.replaceAll('{conversation_thread}', conversationThread);
      // parsed = parsed.replaceAll('{final_reddit_message}', finalRedditMessage);
      setParsedPrompt(parsed);
    } catch (err) {
      console.error('Auto-parse failed:', err);
    }
  };

  // Handle cluster unit navigation
  const handlePrevUnit = () => {
    if (currentUnitIndex > 0) {
      const newIndex = currentUnitIndex - 1;
      setCurrentUnitIndex(newIndex);
      updateClusterUnitData(clusterUnits[newIndex]);
      if (selectedPromptId && rawPrompt) {
        setTimeout(autoParsePrompt, 0);
      }
    }
  };

  const handleNextUnit = () => {
    if (currentUnitIndex < clusterUnits.length - 1) {
      const newIndex = currentUnitIndex + 1;
      setCurrentUnitIndex(newIndex);
      updateClusterUnitData(clusterUnits[newIndex]);
      if (selectedPromptId && rawPrompt) {
        setTimeout(autoParsePrompt, 0);
      }
    }
  };

  const handleSelectUnit = (unitId: string) => {
    const unitIndex = clusterUnits.findIndex(u => u.id === unitId);
    if (unitIndex !== -1) {
      setCurrentUnitIndex(unitIndex);
      updateClusterUnitData(clusterUnits[unitIndex]);
      if (selectedPromptId && rawPrompt) {
        setTimeout(autoParsePrompt, 0);
      }
    }
  };

  // Handle prompt selection from dropdown
  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    const selectedPrompt = prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      setSystemPrompt(selectedPrompt.system_prompt || '');
      setRawPrompt(selectedPrompt.prompt || '');
      setParsedPrompt(''); // Clear parsed prompt when selecting new prompt

      // Auto-parse with current cluster unit data
      if (clusterUnits.length > 0) {
        setTimeout(autoParsePrompt, 0);
      }
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
      // let parsed = rawPrompt;
      // parsed = parsed.replaceAll('{conversation_thread}', conversationThread);
      // parsed = parsed.replaceAll('{final_reddit_message}', finalRedditMessage);
      const parsed = await experimentApi.parseRawPrompt(authFetch, clusterUnits[currentUnitIndex].id, rawPrompt)

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
    setSuccess(null);
    setSelectedPromptId('');
  };

  const handleCreateExperiment = async () => {
    console.log("created")
    if (!selectedPromptId){
      return toast({
        title: "Error",
        description: "No prompt id is selected!",
        variant: "destructive"
      })
    }
    if (!scraperClusterId){
      return toast({
        title: "Error",
        description: "No scraper cluster id is selected!",
        variant: "destructive"
      })
    }
    experimentApi.createExperiment(authFetch, selectedPromptId, scraperClusterId, selectedModel, runsPerUnit, reasoningEffort)
    router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`)
  }

  const handleSavePrompt = async () => {
    if (!rawPrompt.trim()) {
      setError('Please enter a prompt before saving');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await experimentApi.createPrompt(
        authFetch,
        systemPrompt,
        rawPrompt,
        'classify_cluster_units',
      );

      setSuccess('Prompt saved successfully!');

      // Refresh prompts list
      const prompts = await experimentApi.getPrompts(authFetch);
      setPrompts(prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const currentUnit = clusterUnits[currentUnitIndex];

  // Loading state while fetching cluster units
  if (isLoadingUnits) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading cluster units...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[95vw] mx-auto">
        {/* Page Header with Cluster Unit Pagination */}
        <h1 className="text-2xl font-semibold">Prompt Tester</h1>
        <div className="flex justify-between items-center mb-6">
          

          {/* Cluster Unit Pagination */}
          {clusterUnits.length > 0 && (
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={handlePrevUnit}
                disabled={currentUnitIndex === 0 || isLoadingUnits}
                className="px-3 py-2"
              >
                &lt;
              </Button>

              <select
                value={currentUnit?.id || ''}
                onChange={(e) => handleSelectUnit(e.target.value)}
                disabled={isLoadingUnits}
                className="h-10 px-3 py-2 border border-gray-300 rounded-lg
                         bg-white text-gray-900 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         cursor-pointer transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {clusterUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                     {unit.author.substring(0, 4)}... |
                    {unit.type === 'post' ? ' Post' : ` Comment (depth: ${unit.thread_path_text?.length || 0})`} |
                    ↑{unit.upvotes}
                  </option>
                ))}
              </select>

              <Button
                variant="secondary"
                onClick={handleNextUnit}
                disabled={currentUnitIndex === clusterUnits.length - 1 || isLoadingUnits}
                className="px-3 py-2"
              >
                &gt;
              </Button>

              <span className="text-sm text-gray-600">
                {currentUnitIndex + 1} / {clusterUnits.length}
              </span>
            </div>
          )}
          <Button
            variant="primary"
            onClick={handleParsePrompt}
            disabled={isLoading || !rawPrompt.trim()}
          >
            {isLoading ? 'Parsing...' : 'Parse Prompt'}
          </Button>
          

          {/* Load Existing Prompt */}
          <Button
            variant="primary"
            onClick={handleSavePrompt}
            disabled={isSaving || !rawPrompt.trim()}
          >
            {isSaving ? 'Saving...' : 'Save Prompt'}
          </Button>

          {/* Model Selector */}
          <div>
            <label htmlFor="modelSelector" className="block text-sm font-bold text-gray-700 mb-2">
              Model
            </label>
            <select
              id="modelSelector"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-12 px-4 py-2 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       cursor-pointer transition-shadow"
            >
              <option value="gpt-5-nano">GPT-5 Nano</option>
              <option value="gpt-5-mini">GPT-5 Mini</option>
              <option value="gpt-5">GPT-5</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>

          {/* Runs Per Unit Selector */}
          <div>
            <label htmlFor="runsSelector" className="block text-sm font-bold text-gray-700 mb-2">
              Runs per Unit
            </label>
            <select
              id="runsSelector"
              value={runsPerUnit}
              onChange={(e) => setRunsPerUnit(Number(e.target.value))}
              className="w-full h-12 px-4 py-2 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       cursor-pointer transition-shadow"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>

          {/* Reasoning Effort Selector */}
          <div>
            <label htmlFor="reasoningSelector" className="block text-sm font-bold text-gray-700 mb-2">
              Reasoning Effort
            </label>
            <select
              id="reasoningSelector"
              value={reasoningEffort}
              onChange={(e) => setReasoningEffort(e.target.value)}
              disabled={!supportsReasoningEffort}
              className="w-full h-12 px-4 py-2 border border-gray-300 rounded-lg
                       bg-white text-gray-900 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       cursor-pointer transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {!supportsReasoningEffort && (
              <p className="mt-1 text-xs text-gray-400">
                Only available for GPT-5 models
              </p>
            )}
          </div>

          <div>
            <label htmlFor="promptSelector" className="block text-sm font-bold  text-gray-700">
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
          </div>
          <Button
            variant="secondary"
            onClick={handleCreateExperiment}
            disabled={isLoading || isSaving}
          >
            Create Experiment
          </Button>
        </div>
        
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
              className="w-full h-[400px] px-4 py-3 border border-gray-300 rounded-lg
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
              className="w-full h-[400px] px-4 py-3 border border-gray-300 rounded-lg
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
            
          </div>
          
          {/* Variables Configuration */}
        <div className="mb-6 space-y-4">
          {currentUnit && <ThreadFromUnit currentUnit={currentUnit}/>}
          
          </div>

          {/* Right: Prompt Selector Dropdown */}
          
        </div>

        

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        
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

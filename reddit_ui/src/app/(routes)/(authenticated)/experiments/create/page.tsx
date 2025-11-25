'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { ThreadFromUnit } from '@/components/thread/ThreadFromUnit';
import {
  ExperimentConfigPanel,
  ClusterUnitNavigator,
  PromptSelector,
  PromptEditor,
  ActionBar,
  StatusMessages,
} from '@/components/experiment-create';

interface PromptEntity {
  id: string;
  name: string;
  system_prompt: string;
  prompt: string;
  category?: string;
}

export default function CreateExperimentPage() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [parsedPrompt, setParsedPrompt] = useState('');
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');

  // Model and runs configuration
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-nano');
  const [runsPerUnit, setRunsPerUnit] = useState<number>(3);
  const [reasoningEffort, setReasoningEffort] = useState<string>('medium');

  // Cluster unit state
  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);

  // Loading and status state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch sample units on mount
  useEffect(() => {
    async function fetchSampleUnits() {
      if (!scraperClusterId) return;

      try {
        setIsLoadingUnits(true);
        const units = await experimentApi.getSampleUnits(authFetch, scraperClusterId);
        setClusterUnits(units);
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

  // Auto-parse prompt when cluster unit or prompt changes
  const autoParsePrompt = async () => {
    if (!rawPrompt.trim() || !selectedPromptId || clusterUnits.length === 0) return;

    try {
      setSuccess(null);
      const parsed = await experimentApi.parseRawPrompt(
        authFetch,
        clusterUnits[currentUnitIndex].id,
        rawPrompt
      );
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
      if (selectedPromptId && rawPrompt) {
        setTimeout(autoParsePrompt, 0);
      }
    }
  };

  const handleNextUnit = () => {
    if (currentUnitIndex < clusterUnits.length - 1) {
      const newIndex = currentUnitIndex + 1;
      setCurrentUnitIndex(newIndex);
      if (selectedPromptId && rawPrompt) {
        setTimeout(autoParsePrompt, 0);
      }
    }
  };

  const handleSelectUnit = (unitId: string) => {
    const unitIndex = clusterUnits.findIndex(u => u.id === unitId);
    if (unitIndex !== -1) {
      setCurrentUnitIndex(unitIndex);
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
      setParsedPrompt('');

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

    if (clusterUnits.length === 0) {
      setError('No cluster units available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const parsed = await experimentApi.parseRawPrompt(
        authFetch,
        clusterUnits[currentUnitIndex].id,
        rawPrompt
      );

      setParsedPrompt(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse prompt');
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await experimentApi.getPrompts(authFetch);
      const data = await response.json();
      setPrompts(data.prompts || data.prompt_entities || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateExperiment = async () => {
    if (!selectedPromptId) {
      return toast({
        title: "Error",
        description: "No prompt is selected!",
        variant: "destructive"
      });
    }
    if (!scraperClusterId) {
      return toast({
        title: "Error",
        description: "No scraper cluster ID is available!",
        variant: "destructive"
      });
    }

    experimentApi.createExperiment(
      authFetch,
      selectedPromptId,
      scraperClusterId,
      selectedModel,
      runsPerUnit,
      reasoningEffort
    );
    router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`);
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
      <div className="max-w-[95vw] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Create Experiment</h1>

          {/* Cluster Unit Navigation */}
          <ClusterUnitNavigator
            clusterUnits={clusterUnits}
            currentUnitIndex={currentUnitIndex}
            onPrev={handlePrevUnit}
            onNext={handleNextUnit}
            onSelect={handleSelectUnit}
            isLoading={isLoadingUnits}
          />
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Experiment Configuration</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: Model Config */}
            <ExperimentConfigPanel
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              runsPerUnit={runsPerUnit}
              onRunsChange={setRunsPerUnit}
              reasoningEffort={reasoningEffort}
              onReasoningEffortChange={setReasoningEffort}
            />

            {/* Right: Prompt Selector */}
            <PromptSelector
              prompts={prompts}
              selectedPromptId={selectedPromptId}
              onPromptSelect={handlePromptSelect}
              isLoading={isLoadingPrompts}
            />
          </div>

          {/* Action Bar */}
          <ActionBar
            onParse={handleParsePrompt}
            onSave={handleSavePrompt}
            onCreateExperiment={handleCreateExperiment}
            isParsing={isLoading}
            isSaving={isSaving}
            canParse={!!rawPrompt.trim()}
            canSave={!!rawPrompt.trim()}
            canCreate={!!selectedPromptId && !!scraperClusterId}
          />
        </div>

        {/* Status Messages */}
        <StatusMessages error={error} success={success} />

        {/* Prompt Editor */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Prompt Editor</h2>
          <PromptEditor
            rawPrompt={rawPrompt}
            onRawPromptChange={setRawPrompt}
            parsedPrompt={parsedPrompt}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
          />
        </div>

        {/* Thread Preview */}
        {currentUnit && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview: Current Cluster Unit</h2>
            <ThreadFromUnit currentUnit={currentUnit} />
          </div>
        )}

        {/* Help Text */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-medium">💡 Tip:</span> Use variables like <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">{'{conversation_thread}'}</code> and <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">{'{final_reddit_message}'}</code> in your prompt.
            They will be automatically replaced with the actual cluster unit data.
          </p>
        </div>
      </div>
    </div>
  );
}

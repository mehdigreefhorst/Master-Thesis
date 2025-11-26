'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, modelsApi } from '@/lib/api';
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
import { ModelInfo } from '@/types/model';
import { Button } from '@/components/ui';
import { PromptEntity } from '@/types/prompt';



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
  const [selectedModelInfo, setSelectedModelInfo] = useState<ModelInfo | undefined>();
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
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);

  // Save prompt modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [modalSystemPrompt, setModalSystemPrompt] = useState('');
  const [modalPrompt, setModalPrompt] = useState('');


  // Fetch sample units on mount
  useEffect(() => {
    async function fetchSampleUnits() {
      if (!scraperClusterId) return;

      try {
        setIsLoadingUnits(true);
        const models = await modelsApi.getAllModels(authFetch);
        setAvailableModels(models)
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

  // Helper function to get default prompt name (format: 21-nov 15:50)
  const getDefaultPromptName = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}-${month} ${hours}:${minutes}`;
  };

  const handleSavePrompt = () => {
    if (!rawPrompt.trim()) {
      setError('Please enter a prompt before saving');
      return;
    }

    // Open modal with current prompts
    setModalSystemPrompt(systemPrompt);
    setModalPrompt(rawPrompt);
    setPromptName(getDefaultPromptName());
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!promptName.trim()) {
      setError('Please enter a prompt name');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await experimentApi.createPrompt(
        authFetch,
        promptName,
        modalSystemPrompt,
        modalPrompt,
        'classify_cluster_units',
      );

      setSuccess('Prompt saved successfully!');

      // Refresh prompts list
      const prompts = await experimentApi.getPrompts(authFetch);
      setPrompts(prompts);

      // Close modal
      setShowSaveModal(false);
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

  const handleModelChange = async(modelId: string, modelInfo: ModelInfo) => {

    setSelectedModel(modelId);
    setSelectedModelInfo(modelInfo);
    if (!modelInfo.supports_reasoning) {
      setReasoningEffort('unavailable')
    } else if (modelInfo.supports_reasoning && reasoningEffort === 'unavailable') {
        setReasoningEffort('medium')

    }
    
  }

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
          
          <h1 className="text-xl w-80 font-semibold">Create Experiment</h1>
          <Button onClick={() => router.push(`/dashboard?scraper_cluster_id=${scraperClusterId}`)} variant="secondary" size="lg">
            ← Go Back
          </Button>

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
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Model Selector Only - 1/3 width */}
            <div>
              <ExperimentConfigPanel
                availableModels={availableModels}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                runsPerUnit={runsPerUnit}
                onRunsChange={setRunsPerUnit}
                reasoningEffort={reasoningEffort}
                onReasoningEffortChange={setReasoningEffort}
              />
            </div>

            {/* Middle: Prompt Selector + Other Dropdowns - 1/3 width */}
            <div className="flex gap-2">
              {/* Prompt Selector */}
              <div className="flex-1">
                <PromptSelector
                  prompts={prompts}
                  selectedPromptId={selectedPromptId}
                  onPromptSelect={handlePromptSelect}
                  isLoading={isLoadingPrompts}
                />
              </div>

              {/* Runs Per Unit Selector */}
              <div className="flex-1">
                <label htmlFor="runsSelector" className="block text-sm font-bold text-gray-900 mb-2">
                  Runs per Unit
                </label>
                <select
                  id="runsSelector"
                  value={runsPerUnit}
                  onChange={(e) => setRunsPerUnit(Number(e.target.value))}
                  className="w-full h-12 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 cursor-pointer transition-all"
                >
                  {[1, 2, 3, 4, 5].map((runs) => (
                    <option key={runs} value={runs}>
                      {runs}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reasoning Effort Selector */}
              <div className="flex-1">
                <label htmlFor="reasoningSelector" className="block text-sm font-bold text-gray-900 mb-2">
                  Reasoning Effort
                </label>
                <select
                  id="reasoningSelector"
                  value={reasoningEffort}
                  onChange={(e) => setReasoningEffort(e.target.value)}
                  disabled={!selectedModelInfo?.supports_reasoning}
                  className="w-full h-12 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!selectedModelInfo?.supports_reasoning ? (
                    <option value="unavailable">Unavailable</option>
                  ) : (
                    ['low', 'medium', 'high'].map((effort) => (
                      <option key={effort} value={effort}>
                        {effort.charAt(0).toUpperCase() + effort.slice(1)}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Right: Action Bar - 1/3 width */}
            <div>
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
          </div>

          
        </div>

        {/* Status Messages */}
        <StatusMessages error={error} success={success} />

        {/* Prompt Editor */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Prompt Editor</h2>
          <PromptEditor
            currentUnit={currentUnit}
            rawPrompt={rawPrompt}
            onRawPromptChange={setRawPrompt}
            parsedPrompt={parsedPrompt}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
          />
        </div>

        

        {/* Help Text */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-medium">💡 Tip:</span> Use variables like <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">{'{conversation_thread}'}</code> and <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">{'{final_reddit_message}'}</code> in your prompt.
            They will be automatically replaced with the actual cluster unit data.
          </p>
        </div>
      </div>

      {/* Save Prompt Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">Save Prompt</h2>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Prompt Name Input */}
              <div>
                <label htmlFor="promptName" className="block text-sm font-bold text-gray-900 mb-2">
                  Prompt Name
                </label>
                <input
                  id="promptName"
                  type="text"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-all"
                  placeholder="Enter prompt name"
                />
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* System Prompt */}
              <div>
                <label htmlFor="modalSystemPrompt" className="block text-sm font-bold text-gray-900 mb-2">
                  System Prompt
                </label>
                <textarea
                  id="modalSystemPrompt"
                  value={modalSystemPrompt}
                  onChange={(e) => {
                    setModalSystemPrompt(e.target.value);
                    setSystemPrompt(e.target.value);
                  }}
                  className="w-full h-32 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-all font-mono text-sm resize-none"
                  placeholder="Enter system prompt"
                />
              </div>

              {/* Main Prompt */}
              <div>
                <label htmlFor="modalPrompt" className="block text-sm font-bold text-gray-900 mb-2">
                  Prompt
                </label>
                <textarea
                  id="modalPrompt"
                  value={modalPrompt}
                  onChange={(e) => {
                    setModalPrompt(e.target.value);
                    setRawPrompt(e.target.value);
                  }}
                  className="w-full h-96 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-all font-mono text-sm resize-none"
                  placeholder="Enter your prompt"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <Button
                onClick={() => setShowSaveModal(false)}
                variant="secondary"
                size="lg"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSave}
                variant="primary"
                size="lg"
                disabled={isSaving || !promptName.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Prompt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

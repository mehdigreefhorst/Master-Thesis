'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, labelTemplateApi, modelsApi } from '@/lib/api';
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
import { TestPredictionModal } from '@/components/experiments/TestPredictionModal';
import { ModelInfo, ReasoningEffort, ReasoningEffortType } from '@/types/model';
import { Button, InfoTooltip, Modal } from '@/components/ui';
import { PromptEntity } from '@/types/prompt';
import { LabelTemplateSelector } from '@/components/experiment-create/LabelTemplateSelector';
import { LabelTemplateEntity } from '@/types/label-template';



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

  // LabelTemplate state

  const [selectedLabelTemplateId, setSelectedLabelTemplateId] = useState<string>("")
  

  // Model and runs configuration
  const [selectedModelInfo, setSelectedModelInfo] = useState<ModelInfo | undefined>();
  const [runsPerUnit, setRunsPerUnit] = useState<number>(3);
  const [thresholdRunsPerUnits, setThresholdRunsPerUnit] = useState<number>(1);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffortType>('medium');

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

  // Test prediction modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [createdExperimentId, setCreatedExperimentId] = useState<string | null>(null);


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
    if (!rawPrompt.trim() || !selectedPromptId || !selectedLabelTemplateId || clusterUnits.length === 0) return;

    try {
      setSuccess(null);
      const parsed = await experimentApi.parseRawPrompt(
        authFetch,
        clusterUnits[currentUnitIndex].id,
        selectedLabelTemplateId,
        rawPrompt
      );

      setParsedPrompt(parsed);
    } catch (err) {
      toast({
        title: "Warning",
        description: "Auto-parse failed. You can try parsing manually.",
        variant: "destructive",
      });
      console.error('Auto-parse failed:', err);
    }
  };

  // Auto-parse when cluster unit, prompt, or label template changes
  useEffect(() => {
    if (rawPrompt.trim() && selectedPromptId && selectedLabelTemplateId && clusterUnits.length > 0) {
      autoParsePrompt();
    }
  }, [currentUnitIndex, selectedPromptId, selectedLabelTemplateId]);

  // Removed auto-run test - user will click "Run Test Sample" button manually

  // Handle cluster unit navigation
  const handlePrevUnit = () => {
    if (currentUnitIndex > 0) {
      setCurrentUnitIndex(currentUnitIndex - 1);
    }
  };

  const handleNextUnit = () => {
    if (currentUnitIndex < clusterUnits.length - 1) {
      setCurrentUnitIndex(currentUnitIndex + 1);
    }
  };

  const handleSelectUnit = (unitId: string) => {
    const unitIndex = clusterUnits.findIndex(u => u.id === unitId);
    if (unitIndex !== -1) {
      setCurrentUnitIndex(unitIndex);
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
        selectedLabelTemplateId,
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

      // Create the prompt and get the returned prompt entity
      const createdPrompt = await experimentApi.createPrompt(
        authFetch,
        promptName,
        modalSystemPrompt,
        modalPrompt,
        'classify_cluster_units',
      );

      // Show success toast
      toast({
        title: "Success",
        description: "Prompt saved successfully!",
        variant: "success",
      });

      // Refresh prompts list
      const updatedPrompts = await experimentApi.getPrompts(authFetch);
      setPrompts(updatedPrompts);

      // Select the newly created prompt
      setSelectedPromptId(createdPrompt.id);
      setSystemPrompt(createdPrompt.system_prompt || '');
      setRawPrompt(createdPrompt.prompt || '');

      // Close modal
      setShowSaveModal(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to save prompt',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedToFullExperiment = () => {
    setShowTestModal(false);
    router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`);
  };

  const handleTestCloseExperiment = () => {
    setShowTestModal(false);
    if (!createdExperimentId) {
      return 
    }
    experimentApi.deleteExperiment(authFetch, createdExperimentId)

  }

  const handleCreateExperiment = async () => {
    if (!selectedPromptId) {
      return toast({
        title: "Error",
        description: "No prompt is selected!",
        variant: "destructive"
      });
    }
    if (!scraperClusterId || !selectedModelInfo) {
      return toast({
        title: "Error",
        description: "No scraper cluster ID is available!",
        variant: "destructive"
      });
    }

    if (!selectedLabelTemplateId) {
        return toast({
          title: "Error",
          description: "No label template is selected!",
          variant: "destructive"
      });
    }

    try {
      console.log("selectedModel = ", selectedModelInfo.id)
      const response = await experimentApi.createExperiment(
        authFetch,
        selectedPromptId,
        scraperClusterId,
        selectedModelInfo?.id,
        runsPerUnit,
        thresholdRunsPerUnits,
        selectedLabelTemplateId,
        reasoningEffort
      );

      // Extract experiment ID from response
      // Adjust based on actual API response format
      const experimentId = response?.experiment_id || response?.id;
      if (experimentId) {
        setCreatedExperimentId(experimentId);
        setShowTestModal(true);
      } else {
        throw new Error("No experiment ID returned");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create experiment',
        variant: "destructive"
      });
    }
  };

  const handleModelChange = async(modelInfo: ModelInfo) => {

    setSelectedModelInfo(modelInfo);
    console.log("modelInfo.id = ", modelInfo.id)
    if (!modelInfo.supports_reasoning) {
      setReasoningEffort('none')
    } else if (modelInfo.supports_reasoning && reasoningEffort === 'none') {
        setReasoningEffort('medium')

    }

  }

  const handleRunsPerUnitChange = (newRunsPerUnit: number) => {
    setRunsPerUnit(newRunsPerUnit);
    // Reset threshold if it exceeds new runs per unit
    if (thresholdRunsPerUnits > newRunsPerUnit) {
      setThresholdRunsPerUnit(newRunsPerUnit);
    }
  };

  const handleThresholdChange = (newThreshold: number) => {
    // Only allow threshold if it doesn't exceed runs per unit
    if (newThreshold <= runsPerUnit) {
      setThresholdRunsPerUnit(newThreshold);
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
                selectedModel={selectedModelInfo}
                onModelChange={handleModelChange}
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
              <div className="flex-1">
                <LabelTemplateSelector
                  selectedLabelTemplateId={selectedLabelTemplateId}
                  setSelectedLabelTemplateId={setSelectedLabelTemplateId}
                />
              </div>

              {/* Runs Per Unit Selector */}
              <div className="flex-1">
                <label htmlFor="runsSelector" className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  Runs per Unit
                  <InfoTooltip text="Number of times the AI model will analyze each cluster unit. Multiple runs help ensure consistency and reliability in the results." />
                </label>
                <select
                  id="runsSelector"
                  value={runsPerUnit}
                  onChange={(e) => handleRunsPerUnitChange(Number(e.target.value))}
                  className="w-full h-12 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 cursor-pointer transition-all"
                >
                  {[1, 2, 3, 4, 5].map((runs) => (
                    <option key={runs} value={runs}>
                      {runs}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold Selector */}
              <div className="flex-1">
                <label htmlFor="thresholdSelector" className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  Threshold
                  <InfoTooltip text="Minimum number of runs that must agree on a label for it to be considered valid. For example, with 3 runs and threshold 2, at least 2 runs must agree." />
                </label>
                <select
                  id="thresholdSelector"
                  value={thresholdRunsPerUnits}
                  onChange={(e) => handleThresholdChange(Number(e.target.value))}
                  className="w-full h-12 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 cursor-pointer transition-all"
                >
                  {[1, 2, 3, 4, 5]
                    .filter(threshold => threshold <= runsPerUnit)
                    .map((threshold) => (
                      <option key={threshold} value={threshold}>
                        {threshold}
                      </option>
                    ))}
                </select>
              </div>

              {/* Reasoning Effort Selector */}
              <div className="flex-1">
                <label htmlFor="reasoningSelector" className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  Reasoning Effort
                  <InfoTooltip text="Controls how deeply the AI model thinks through its analysis. Higher effort provides more thorough reasoning but takes longer. Only available for models that support extended thinking." />
                </label>
                <select
                  id="reasoningSelector"
                  value={reasoningEffort}
                  onChange={(e) => setReasoningEffort(e.target.value as ReasoningEffortType)}
                  disabled={!selectedModelInfo?.supports_reasoning}
                  className="w-full h-12 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!selectedModelInfo?.supports_reasoning ? (
                    <option value="none">Unavailable</option>
                  ) : (
                    [...ReasoningEffort].map((effort) => (
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
                canParse={!!rawPrompt.trim() && !!selectedLabelTemplateId}
                canSave={!!rawPrompt.trim() && !!selectedLabelTemplateId}
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

      {/* Test Prediction Modal */}
      {createdExperimentId && (
        <TestPredictionModal
          isOpen={showTestModal}
          onClose={handleTestCloseExperiment}
          experimentId={createdExperimentId}
          autoRun={false}
          onProceed={handleProceedToFullExperiment}
        />
      )}

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

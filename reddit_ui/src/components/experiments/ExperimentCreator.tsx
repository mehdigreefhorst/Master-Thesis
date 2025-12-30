'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, modelsApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import {
  ExperimentConfigPanel,
  ClusterUnitNavigator,
  PromptSelector,
  PromptEditor,
  ActionBar,
  StatusMessages,
} from '@/components/experiment-create';
import { TestPredictionModal } from '@/components/experiments/TestPredictionModal';
import { PromptSaveModal } from '@/components/experiments/PromptSaveModal';
import { ModelInfo, ReasoningEffort, ReasoningEffortType } from '@/types/model';
import { Button, InfoTooltip, BaseSelector, BaseSelectorItem } from '@/components/ui';
import { PromptEntity } from '@/types/prompt';
import { LabelTemplateSelector } from '@/components/experiment-create/LabelTemplateSelector';
import { InputEntitySelector } from '../experiment-create/InputEntitySelector';
import { InputEntityDisplay } from '@/types/input-entity';

export interface ExperimentCreatorProps {
  scraperClusterId: string;
  experimentType: 'classify' | 'enrich';
  onBack?: () => void;
  promptCategory: 'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes';
  title?: string;
  helpText?: string;
}

// Type for dropdown items
interface SelectorItem extends BaseSelectorItem {
  id: string;
  label: string;
  value: number | string;
}

export const ExperimentCreator: React.FC<ExperimentCreatorProps> = ({
  scraperClusterId,
  experimentType,
  onBack,
  promptCategory,
  title = 'Create Experiment',
  helpText,
}) => {
  const authFetch = useAuthFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  console.log(searchParams)

  // Get query params for input entity (old format)
  const sampleIdFromUrl = searchParams.get('sample_id');
  const filteringIdFromUrl = searchParams.get('filtering_id');
  const clusterIdFromUrl = searchParams.get('cluster_id');
  const sampleOnly = searchParams.get('sample_only') !== 'false';

  // Get query params for experiment configuration (URL-decoded)
  const modelIdParam = searchParams.get('model_id') ? decodeURIComponent(searchParams.get('model_id')!) : null;
  console.log("searchParams= ", searchParams)
  console.log("modelIdParam (decoded)= ", modelIdParam)
  const promptIdParam = searchParams.get('prompt_id');
  const labelTemplateIdParam = searchParams.get('label_template_id');
  const inputTypeParam = searchParams.get('input_type') as 'sample' | 'filtering' | 'cluster' | null;
  const inputIdParam = searchParams.get('input_id');
  const runsPerUnitParam = searchParams.get('runs_per_unit');
  const thresholdParam = searchParams.get('threshold');
  const reasoningEffortParam = searchParams.get('reasoning_effort') as ReasoningEffortType | null;

  // Map unified input_type + input_id to specific params for InputEntitySelector
  // This supports both old format (sample_id/filtering_id/cluster_id) and new format (input_type + input_id)
  const sampleId = inputTypeParam === 'sample' && inputIdParam ? inputIdParam : sampleIdFromUrl;
  const filteringId = inputTypeParam === 'filtering' && inputIdParam ? inputIdParam : filteringIdFromUrl;
  const clusterId = inputTypeParam === 'cluster' && inputIdParam ? inputIdParam : clusterIdFromUrl;

  // Input entity state
  const [selectedInputEntity, setSelectedInputEntity] = useState<InputEntityDisplay | undefined>();
  const [inputEntityType, setInputEntityType] = useState<'sample' | 'filtering' | 'cluster'>('sample');

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [parsedPrompt, setParsedPrompt] = useState('');
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');

  // LabelTemplate state
  const [selectedLabelTemplateId, setSelectedLabelTemplateId] = useState<string>('');

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

  // Test prediction modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [createdExperimentId, setCreatedExperimentId] = useState<string | null>(null);

  // Track if we've loaded initial params from URL
  const hasLoadedInitialParams = useRef(false);

  // Selector items
  const runsPerUnitItems: SelectorItem[] = [1, 2, 3, 4, 5].map((n) => ({
    id: String(n),
    label: String(n),
    value: n,
  }));

  const thresholdItems: SelectorItem[] = [1, 2, 3, 4, 5]
    .filter((n) => n <= runsPerUnit)
    .map((n) => ({
      id: String(n),
      label: String(n),
      value: n,
    }));

  const reasoningEffortItems: SelectorItem[] = [...ReasoningEffort].map((effort) => ({
    id: effort,
    label: effort.charAt(0).toUpperCase() + effort.slice(1),
    value: effort,
  }));

  // Get selected items for selectors
  const selectedRunsItem = runsPerUnitItems.find((item) => item.value === runsPerUnit) || null;
  const selectedThresholdItem = thresholdItems.find((item) => item.value === thresholdRunsPerUnits) || null;
  const selectedReasoningEffortItem = reasoningEffortItems.find((item) => item.value === reasoningEffort) || null;

  // Helper function to update URL query parameters
  const updateURLParams = (params: Record<string, string | number | undefined | null>) => {
    const currentParams = new URLSearchParams(window.location.search);

    // Update or remove parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        currentParams.set(key, String(value));
      } else {
        currentParams.delete(key);
      }
    });

    // Update URL without page reload
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Fetch sample units on mount
  useEffect(() => {
    async function fetchSampleUnits() {
      if (!scraperClusterId) return;

      try {
        setIsLoadingUnits(true);
        const models = await modelsApi.getAllModels(authFetch);
        setAvailableModels(models);
        const units = await experimentApi.getSampleUnits(authFetch, scraperClusterId, "classify_cluster_units");
        setClusterUnits(units);
        toast({
          title: "Success",
          description: "Models and sample units loaded successfully",
          variant: "success"
        });
      } catch (err) {
        console.error('Failed to fetch sample units:', err);
        const errorMsg = 'Failed to load cluster units';
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
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
        toast({
          title: "Success",
          description: "Prompts loaded successfully",
          variant: "success"
        });
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to fetch prompts',
          variant: "destructive"
        });
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    fetchPrompts();
  }, [authFetch]);

  // Load URL query parameters when data is ready (only once)
  useEffect(() => {
    // Don't load if we've already loaded initial params
    if (hasLoadedInitialParams.current) return;

    // Wait for data to be loaded
    if (availableModels.length === 0 || prompts.length === 0) return;

    console.log('Loading initial params from URL...');
    console.log('Available models:', availableModels.map(m => m.id));
    console.log('Available prompts:', prompts.map(p => p.id));

    // Load model from URL (decoded)
    if (modelIdParam) {
      const model = availableModels.find((m) => m.id === modelIdParam);
      if (model) {
        console.log('Found matching model:', model.id);
        setSelectedModelInfo(model);
      } else {
        console.warn('No matching model found for:', modelIdParam);
      }
    }

    // Load prompt from URL
    if (promptIdParam) {
      const prompt = prompts.find((p) => p.id === promptIdParam);
      if (prompt) {
        console.log('Found matching prompt:', prompt.id);
        handlePromptSelect(promptIdParam);
      } else {
        console.warn('No matching prompt found for:', promptIdParam);
      }
    }

    // Load label template from URL
    if (labelTemplateIdParam) {
      console.log('Setting label template:', labelTemplateIdParam);
      setSelectedLabelTemplateId(labelTemplateIdParam);
    }

    // Load input type from URL
    if (inputTypeParam) {
      console.log('Setting input type:', inputTypeParam);
      setInputEntityType(inputTypeParam);
    }

    // Load runs per unit from URL
    if (runsPerUnitParam) {
      const runs = parseInt(runsPerUnitParam, 10);
      if (!isNaN(runs) && runs >= 1 && runs <= 5) {
        console.log('Setting runs per unit:', runs);
        setRunsPerUnit(runs);
      }
    }

    // Load threshold from URL
    if (thresholdParam) {
      const threshold = parseInt(thresholdParam, 10);
      if (!isNaN(threshold) && threshold >= 1 && threshold <= 5) {
        console.log('Setting threshold:', threshold);
        setThresholdRunsPerUnit(threshold);
      }
    }

    // Load reasoning effort from URL
    if (reasoningEffortParam) {
      console.log('Setting reasoning effort:', reasoningEffortParam);
      setReasoningEffort(reasoningEffortParam);
    }

    // Mark that we've loaded initial params
    hasLoadedInitialParams.current = true;
    console.log('Finished loading initial params from URL');
  }, [availableModels, prompts]);

  // Sync URL query parameters when state changes
  // IMPORTANT: Only sync after we've loaded initial params to avoid wiping them out
  useEffect(() => {
    // Don't sync until we've loaded initial params from URL
    if (!hasLoadedInitialParams.current) {
      console.log('Skipping URL sync - waiting for initial params to load');
      return;
    }

    console.log('Syncing state to URL params');
    updateURLParams({
      model_id: selectedModelInfo?.id,
      prompt_id: selectedPromptId,
      label_template_id: selectedLabelTemplateId,
      input_type: inputEntityType,
      input_id: selectedInputEntity?.id,
      runs_per_unit: runsPerUnit,
      threshold: thresholdRunsPerUnits,
      reasoning_effort: reasoningEffort,
    });
  }, [
    selectedModelInfo,
    selectedPromptId,
    selectedLabelTemplateId,
    inputEntityType,
    selectedInputEntity,
    runsPerUnit,
    thresholdRunsPerUnits,
    reasoningEffort,
  ]);

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
        title: 'Warning',
        description: 'Auto-parse failed. You can try parsing manually.',
        variant: 'destructive',
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
    const unitIndex = clusterUnits.findIndex((u) => u.id === unitId);
    if (unitIndex !== -1) {
      setCurrentUnitIndex(unitIndex);
    }
  };

  // Handle prompt selection from dropdown
  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    const selectedPrompt = prompts.find((p) => p.id === promptId);
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
      toast({
        title: "Success",
        description: "Prompt parsed successfully",
        variant: "success"
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse prompt';
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrompt = () => {
    if (!rawPrompt.trim()) {
      setError('Please enter a prompt before saving');
      return;
    }

    setShowSaveModal(true);
  };

  const handleConfirmSave = async (
    name: string,
    modalSystemPrompt: string,
    modalPrompt: string,
    category: 'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes'
  ) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Create the prompt and get the returned prompt entity
      const createdPrompt = await experimentApi.createPrompt(authFetch, name, modalSystemPrompt, modalPrompt, category);

      // Show success toast
      toast({
        title: 'Success',
        description: 'Prompt saved successfully!',
        variant: 'success',
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
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedToFullExperiment = () => {
    setShowTestModal(false);
    router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`);
  };

  const handleTestCloseExperiment = async () => {
    setShowTestModal(false);
    if (!createdExperimentId) {
      return;
    }
    try {
      await experimentApi.deleteExperiment(authFetch, createdExperimentId);
      toast({
        title: "Success",
        description: "Experiment deleted successfully",
        variant: "success"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete experiment',
        variant: "destructive"
      });
    }
  };

  const handleCreateExperiment = async () => {
    if (!selectedPromptId) {
      return toast({
        title: 'Error',
        description: 'No prompt is selected!',
        variant: 'destructive',
      });
    }
    if (!scraperClusterId) {
      return toast({
        title: 'Error',
        description: 'No scraper cluster ID is available!',
        variant: 'destructive',
      });
    }
    if (!selectedModelInfo) {
      return toast({
        title: 'Error',
        description: 'No model selected!',
        variant: 'destructive',
      });
    }

    if (!selectedLabelTemplateId) {
      console.log("selectedLabelTemplateId. = ", selectedLabelTemplateId)
      return toast({
        title: 'Error',
        description: 'No label template is selected!',
        variant: 'destructive',
      });
    }

    if (!selectedInputEntity) {
      return toast({
        title: 'Error',
        description: 'No Input Source is selected!',
        variant: 'destructive',
      });
    }

    try {
      console.log('selectedModel = ', selectedModelInfo.id);
      const response = await experimentApi.createExperiment(
        authFetch,
        selectedPromptId,
        scraperClusterId,
        selectedModelInfo?.id,
        runsPerUnit,
        thresholdRunsPerUnits,
        selectedLabelTemplateId,
        reasoningEffort,
        selectedInputEntity.id,
        inputEntityType
      );

      // Extract experiment ID from response
      const experimentId = response?.experiment_id || response?.id;
      if (experimentId) {
        toast({
          title: "Success",
          description: "Experiment created successfully",
          variant: "success"
        });
        setCreatedExperimentId(experimentId);
        setShowTestModal(true);
      } else {
        throw new Error('No experiment ID returned');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create experiment',
        variant: 'destructive',
      });
    }
  };

  const handleModelChange = async (modelInfo: ModelInfo) => {
    setSelectedModelInfo(modelInfo);
    console.log('modelInfo.id = ', modelInfo.id);
    if (!modelInfo.supports_reasoning) {
      setReasoningEffort('none');
    } else if (modelInfo.supports_reasoning && reasoningEffort === 'none') {
      setReasoningEffort('medium');
    }
  };

  const handleRunsPerUnitChange = (item: SelectorItem) => {
    const newRunsPerUnit = item.value as number;
    setRunsPerUnit(newRunsPerUnit);
    // Reset threshold if it exceeds new runs per unit
    if (thresholdRunsPerUnits > newRunsPerUnit) {
      setThresholdRunsPerUnit(newRunsPerUnit);
    }
  };

  const handleThresholdChange = (item: SelectorItem) => {
    const newThreshold = item.value as number;
    // Only allow threshold if it doesn't exceed runs per unit
    if (newThreshold <= runsPerUnit) {
      setThresholdRunsPerUnit(newThreshold);
    }
  };

  const handleReasoningEffortChange = (item: SelectorItem) => {
    setReasoningEffort(item.value as ReasoningEffortType);
  };

  const handleInputEntityChange = (entity: InputEntityDisplay, type: 'sample' | 'filtering' | 'cluster') => {
    setSelectedInputEntity(entity);
    setInputEntityType(type);
    console.log(`Selected ${type}:`, entity);
    // TODO: Fetch cluster units for the selected entity
    // This would require updating the getSampleUnits API to accept entity type and ID
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
          <h1 className="text-xl w-80 font-semibold">{title}</h1>
          {onBack && (
            <Button onClick={onBack} variant="secondary" size="lg">
              ← Go Back
            </Button>
          )}
          <InputEntitySelector
            scraperClusterId={scraperClusterId}
            selectedEntity={selectedInputEntity}
            onEntityChange={handleInputEntityChange}
            sampleId={sampleId || undefined}
            filteringId={filteringId || undefined}
            clusterId={clusterId || undefined}
            sampleOnly={sampleOnly}
          />

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
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-gray-900">Runs per Unit</label>
                  <InfoTooltip text="Number of times the AI model will analyze each cluster unit. Multiple runs help ensure consistency and reliability in the results." />
                </div>
                <BaseSelector
                  items={runsPerUnitItems}
                  selectedItem={selectedRunsItem}
                  onSelect={handleRunsPerUnitChange}
                  onClear={() => {}}
                  placeholder="Select runs"
                />
              </div>

              {/* Threshold Selector */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-gray-900">Threshold</label>
                  <InfoTooltip text="Minimum number of runs that must agree on a label for it to be considered valid. For example, with 3 runs and threshold 2, at least 2 runs must agree." />
                </div>
                <BaseSelector
                  items={thresholdItems}
                  selectedItem={selectedThresholdItem}
                  onSelect={handleThresholdChange}
                  onClear={() => {}}
                  placeholder="Select threshold"
                />
              </div>

              {/* Reasoning Effort Selector */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-gray-900">Reasoning Effort</label>
                  <InfoTooltip text="Controls how deeply the AI model thinks through its analysis. Higher effort provides more thorough reasoning but takes longer. Only available for models that support extended thinking." />
                </div>
                <BaseSelector
                  items={selectedModelInfo?.supports_reasoning ? reasoningEffortItems : [{ id: 'none', label: 'Unavailable', value: 'none' }]}
                  selectedItem={selectedReasoningEffortItem}
                  onSelect={handleReasoningEffortChange}
                  onClear={() => {}}
                  placeholder="Select reasoning effort"
                  disabled={!selectedModelInfo?.supports_reasoning}
                />
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
        {helpText && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">{helpText}</p>
          </div>
        )}

        {!helpText && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-medium">💡 Tip:</span> Use variables like{' '}
              <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">{'{conversation_thread}'}</code> and{' '}
              <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">{'{final_reddit_message}'}</code> in your
              prompt. They will be automatically replaced with the actual cluster unit data.
            </p>
          </div>
        )}
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
      <PromptSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleConfirmSave}
        initialSystemPrompt={systemPrompt}
        initialPrompt={rawPrompt}
        initialCategory={promptCategory}
        isSaving={isSaving}
      />
    </div>
  );
};

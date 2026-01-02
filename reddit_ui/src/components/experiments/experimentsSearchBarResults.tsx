import { useEffect, useState, useRef, useMemo } from "react";
import { ExperimentCard, ExperimentData } from "./ExperimentCard"
import { useRouter } from "next/navigation";
import { experimentApi } from "@/lib/api";
import { useAuthFetch } from "@/utils/fetch";
import { BaseSelectorItem, Button, Input, ThresholdSlider } from "../ui";
import { PageHeader } from "../layout";
import { TestPredictionModal } from "./TestPredictionModal";
import { useToast } from "@/components/ui/use-toast";
import { ExperimentEntity, FilterExperimentType, GetExperimentsResponse, PromptCategory } from "@/types/experiment";
import { SimpleSelector } from "../common/SimpleSelector";
import { LabelTemplateSelector } from "../common/LabelTemplateSelector";
import { LabelTemplateEntity } from "@/types/label-template";


interface ExperimentsSearchBarResultsProps {
  scraperClusterId?: string | null;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  canCreateExperiments: boolean;
  defaultFilterExperimentType?: FilterExperimentType | null;
  basePath?: string;
}

export const ExperimentsSearchBarResults : React.FC<ExperimentsSearchBarResultsProps> = ({
  scraperClusterId,
  isLoading,
  setIsLoading,
  canCreateExperiments,
  defaultFilterExperimentType = null,
  basePath = "/experiments"
}) => {
  const [currentLabelTemplateEntity, setCurrentLabelTemplateEntity] = useState<LabelTemplateEntity | null>(null);
  const [filterModel, setFilterModel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [globalThreshold, setGlobalThreshold] = useState<number | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(0.5);
  const [showThresholdSlider, setShowThresholdSlider] = useState(false);
  const [filterExperimentType, setFilterExperimentType] = useState<PromptCategory | null>(defaultFilterExperimentType)

  // Test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testExperimentId, setTestExperimentId] = useState<string | null>(null);

  const router = useRouter();
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const thresholdDropdownRef = useRef<HTMLDivElement>(null);
  const experimentsRef = useRef<ExperimentData[]>([]);

  const uniqueLabelTemplateIds = useMemo(() =>
    Array.from(new Set(experiments.map(p => p.labelTemplateId))),
    [experiments]
  );

  const uniqueModels = useMemo(() =>
    Array.from(new Set(experiments.map(p => p.model_id))),
    [experiments]
  );
  const filteredExperiments = experiments.filter(experiment => {
    const matchesSearch = experiment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          experiment.model_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterModel === 'all' || experiment.model_id === filterModel;
    const matchesLabelTemplateId = (currentLabelTemplateEntity === null || experiment.labelTemplateId === currentLabelTemplateEntity.id);
    const matchesFilterExperimentType = (filterExperimentType === null || experiment.experimentType === filterExperimentType);
    return matchesSearch && matchesFilter && matchesLabelTemplateId && matchesFilterExperimentType;
  });

  const handleNewExperiment = () => {
    if (scraperClusterId) {
      router.push(`${basePath}/create?scraper_cluster_id=${scraperClusterId}`);
    }
  };

  const handleView = (experiment: ExperimentData) => {
      if (scraperClusterId) {
        router.push(`/viewer/sample?unit_index=0&scraper_cluster_id=${scraperClusterId}&experiment_id=${experiment.id}&label_template_ids=${experiment.labelTemplateId}&experiment_type=${experiment.experimentType}`);
      }
    };

    const handleClone = (experiment: ExperimentData) => {
      if (!scraperClusterId) return;

      // Build query parameters from the experiment
      const queryParams = new URLSearchParams({
        scraper_cluster_id: scraperClusterId,
      });

      // Add optional parameters if they exist
      if (experiment.model_id) queryParams.set('model_id', experiment.model_id);
      if (experiment.prompt_id) queryParams.set('prompt_id', experiment.prompt_id);
      if (experiment.input_type) queryParams.set('input_type', experiment.input_type);
      if (experiment.input_id) queryParams.set('input_id', experiment.input_id);
      if (experiment.labelTemplateId) queryParams.set('label_template_id', experiment.labelTemplateId);
      if (experiment.runsPerUnit) queryParams.set('runs_per_unit', String(experiment.runsPerUnit));
      if (experiment.thresholdRunsTrue) queryParams.set('threshold', String(experiment.thresholdRunsTrue));
      if (experiment.reasoningEffort) queryParams.set('reasoning_effort', experiment.reasoningEffort);

      // Navigate to create page with query parameters
      router.push(`${basePath}/create?${queryParams.toString()}`);
    };

    const handleFilterSelect = (experiment: ExperimentData) => {
      router.push(`/filtering?scraper_cluster_id=${scraperClusterId}&experiment_id=${experiment.id}&label_template_id=${experiment.id}`)
    }

    const handleTest = (experiment: ExperimentData) => {
      setTestExperimentId(experiment.id);
      setShowTestModal(true);
    };
  
    const handleExperimentContinue = async (experiment: ExperimentData) => {
      // Optimistically update the experiment status to "ongoing"
      setExperiments(prevExperiments =>
        prevExperiments.map(exp =>
          exp.id === experiment.id
            ? { ...exp, status: 'ongoing' }
            : exp
        )
      );

      try {
        await experimentApi.continueExperiment(authFetch, experiment.id);
        toast({
          title: "Success",
          description: "Experiment resumed successfully",
          variant: "success"
        });
      } catch (err) {
        console.error('Failed to continue experiment:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to continue experiment';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        // Revert the optimistic update on error
        setExperiments(prevExperiments =>
          prevExperiments.map(exp =>
            exp.id === experiment.id
              ? { ...exp, status: 'paused' }
              : exp
          )
        );
      }
    }

    const handleThresholdUpdate = async (experiment_id: string) => {
      if (!scraperClusterId) return;

      try {
        // Fetch only the updated experiment
        const experiments = await experimentApi.getExperiments(authFetch, scraperClusterId, [experiment_id], globalThreshold);
        const updatedExperiments = experiments.map(transformExperimentData);

        if (updatedExperiments.length > 0) {
          // Update the experiments state while maintaining position and preserving name
          setExperiments(prevExperiments => {
            return prevExperiments.map(exp =>
              exp.id === experiment_id ? { ...updatedExperiments[0], name: exp.name } : exp
            );
          });
        }
      } catch (err) {
        console.error('Failed to refresh experiment after threshold update:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to refresh experiment after threshold update',
          variant: "destructive"
        });
      }
    }

    // Transform backend experiment data to frontend format
  const transformExperimentData = (exp: GetExperimentsResponse): ExperimentData => {
    // Transform prediction_metrics to match frontend PredictionMetric interface
    const predictionMetrics = (exp.prediction_metrics || []).map((pm: any) => ({
      labelName: pm.prediction_category_name,
      prevalence: pm.prevalence, // Keep as Record<string, number> (e.g., {"True": 0.6})
      prevalenceCount: pm.prevalence_count, // Keep as Record<string, number> (e.g., {"True": 150})
      totalSamples: pm.total_samples,
      accuracy: pm.accuracy * 100, // Convert to percentage
      certaintyDistribution: pm.prevelance_distribution,
      confusionMatrix: {
        tp: pm.confusion_matrix?.tp || 0,
        fp: pm.confusion_matrix?.fp || 0,
        fn: pm.confusion_matrix?.fn || 0,
        tn: pm.confusion_matrix?.tn || 0
      }
    }));

    // Transform combined labels prediction metrics (same structure as regular metrics)
    const combinedLabelsPredictionMetrics = exp.combined_labels_prediction_metrics
      ? exp.combined_labels_prediction_metrics.map((pm: any) => ({
          labelName: pm.prediction_category_name,
          prevalence: pm.prevalence,
          prevalenceCount: pm.prevalence_count,
          totalSamples: pm.total_samples,
          accuracy: pm.accuracy * 100,
          certaintyDistribution: pm.prevelance_distribution,
          confusionMatrix: {
            tp: pm.confusion_matrix?.tp || 0,
            fp: pm.confusion_matrix?.fp || 0,
            fn: pm.confusion_matrix?.fn || 0,
            tn: pm.confusion_matrix?.tn || 0
          }
        }))
      : undefined;

    // Transform token statistics if available
    const tokenStatistics = exp.token_statistics ? {
      total_successful_predictions: exp.token_statistics.total_successful_predictions || 0,
      total_failed_attempts: exp.token_statistics.total_failed_attempts || 0,
      total_tokens_used: {
        prompt_tokens: exp.token_statistics.total_tokens_used?.prompt_tokens || 0,
        completion_tokens: exp.token_statistics.total_tokens_used?.completion_tokens || 0,
        total_tokens: exp.token_statistics.total_tokens_used?.total_tokens || 0,
        reasoning_tokens: exp.token_statistics.total_tokens_used?.internal_reasoning_tokens || 0,
      },
      tokens_wasted_on_failures: {
        prompt_tokens: exp.token_statistics.tokens_wasted_on_failures?.prompt_tokens || 0,
        completion_tokens: exp.token_statistics.tokens_wasted_on_failures?.completion_tokens || 0,
        total_tokens: exp.token_statistics.tokens_wasted_on_failures?.total_tokens || 0,
      },
      tokens_from_retries: {
        prompt_tokens: exp.token_statistics.tokens_from_retries?.prompt_tokens || 0,
        completion_tokens: exp.token_statistics.tokens_from_retries?.completion_tokens || 0,
        total_tokens: exp.token_statistics.tokens_from_retries?.total_tokens || 0,
      },
    } : undefined;

    return {
      id: exp.id,
      name: exp.name,
      model_id: exp.model,
      input_type: exp.input.input_type,
      input_id: exp.input.input_id,
      prompt_id: exp.prompt_id,
      created: new Date(exp.created).toLocaleDateString(),
      totalSamples: exp.total_samples,
      overallAccuracy: (exp.overall_accuracy || 0 ) * 100, // Convert to percentage
      overallKappa: (exp.overall_kappa || 0) * 100, // Convert to percentage
      predictionMetrics: predictionMetrics,
      combinedLabelsAccuracy: (exp.combined_labels_accuracy || 0) * 100,
      combinedLabelsKappa: (exp.combined_labels_kappa || 0 ) * 100,
      combinedLabelsPredictionMetrics: combinedLabelsPredictionMetrics,
      runsPerUnit: exp.runs_per_unit,
      thresholdRunsTrue: exp.threshold_runs_true || 1,
      status: exp.status,
      reasoningEffort: exp.reasoning_effort,
      tokenStatistics: tokenStatistics,
      experimentCost: exp.experiment_cost,
      predictionErrors: exp.errors,
      labelTemplateId: exp.label_template_id,
      experimentType: exp.experiment_type
    };
  };

  // Keep experimentsRef in sync with experiments state
  useEffect(() => {
    experimentsRef.current = experiments;
  }, [experiments]);

  // Fetch experiments on mount
  useEffect(() => {
    async function fetchExperiments() {
      if (!scraperClusterId) {
        setError('Missing scraper_cluster_id parameter');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const experiments = await experimentApi.getExperiments(authFetch, scraperClusterId, undefined, globalThreshold);

        // Transform backend data to ExperimentData format
        const transformedData: ExperimentData[] = experiments.map(transformExperimentData);

        // Preserve original names when updating with global threshold
        setExperiments(prevExperiments => {
          if (prevExperiments.length === 0) {
            return transformedData;
          }

          return transformedData.map(newExp => {
            const existingExp = prevExperiments.find(e => e.id === newExp.id);
            return existingExp
              ? { ...newExp, name: existingExp.name }
              : newExp;
          });
        });
      } catch (err) {
        console.error('Failed to fetch experiments:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch experiments';
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchExperiments();
  }, [scraperClusterId, authFetch, globalThreshold]);

  // Poll running experiments every 10 seconds
  useEffect(() => {
    if (!scraperClusterId) return;

    const pollRunningExperiments = async () => {
      // Find all experiments with "running" status using the ref
      const runningExperimentIds = experimentsRef.current
        .filter(exp => exp.status === 'ongoing')
        .map(exp => exp.id);

      // If there are no running experiments, don't poll
      if (runningExperimentIds.length === 0) return;

      try {
        // Fetch only the running experiments
        const experiments = await experimentApi.getExperiments(authFetch, scraperClusterId, runningExperimentIds, globalThreshold);
        const updatedExperiments = experiments.map(transformExperimentData);

        // Update the experiments state by merging the new data, preserving original names
        setExperiments(prevExperiments => {
          return prevExperiments.map(exp => {
            const updatedExp = updatedExperiments.find((updated: ExperimentData) => updated.id === exp.id);
            return updatedExp ? { ...updatedExp, name: exp.name } : exp;
          });
        });
      } catch (err) {
        console.error('Failed to poll running experiments:', err);
        // Don't set error state for polling failures to avoid disrupting UI
      }
    };

    // Set up interval to poll every 10 seconds (10000ms)
    const intervalId = setInterval(pollRunningExperiments, 10000);

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [scraperClusterId, authFetch, globalThreshold]);

  // Handle click outside threshold dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (thresholdDropdownRef.current && !thresholdDropdownRef.current.contains(event.target as Node)) {
        setShowThresholdSlider(false);
      }
    };

    if (showThresholdSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThresholdSlider]);

  const handleSelectCurrentLabelTemplateEntity = (labelTemplateEntity: LabelTemplateEntity | null) => {
    setCurrentLabelTemplateEntity(labelTemplateEntity)

  }

  const handleSelectFilterExperimentType = (item: BaseSelectorItem) => {
    console.log("item = ", item)
    setFilterExperimentType(item.id as FilterExperimentType)
  }

  // Error state
    if (error && experiments.length === 0) {
      return (
        <div className="p-8">
          <div className="max-w-[95vw] mx-auto">
            <PageHeader title="Experiments Dashboard" className="mb-6" />
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Experiments</h2>
              <p className="text-red-600">{error}</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

  if (!canCreateExperiments) {
    return (

      <div className="p-8">
          <div className="max-w-[95vw] mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-600 text-6xl ">First label the sample!</p>
              </div>
            </div>
          </div>
        </div>
    
    )
  }

  return (
    <>
    {/* Error banner (if any, but still showing data) */}
      {error && experiments.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">⚠️ {error} - Showing fallback data</p>
        </div>
      )}
      {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="flex gap-3 flex-1">
            <Input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-(--border) rounded-(--radius)
                       bg-background text-foreground text-sm
                       focus:outline-none focus:ring-2 focus:ring-(--ring) transition-shadow"
            />
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-3 py-2 border border-(--border) rounded-(--radius)
                       bg-background text-foreground text-sm
                       focus:outline-none focus:ring-2 focus:ring-(--ring) cursor-pointer"
            >
              <option value="all">All Models</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <ThresholdSlider
            value={tempThresholdValue}
            onChange={setTempThresholdValue}
            onCommit={setGlobalThreshold}
            onReset={() => {
              setGlobalThreshold(null);
              setTempThresholdValue(0.5);
              setShowThresholdSlider(false);
            }}
            label="Global Threshold"
            helpText="Set a global threshold (0-1) to override experiment-specific thresholds"
            min={0}
            max={1}
            step={0.01}
          />
         <LabelTemplateSelector
            labelTemplateIds={uniqueLabelTemplateIds}
            selectedLabelTemplateId={currentLabelTemplateEntity?.id}
            onSelect={handleSelectCurrentLabelTemplateEntity}
            autoSelectFirst={false}
            onLoadingChange={setIsLoading}
          />

          <SimpleSelector
            items={['classify_cluster_units', 'rewrite_cluster_unit_standalone', 'summarize_prediction_notes']}
            selectedItemId={filterExperimentType}
            onSelect={handleSelectFilterExperimentType}
            onClear={() => setFilterExperimentType(null)}
            placeholder="Select Experiment Type"
            title="Select Experiment Type"
            enableSearch={false}
            disabled={isLoading}
          />

          <Button variant="primary" onClick={handleNewExperiment}>
            + New Experiment
          </Button>
        </div>
        
        
        {/* Results Count */}
        <div className="text-sm text-(--muted-foreground) mb-4">
          🔍 Showing {filteredExperiments.length} of {experiments.length} experiments • Scroll horizontally to compare →
        </div>

        {/* Prompt Cards - Horizontal Scrolling */}
        <div className="overflow-x-auto overflow-y-visible pb-4">
          <div className="flex gap-6 min-w-min">
            {filteredExperiments.map((experiment, index) => (
              <div
                key={experiment.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-[insightAppear_300ms_ease-out] shrink-0 w-[500px] overflow-visible mt-5"
              >
                <ExperimentCard
                  experiment={experiment}
                  onView={handleView}
                  onClone={handleClone}
                  onContinue={handleExperimentContinue}
                  onFilterSelect={handleFilterSelect}
                  onTest={handleTest}
                  onThresholdUpdate={handleThresholdUpdate}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredExperiments.length === 0 && (
          <div className="text-center py-12 text-(--muted-foreground)">
            <p className="text-2xl mb-2">No experiments found</p>
            <p className="text-sm">Try adjusting your search or filters, or create a new experiment</p>
            <Button variant="primary" px={"px-14"} py={"py-10"} className="mt-4" onClick={handleNewExperiment}>
              + New Experiment
            </Button>
          </div>
        )}

        {/* Test Prediction Modal */}
        {testExperimentId && (
          <TestPredictionModal
            isOpen={showTestModal}
            onClose={() => setShowTestModal(false)}
            experimentId={testExperimentId}
          />
        )}
    </>
  )
} 
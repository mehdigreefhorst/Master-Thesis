import { useEffect, useState, useRef } from "react";
import { ExperimentCard, ExperimentData } from "./ExperimentCard"
import { useRouter } from "next/navigation";
import { experimentApi } from "@/lib/api";
import { useAuthFetch } from "@/utils/fetch";
import { Button } from "../ui";
import { PageHeader } from "../layout";
import { TestPredictionModal } from "./TestPredictionModal";


interface ExperimentsSearchBarResultsProps {
  scraperClusterId?: string | null;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  canCreateExperiments: boolean
}

export const ExperimentsSearchBarResults : React.FC<ExperimentsSearchBarResultsProps> = ({
  scraperClusterId,
  isLoading,
  setIsLoading,
  canCreateExperiments
}) => {

  const [filterModel, setFilterModel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [globalThreshold, setGlobalThreshold] = useState<number | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(0.5);
  const [showThresholdSlider, setShowThresholdSlider] = useState(false);

  // Test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testExperimentId, setTestExperimentId] = useState<string | null>(null);

  const router = useRouter()
  const authFetch = useAuthFetch();
  const thresholdDropdownRef = useRef<HTMLDivElement>(null);


  
  const uniqueModels = Array.from(new Set(experiments.map(p => p.model)));
  const filteredExperiments = experiments.filter(experiment => {
    const matchesSearch = experiment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          experiment.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterModel === 'all' || experiment.model === filterModel;
    return matchesSearch && matchesFilter;
  });

  const handleNewExperiment = () => {
    if (scraperClusterId) {
      router.push(`/experiments/create?scraper_cluster_id=${scraperClusterId}`);
    }
  };

  const handleView = (experiment_id: string, label_template_id: string) => {
      if (scraperClusterId) {
        router.push(`/viewer/sample?scraper_cluster_id=${scraperClusterId}&experiment_id=${experiment_id}&label_template_id=${label_template_id}`);
      }
    };

    const handleClone = (experiment_id: string) => {
      console.log('Clone experiment:', experiment_id);
      // TODO: Open clone experiment dialog
    };

    const handleFilterSelect = (experiment_id: string, label_template_id: string) => {
      router.push(`/filtering?scraper_cluster_id=${scraperClusterId}&experiment_id=${experiment_id}&label_template_id=${label_template_id}`)
    }

    const handleTest = (experiment_id: string) => {
      setTestExperimentId(experiment_id);
      setShowTestModal(true);
    };
  
    const handleExperimentContinue = async (experiment_id: string) => {
      // Optimistically update the experiment status to "ongoing"
      setExperiments(prevExperiments =>
        prevExperiments.map(exp =>
          exp.id === experiment_id
            ? { ...exp, status: 'ongoing' }
            : exp
        )
      );

      try {
        await experimentApi.continueExperiment(authFetch, experiment_id);
      } catch (err) {
        console.error('Failed to continue experiment:', err);
        // Revert the optimistic update on error
        setExperiments(prevExperiments =>
          prevExperiments.map(exp =>
            exp.id === experiment_id
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
        const data = await experimentApi.getExperiments(authFetch, scraperClusterId, [experiment_id], globalThreshold);
        const updatedExperiments = (data.experiments || data || []).map(transformExperimentData);

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
      }
    }

    // Transform backend experiment data to frontend format
  const transformExperimentData = (exp: any): ExperimentData => {
    // Transform prediction_metrics to match frontend PredictionMetric interface
    const predictionMetrics = (exp.prediction_metrics || []).map((pm: any) => ({
      labelName: pm.prediction_category_name,
      prevalence: pm.prevalence * 100, // Convert to percentage
      prevalenceCount: pm.prevalence_count,
      totalSamples: pm.total_samples,
      accuracy: pm.accuracy * 100, // Convert to percentage
      certaintyDistribution:pm.prevelance_distribution,
      confusionMatrix: {
        tp: pm.confusion_matrix?.tp || 0,
        fp: pm.confusion_matrix?.fp || 0,
        fn: pm.confusion_matrix?.fn || 0,
        tn: pm.confusion_matrix?.tn || 0
      }
    }));

    // Transform token statistics if available
    const tokenStatistics = exp.token_statistics ? {
      total_successful_predictions: exp.token_statistics.total_successful_predictions || 0,
      total_failed_attempts: exp.token_statistics.total_failed_attempts || 0,
      total_tokens_used: {
        prompt_tokens: exp.token_statistics.total_tokens_used?.prompt_tokens || 0,
        completion_tokens: exp.token_statistics.total_tokens_used?.completion_tokens || 0,
        total_tokens: exp.token_statistics.total_tokens_used?.total_tokens || 0,
        reasoning_tokens: exp.token_statistics.total_tokens_used?.reasoning_tokens || 0,
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
      model: exp.model,
      created: new Date(exp.created).toLocaleDateString(),
      totalSamples: exp.total_samples,
      overallAccuracy: exp.overall_accuracy * 100, // Convert to percentage
      overallKappa: exp.overall_kappa * 100, // Convert to percentage
      predictionMetrics: predictionMetrics,
      runsPerUnit: exp.runs_per_unit,
      thresholdRunsTrue: exp.threshold_runs_true,
      status: exp.status,
      reasoningEffort: exp.reasoning_effort,
      tokenStatistics: tokenStatistics,
      experimentCost: exp.experiment_cost,
      labelTemplateId: exp.label_template_id
    };
  };

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
        const data = await experimentApi.getExperiments(authFetch, scraperClusterId, undefined, globalThreshold);

        // Transform backend data to ExperimentData format
        const transformedData: ExperimentData[] = (data.experiments || data || []).map(transformExperimentData);

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
        setError(err instanceof Error ? err.message : 'Failed to fetch experiments');

      } finally {
        setIsLoading(false);
      }
    }

    fetchExperiments();
  }, [scraperClusterId, authFetch, globalThreshold]);

  // Poll running experiments every second
  useEffect(() => {
    if (!scraperClusterId) return;

    const pollRunningExperiments = async () => {
      // Find all experiments with "running" status
      const runningExperimentIds = experiments
        .filter(exp => exp.status === 'ongoing')
        .map(exp => exp.id);

      // If there are no running experiments, don't poll
      if (runningExperimentIds.length === 0) return;

      try {
        // Fetch only the running experiments
        const data = await experimentApi.getExperiments(authFetch, scraperClusterId, runningExperimentIds, globalThreshold);
        const updatedExperiments = (data.experiments || data || []).map(transformExperimentData);

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

    // Set up interval to poll every 1 second (1000ms)
    const intervalId = setInterval(pollRunningExperiments, 10000);

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [experiments, scraperClusterId, authFetch]);

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

  // Loading state
    if (isLoading) {
      return (
        <div className="p-8">
          <div className="max-w-[95vw] mx-auto">
            <PageHeader title="Experiments Dashboard" className="mb-6" />
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Loading experiments...</p>
              </div>
            </div>
          </div>
        </div>
      );
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
            <input
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

          {/* Global Threshold Selector */}
          <div className="relative" ref={thresholdDropdownRef}>
            <button
              onClick={() => {
                // Sync temp value with global threshold when opening
                if (!showThresholdSlider && globalThreshold !== null) {
                  setTempThresholdValue(globalThreshold);
                }
                setShowThresholdSlider(!showThresholdSlider);
              }}
              className="px-4 py-2 border border-(--border) rounded-(--radius) bg-background text-foreground text-sm
                         focus:outline-none focus:ring-2 focus:ring-(--ring) cursor-pointer hover:bg-gray-50 transition-colors
                         min-w-[180px] text-left flex items-center justify-between"
            >
              <span>{globalThreshold === null ? 'Experiment specific' : `Threshold: ${globalThreshold.toFixed(2)}`}</span>
              <span className="ml-2">▼</span>
            </button>

            {showThresholdSlider && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 w-[280px]">
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Global Threshold</label>
                    <button
                      onClick={() => {
                        setGlobalThreshold(null);
                        setTempThresholdValue(0.5);
                        setShowThresholdSlider(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={tempThresholdValue}
                    onChange={(e) => setTempThresholdValue(parseFloat(e.target.value))}
                    onMouseUp={() => setGlobalThreshold(tempThresholdValue)}
                    onTouchEnd={() => setGlobalThreshold(tempThresholdValue)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.0</span>
                    <span className="font-medium text-gray-700">{tempThresholdValue.toFixed(2)}</span>
                    <span>1.0</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Set a global threshold (0-1) to override experiment-specific thresholds
                </div>
              </div>
            )}
          </div>

          <Button variant="primary" onClick={handleNewExperiment}>
            + New Experiment
          </Button>
        </div>
        
        
        {/* Results Count */}
        <div className="text-sm text-(--muted-foreground) mb-4">
          🔍 Showing {filteredExperiments.length} of {experiments.length} experiments • Scroll horizontally to compare →
        </div>

        {/* Prompt Cards - Horizontal Scrolling */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-min">
            {filteredExperiments.map((experiment, index) => (
              <div
                key={experiment.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-[insightAppear_300ms_ease-out] shrink-0 w-[500px]"
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
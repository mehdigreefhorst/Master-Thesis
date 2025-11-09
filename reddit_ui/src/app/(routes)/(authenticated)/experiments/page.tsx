'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ExperimentCard, ExperimentData } from '@/components/experiments/ExperimentCard';
import { experimentApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { HeaderStep } from '@/components/layout/HeaderStep';

// Helper function to transform prevalence distribution to certainty distribution
function transformCertaintyDistribution(
  prevalenceDistribution: Record<string, number>
): { certain: number; uncertain: number; split: number } {
  // prevalenceDistribution is like {"0": 10, "1": 20, "2": 40, "3": 120}
  // where the key is the number of runs that predicted true
  // We need to convert this to certainty categories:
  // - certain: All runs agree (e.g., "3" for 3 runs, or "0" for 3 runs all false)
  // - uncertain: Majority agree (e.g., "2" for 3 runs)
  // - split: No clear majority or equal split

  const dist = prevalenceDistribution || {};
  const total = Object.values(dist).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return { certain: 0, uncertain: 0, split: 0 };
  }

  // Determine total number of runs per unit by finding the max key
  const maxRuns = Math.max(...Object.keys(dist).map(k => parseInt(k)));

  let certain = 0;
  let uncertain = 0;
  let split = 0;

  Object.entries(dist).forEach(([runsTrue, count]) => {
    const runs = parseInt(runsTrue);

    // All runs agree (either all true or all false)
    if (runs === maxRuns || runs === 0) {
      certain += count;
    }
    // Majority agree (e.g., 2 out of 3)
    else if (runs > maxRuns / 2) {
      uncertain += count;
    }
    // Split or minority
    else {
      split += count;
    }
  });

  return { certain, uncertain, split };
}

// Keep mock data as fallback
const mockPrompts: ExperimentData[] = [
  {
    id: '1',
    name: 'GPT-4 Prompt v2.0',
    model: 'GPT-4',
    created: '2024-01-15',
    totalSamples: 523,
    overallAccuracy: 89.4,
    overallKappa: 86.2,
    predictionMetrics: [
      {
        labelName: 'problem_description',
        prevalence: 93,
        prevalenceCount: 487,
        totalSamples: 523,
        accuracy: 96,
        certaintyDistribution: { certain: 450, uncertain: 37, split: 0 },
        confusionMatrix: { tp: 467, fp: 20, fn: 19, tn: 17 }
      },
      {
        labelName: 'solution_attempted',
        prevalence: 60,
        prevalenceCount: 312,
        totalSamples: 523,
        accuracy: 91,
        certaintyDistribution: { certain: 237, uncertain: 64, split: 11 },
        confusionMatrix: { tp: 284, fp: 28, fn: 24, tn: 187 }
      },
      {
        labelName: 'frustration_expression',
        prevalence: 36,
        prevalenceCount: 189,
        totalSamples: 523,
        accuracy: 98,
        certaintyDistribution: { certain: 178, uncertain: 10, split: 1 },
        confusionMatrix: { tp: 186, fp: 3, fn: 4, tn: 330 }
      },
      {
        labelName: 'solution_proposing',
        prevalence: 28,
        prevalenceCount: 145,
        totalSamples: 523,
        accuracy: 73,
        certaintyDistribution: { certain: 88, uncertain: 45, split: 12 },
        confusionMatrix: { tp: 106, fp: 39, fn: 103, tn: 275 }
      },
      {
        labelName: 'agreement_empathy',
        prevalence: 19,
        prevalenceCount: 98,
        totalSamples: 523,
        accuracy: 89,
        certaintyDistribution: { certain: 80, uncertain: 16, split: 2 },
        confusionMatrix: { tp: 87, fp: 11, fn: 47, tn: 378 }
      }
    ]
  },
  {
    id: '2',
    name: 'GPT-4 Prompt v1.2',
    model: 'GPT-4',
    created: '2024-01-10',
    totalSamples: 523,
    overallAccuracy: 78.2,
    overallKappa: 73.4,
    predictionMetrics: [
      {
        labelName: 'problem_description',
        prevalence: 98,
        prevalenceCount: 512,
        totalSamples: 523,
        accuracy: 72,
        certaintyDistribution: { certain: 374, uncertain: 128, split: 10 },
        confusionMatrix: { tp: 467, fp: 45, fn: 0, tn: 11 }
      },
      {
        labelName: 'solution_attempted',
        prevalence: 57,
        prevalenceCount: 298,
        totalSamples: 523,
        accuracy: 94,
        certaintyDistribution: { certain: 271, uncertain: 25, split: 2 },
        confusionMatrix: { tp: 281, fp: 17, fn: 14, tn: 211 }
      },
      {
        labelName: 'frustration_expression',
        prevalence: 38,
        prevalenceCount: 201,
        totalSamples: 523,
        accuracy: 88,
        certaintyDistribution: { certain: 159, uncertain: 38, split: 4 },
        confusionMatrix: { tp: 177, fp: 24, fn: 9, tn: 313 }
      },
      {
        labelName: 'solution_proposing',
        prevalence: 32,
        prevalenceCount: 167,
        totalSamples: 523,
        accuracy: 68,
        certaintyDistribution: { certain: 97, uncertain: 58, split: 12 },
        confusionMatrix: { tp: 98, fp: 69, fn: 111, tn: 245 }
      },
      {
        labelName: 'agreement_empathy',
        prevalence: 26,
        prevalenceCount: 134,
        totalSamples: 523,
        accuracy: 81,
        certaintyDistribution: { certain: 86, uncertain: 39, split: 9 },
        confusionMatrix: { tp: 89, fp: 45, fn: 45, tn: 344 }
      }
    ]
  },
  {
    id: '3',
    name: 'Claude-3 Prompt v1.2',
    model: 'Claude-3-Sonnet',
    created: '2024-01-12',
    totalSamples: 201,
    overallAccuracy: 84.7,
    overallKappa: 80.1,
    predictionMetrics: [
      {
        labelName: 'problem_description',
        prevalence: 91,
        prevalenceCount: 183,
        totalSamples: 201,
        accuracy: 92,
        certaintyDistribution: { certain: 167, uncertain: 15, split: 1 },
        confusionMatrix: { tp: 178, fp: 5, fn: 9, tn: 9 }
      },
      {
        labelName: 'solution_attempted',
        prevalence: 58,
        prevalenceCount: 117,
        totalSamples: 201,
        accuracy: 87,
        certaintyDistribution: { certain: 92, uncertain: 22, split: 3 },
        confusionMatrix: { tp: 108, fp: 9, fn: 8, tn: 76 }
      },
      {
        labelName: 'frustration_expression',
        prevalence: 34,
        prevalenceCount: 68,
        totalSamples: 201,
        accuracy: 94,
        certaintyDistribution: { certain: 64, uncertain: 3, split: 1 },
        confusionMatrix: { tp: 66, fp: 2, fn: 3, tn: 130 }
      },
      {
        labelName: 'solution_proposing',
        prevalence: 25,
        prevalenceCount: 50,
        totalSamples: 201,
        accuracy: 78,
        certaintyDistribution: { certain: 31, uncertain: 15, split: 4 },
        confusionMatrix: { tp: 41, fp: 9, fn: 35, tn: 116 }
      },
      {
        labelName: 'agreement_empathy',
        prevalence: 22,
        prevalenceCount: 44,
        totalSamples: 201,
        accuracy: 86,
        certaintyDistribution: { certain: 36, uncertain: 7, split: 1 },
        confusionMatrix: { tp: 39, fp: 5, fn: 23, tn: 134 }
      }
    ]
  }
];

function ExperimentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const data = await experimentApi.getExperiments(authFetch, scraperClusterId);

        // Transform backend data to ExperimentData format
        const transformedData: ExperimentData[] = (data.experiments || data || []).map((exp: any) => {
          // Transform prediction_metrics to match frontend PredictionMetric interface
          const predictionMetrics = (exp.prediction_metrics || []).map((pm: any) => ({
            labelName: pm.prediction_category_name,
            prevalence: pm.prevalence * 100, // Convert to percentage
            prevalenceCount: pm.prevalence_count,
            totalSamples: pm.total_samples,
            accuracy: pm.accuracy * 100, // Convert to percentage
            certaintyDistribution: transformCertaintyDistribution(pm.prevelance_distribution),
            confusionMatrix: {
              tp: pm.confusion_matrix?.tp || 0,
              fp: pm.confusion_matrix?.fp || 0,
              fn: pm.confusion_matrix?.fn || 0,
              tn: pm.confusion_matrix?.tn || 0
            }
          }));

          return {
            id: exp.id,
            name: exp.name,
            model: exp.model,
            created: new Date(exp.created).toLocaleDateString(),
            totalSamples: exp.total_samples,
            overallAccuracy: exp.overall_accuracy * 100, // Convert to percentage
            overallKappa: exp.overall_kappa * 100, // Convert to percentage
            predictionMetrics
          };
        });

        setExperiments(transformedData);
      } catch (err) {
        console.error('Failed to fetch experiments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch experiments');
        // Fallback to mock data on error
        setExperiments(mockPrompts);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExperiments();
  }, [scraperClusterId, authFetch]);

  const handleView = (id: string) => {
    if (scraperClusterId) {
      router.push(`/viewer?scraper_cluster_id=${scraperClusterId}&experiment_id=${id}`);
    }
  };

  const handleClone = (id: string) => {
    console.log('Clone experiment:', id);
    // TODO: Open clone experiment dialog
  };

  const handleNewExperiment = () => {
    if (scraperClusterId) {
      router.push(`/experiments/create?scraper_cluster_id=${scraperClusterId}`);
    }
  };

  const filteredExperiments = experiments.filter(experiment => {
    const matchesSearch = experiment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         experiment.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterModel === 'all' || experiment.model === filterModel;
    return matchesSearch && matchesFilter;
  });

  const uniqueModels = Array.from(new Set(experiments.map(p => p.model)));

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

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-[95vw] mx-auto">
        {/* Page Header */}

        <HeaderStep 
          title='Experiments Dashboard'
          subtitle=''
        />

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
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-[95vw] mx-auto">
          <PageHeader title="Experiments Dashboard" className="mb-6" />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      
      <ExperimentsPageContent />
    </Suspense>
  );
}

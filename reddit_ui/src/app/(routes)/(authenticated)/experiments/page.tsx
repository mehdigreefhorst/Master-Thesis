'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ExperimentCard, ExperimentData } from '@/components/experiments/ExperimentCard';
import { experimentApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { HeaderStep } from '@/components/layout/HeaderStep';

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
            certaintyDistribution:pm.prevelance_distribution,
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
            predictionMetrics: predictionMetrics,
            runsPerUnit: exp.runs_per_unit
          };
        });

        setExperiments(transformedData);
      } catch (err) {
        console.error('Failed to fetch experiments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch experiments');

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

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThreadBox } from '@/components/thread/ThreadBox';
import { ThreadPost } from '@/components/thread/ThreadPost';
import { ThreadComment } from '@/components/thread/ThreadComment';
import { ThreadTarget } from '@/components/thread/ThreadTarget';
import { LabelTable } from '@/components/label/LabelTable';
import { InsightBox } from '@/components/ui/InsightBox';
import { Button } from '@/components/ui/Button';
import { ViewerSkeleton } from '@/components/ui/Skeleton';
import { clusterApi } from '@/lib/api';
import type { ClusterUnitEntity, ClusterUnitEntityCategory } from '@/types/cluster-unit';
import { useAuthFetch } from '@/utils/fetch';
import Link from 'next/link';

interface CachedData {
  clusterUnits: ClusterUnitEntity[];
  scraperClusterId: string;
}

export default function ViewerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch()
  const [cachedData, setCachedData] = useState<CachedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get URL parameters
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const clusterUnitEntityId = searchParams.get('cluster_unit_entity_id');

  // Fetch data on mount or when scraper_cluster_id changes
  useEffect(() => {
    async function fetchData() {
      console.log("fetching data ")
      if (!scraperClusterId) {
        setError('Missing scraper_cluster_id parameter');
        setIsLoading(false);
        return;
      }

      // Check if we already have data for this scraper cluster
      if (cachedData?.scraperClusterId === scraperClusterId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        //const response = await clusterApi.getClusterUnits(scraperClusterId);
        interface cluster_unit_response {
          cluster_unit_entities: ClusterUnitEntity[]
        }

        const response =  await authFetch(`/clustering/get_cluster_units?scraper_cluster_id=${scraperClusterId}`)
        const cluster_unit_entities_response: cluster_unit_response = await response.json()
        console.log("cluster_unit_entities_response = ")
        console.log(cluster_unit_entities_response)

        setCachedData({
          clusterUnits: cluster_unit_entities_response.cluster_unit_entities,
          scraperClusterId,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [scraperClusterId]); // Only re-fetch if scraper_cluster_id changes

  // Auto-redirect to first cluster unit if none is specified
  useEffect(() => {
    if (cachedData && !clusterUnitEntityId && cachedData.clusterUnits.length > 0) {
      const firstUnit = cachedData.clusterUnits[0];
      router.replace(
        `/viewer?scraper_cluster_id=${scraperClusterId}&cluster_unit_entity_id=${firstUnit.id}`
      );
    }
  }, [cachedData, clusterUnitEntityId, scraperClusterId, router]);

  // Find current cluster unit and index
  const { currentUnit, currentIndex, totalUnits } = useMemo(() => {
    if (!cachedData) {
      return { currentUnit: null, currentIndex: -1, totalUnits: 0 };
    }

    // If no clusterUnitEntityId, we're probably about to redirect
    if (!clusterUnitEntityId) {
      return {
        currentUnit: null,
        currentIndex: -1,
        totalUnits: cachedData.clusterUnits.length
      };
    }

    const index = cachedData.clusterUnits.findIndex(
      (unit) => unit.id === clusterUnitEntityId
    );

    return {
      currentUnit: index >= 0 ? cachedData.clusterUnits[index] : null,
      currentIndex: index,
      totalUnits: cachedData.clusterUnits.length,
    };
  }, [cachedData, clusterUnitEntityId]);

  // Navigation handlers
  const handlePrevious = () => {
    if (!cachedData || currentIndex <= 0) return;

    const prevUnit = cachedData.clusterUnits[currentIndex - 1];
    router.push(
      `/viewer?scraper_cluster_id=${scraperClusterId}&cluster_unit_entity_id=${prevUnit.id}`
    );
  };

  const handleNext = () => {
    if (!cachedData || currentIndex >= cachedData.clusterUnits.length - 1) return;

    const nextUnit = cachedData.clusterUnits[currentIndex + 1];
    router.push(
      `/viewer?scraper_cluster_id=${scraperClusterId}&cluster_unit_entity_id=${nextUnit.id}`
    );
  };

  // Group predictions by prompt_id
  const groupedPredictions = useMemo(() => {

    if (!currentUnit || !currentUnit.predicted_category) return {};



    const groups: Record<string, typeof currentUnit.predicted_category> = {};

    currentUnit.predicted_category.forEach((prediction) => {
      if (!groups[prediction.prompt_id]) {
        groups[prediction.prompt_id] = [];
      }
      groups[prediction.prompt_id].push(prediction);
    });

    return groups;
  }, [currentUnit]);

  // Get unique prompt IDs (models)
  const promptIds = Object.keys(groupedPredictions);

  // Callback to update ground truth in cached data
  const handleGroundTruthUpdate = (labelKey: string, newValue: boolean) => {
    if (!cachedData || !clusterUnitEntityId) return;

    setCachedData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        clusterUnits: prev.clusterUnits.map(unit => {
          if (unit.id === clusterUnitEntityId && unit.ground_truth) {
            return {
              ...unit,
              ground_truth: {
                ...unit.ground_truth,
                [labelKey]: newValue
              }
            };
          }
          return unit;
        })
      };
    });
  };

  // Transform data for LabelTable component
  const { models, labels, stats } = useMemo(() => {


    if (!currentUnit || !currentUnit.ground_truth) {
      return { models: [], labels: [], stats: [] };
    }

    const labelKeys: (keyof ClusterUnitEntityCategory)[] = [
      'problem_description',
      'frustration_expression',
      'solution_seeking',
      'solution_attempted',
      'solution_proposing',
      'agreement_empathy',
      'none_of_the_above',
    ];


    // Build models array
    const modelsData = promptIds.map((promptId) => ({
      name: `Prompt`, // TODO: Get actual prompt name from backend
      version: promptId.substring(0, 8), // Show short UUID
    }));

    // Build labels array
    const labelsData = labelKeys.map((labelKey) => {
      const groundTruth = currentUnit.ground_truth?.[labelKey] ?? null;

      // For each prompt, calculate how many predictions matched ground truth
      const results = promptIds.map((promptId) => {
        const predictions = groupedPredictions[promptId];
        if (!predictions || predictions.length === 0) return null;

        const matchingCount = predictions.filter(
          (pred) => pred[labelKey] === groundTruth
        ).length;

        return {
          count: matchingCount,
          total: predictions.length,
        };
      });



      return {
        labelName: labelKey,
        groundTruth,
        results,
      };
    });

    // Calculate stats (accuracy & consistency) for each prompt
    const statsData = promptIds.map((promptId) => {
      const predictions = groupedPredictions[promptId];
      let correctPredictions = 0;
      let totalPredictions = 0;

      labelKeys.forEach((labelKey) => {
        const groundTruth = currentUnit.ground_truth?.[labelKey] ?? false;
        predictions.forEach((pred) => {
          if (pred[labelKey] === groundTruth) correctPredictions++;
          totalPredictions++;
        });
      });

      const accuracy = totalPredictions > 0
        ? Math.round((correctPredictions / totalPredictions) * 100)
        : 0;

      // Determine consistency
      let consistency = 'Perfect';
      if (predictions.length > 1) {
        // Check if all predictions are identical
        const firstPred = predictions[0];
        const allSame = predictions.every((pred) =>
          labelKeys.every((key) => pred[key] === firstPred[key])
        );
        consistency = allSame ? 'Perfect' : 'Medium';
      }

      return {
        accuracy,
        consistency,
        isHighlighted: accuracy === 100,
      };
    });

    return { models: modelsData, labels: labelsData, stats: statsData };
  }, [currentUnit, promptIds, groupedPredictions]);

  // Render thread from thread_path_text
  const renderThread = () => {
    if (!currentUnit) return null;

    const threadPath = currentUnit.thread_path_text || [];
    const currentText = currentUnit.text;

    return (
      <ThreadBox>
        {threadPath.map((text, index) => {
          if (index === 0) {
            return <ThreadPost key={index} username={`u/author${index}`} content={text} />;
          }
          return <ThreadComment key={index} username={`u/author${index}`} content={text} />;
        })}
        <ThreadTarget username={currentUnit.author} content={currentText} />
      </ThreadBox>
    );
  };

  // Loading state
  if (isLoading) {
    return <ViewerSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
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

  // No data state
  if (!currentUnit) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Data Found</h2>
            <p className="text-yellow-600">
              Could not find cluster unit with ID: {clusterUnitEntityId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Label Accuracy Viewer"
          currentSample={currentIndex + 1}
          totalSamples={totalUnits}
          onPrevious={handlePrevious}
          onNext={handleNext}
          disablePrevious={currentIndex <= 0}
          disableNext={currentIndex >= totalUnits - 1}
          className="mb-6"
        />

        {/* Thread Context */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">
              r/{currentUnit.type === 'post' ? 'post' : 'comment'} Thread:
            </h2>
            <Button className="text-sm text-blue-600" variant="invisible">
              View Full ▼
            </Button>
          </div>

          {renderThread()}
        </div>


        {/* Label Comparison Table */}

          <div className="mb-6">
            <LabelTable
              models={models}
              labels={labels}
              stats={stats}
              cluster_unit_id={currentUnit.id}
              onGroundTruthUpdate={handleGroundTruthUpdate}
            />
            <div className="mt-3 text-sm text-gray-600">
              💬 = Click to view reasoning | ⚠️ = Inconsistent across runs | ✓ = All runs match
            </div>
          </div>
        

        {/* AI Insight Box */}
        <InsightBox className="mb-6">
          Analyzing {models.length} prompt{models.length !== 1 ? 's' : ''} with{' '}
          {Object.values(groupedPredictions)[0]?.length || 0} run{Object.values(groupedPredictions)[0]?.length !== 1 ? 's' : ''} each.
          {stats.some((s) => s.accuracy === 100) && (
            <> <strong>{stats.filter((s) => s.accuracy === 100).length}</strong> prompt(s) achieved 100% accuracy.</>
          )}
        </InsightBox>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Link href={"/prompts"}>
            <Button variant="primary">View Prompts & Edit</Button>
          </Link>
          
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={currentIndex >= totalUnits - 1}
          >
            Next Sample →
          </Button>
        </div>
      </div>
    </div>
  );
}

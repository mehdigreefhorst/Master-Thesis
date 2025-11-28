'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThreadBox } from '@/components/thread/ThreadBox';
import { ThreadPost } from '@/components/thread/ThreadPost';
import { ThreadComment } from '@/components/thread/ThreadComment';
import { ThreadTarget } from '@/components/thread/ThreadTarget';
import { LabelTable } from '@/components/label/LabelTable';
import { InsightBox } from '@/components/ui/InsightBox';
import { Button } from '@/components/ui/Button';
import { ViewerSkeleton } from '@/components/ui/Skeleton';
import type { ClusterUnitEntity, ClusterUnitEntityCategory } from '@/types/cluster-unit';
import Link from 'next/link';
import { PromptEntity } from '@/types/prompt';
import { ThreadFromUnit } from '../thread/ThreadFromUnit';

export interface ViewerContentProps {
  scraperClusterId: string | null;

  currentClusterUnit?: ClusterUnitEntity
  clusterUnitIndex: number;
  totalClusterUnits: number;
  handleClusterUnitGroundTruthUpdate: (clusterUnitEntityId: string, category: keyof ClusterUnitEntityCategory, newValue: boolean) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  handleCompleteSampleLabeling: ()=> void;
  /**
   * Base path for navigation (e.g., '/viewer' or '/viewer/sample')
   */
  promptsNameExperimentIdDict: Record<string, { promptId: string; promptName: string; modelId: string }>;
  basePath: string;
  isLoading: boolean;
}

/**
 * Shared viewer component that displays cluster units with label comparison.
 * Can be configured with different data fetching strategies.
 */
export function ViewerContent({
  scraperClusterId,
  currentClusterUnit,
  clusterUnitIndex,
  totalClusterUnits,
  handleClusterUnitGroundTruthUpdate,
  handlePrevious,
  handleNext,
  handleCompleteSampleLabeling,
  promptsNameExperimentIdDict,
  basePath,
  isLoading
}: ViewerContentProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);  

  // Get unique prompt IDs (models)
  const ExperimentIds = Object.keys(currentClusterUnit && currentClusterUnit.predicted_category ? currentClusterUnit.predicted_category : []);


  // Transform data for LabelTable component
  const { models, labels, stats } = useMemo(() => {
    if (!currentClusterUnit || !currentClusterUnit.ground_truth) {
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
    //prompts.find((prompt: PromptEntity) => prompt.id === ExperimentId);
    // Build models array

    const modelsData = ExperimentIds.map((ExperimentId) => (
      {
      
      name: promptsNameExperimentIdDict[ExperimentId]["promptName"], // TODO: Get actual prompt name from backend
      modelId: promptsNameExperimentIdDict[ExperimentId]["modelId"],
      version: ExperimentId.substring(0, 8), // Show short UUID
    }));

    // Build labels array
    const labelsData = labelKeys.map((labelKey) => {
      const groundTruth = currentClusterUnit.ground_truth?.[labelKey] ?? null;

      // For each prompt, calculate how many predictions matched ground truth
      const results = ExperimentIds.map((ExperimentId) => {
        const predictions = currentClusterUnit.predicted_category[ExperimentId].predicted_categories;
        // console.log("predictions = ")
        // console.log(JSON.stringify(predictions))
        if (!predictions || predictions.length === 0) return null;

        const matchingCount = predictions.filter((pred) => pred[labelKey]).length;
        
        
        if (matchingCount > 0) {
          let reasons: string[] = []
          predictions.map((pred, index) => {
            if (pred[labelKey]){
              reasons.push(`Run ${index + 1}: ${pred.reason}`)
            }
          })
          return {
            count: matchingCount,
            total: predictions.length,
            reasons: reasons
          }
            
        }else {
          return {
          count: matchingCount,
          total: predictions.length,
        };
        }
        
      });

      return {
        labelName: labelKey,
        groundTruth,
        results,
      };
    });

    // Calculate stats (accuracy & consistency) for each prompt
    const statsData = ExperimentIds.map((ExperimentId) => {
      const predictions = currentClusterUnit.predicted_category[ExperimentId].predicted_categories;
      let correctPredictions = 0;
      let totalPredictions = 0;

      labelKeys.forEach((labelKey) => {
        const groundTruth = currentClusterUnit.ground_truth?.[labelKey] ?? false;
        predictions.forEach((pred) => {
          if (pred[labelKey] === groundTruth) correctPredictions++;
          totalPredictions++;
        });
      });

      const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

      // Determine consistency
      let consistency = 'Perfect';
      if (predictions.length > 1) {
        // Check if all predictions are identical
        const firstPred = predictions[0];
        const allSame = predictions.every((pred) => labelKeys.every((key) => pred[key] === firstPred[key]));
        consistency = allSame ? 'Perfect' : 'Medium';
      }

      return {
        accuracy,
        consistency,
        isHighlighted: accuracy === 100,
      };
    });

    return { models: modelsData, labels: labelsData, stats: statsData };
  }, [currentClusterUnit, ExperimentIds, promptsNameExperimentIdDict]);

  // // Render thread from thread_path_text
  // const renderThread = () => {
  //   if (!currentClusterUnit) return null;

  //   const threadPath = currentClusterUnit.thread_path_text || [];
  //   const threadPathAuthor = currentClusterUnit.thread_path_author || [];
  //   const currentText = currentClusterUnit.text;

  //   return (
  //     <ThreadBox>
  //       {threadPath.map((text, index) => {
  //           const author = threadPathAuthor[index] || `author${index}`;

  //         if (index === 0) {
  //           return <ThreadPost key={index} username={`u/${author}`}  content={text} />;
  //         }
  //         return <ThreadComment key={index} username={`u/${author}`}  content={text} />;
  //       })}
  //       <ThreadTarget username={currentClusterUnit.author} content={currentText} />
  //     </ThreadBox>
  //   );
  // };

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
            <Button variant="primary" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!currentClusterUnit) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Data Found</h2>
            <p className="text-yellow-600">Could not find cluster unit with ID: Not found </p>
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
          currentSample={clusterUnitIndex + 1}
          totalSamples={totalClusterUnits}
          onPrevious={handlePrevious}
          onNext={handleNext}
          disablePrevious={clusterUnitIndex <= 0}
          disableNext={clusterUnitIndex >= totalClusterUnits - 1}
          className="mb-6"
        />

        {/* Thread Context */}
         <ThreadFromUnit currentUnit={currentClusterUnit}/>

        {/* Label Comparison Table */}
        <div className="mb-6">
          <LabelTable
            models={models}
            labels={labels}
            stats={stats}
            cluster_unit_id={currentClusterUnit.id}
            handleClusterUnitGroundTruthUpdate={handleClusterUnitGroundTruthUpdate}
          />
          <div className="mt-3 text-sm text-gray-600">
            💬 = Click to view reasoning | ⚠️ = Inconsistent across runs | ✓ = All runs match
          </div>
        </div>

        {/* AI Insight Box
        <InsightBox className="mb-6">
          Analyzing {models.length} prompt{models.length !== 1 ? 's' : ''} with{' '}
          {Object.values(currentUnit.predicted_category[])[0]?.length || 0} run
          {Object.values(groupedPredictions)[0]?.length !== 1 ? 's' : ''} each.
          {stats.some((s) => s.accuracy === 100) && (
            <>
              {' '}
              <strong>{stats.filter((s) => s.accuracy === 100).length}</strong> prompt(s) achieved 100% accuracy.
            </>
          )}
        </InsightBox> */}

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Link href={`/experiments?scraper_cluster_id=${scraperClusterId}`}>
            <Button variant="primary">View Experiments</Button>
          </Link>
          
          <Button variant="primary" onClick={handleNext} disabled={clusterUnitIndex >= totalClusterUnits - 1}>
            Next Sample →
          </Button>
          {clusterUnitIndex >= totalClusterUnits - 1 &&
            <Button variant="primary" onClick={handleCompleteSampleLabeling} >
              Complete Labeling
            </Button>
          }
          
        </div>
      </div>
    </div>
  );
}

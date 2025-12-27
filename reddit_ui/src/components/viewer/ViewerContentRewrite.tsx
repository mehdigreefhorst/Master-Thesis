'use client';

import { Button } from '@/components/ui/Button';
import { ViewerSkeleton } from '@/components/ui/Skeleton';
import type { ExperimentAllPredictedData, ExperimentModelInformation } from '@/types/cluster-unit';
import Link from 'next/link';
import { ThreadFromUnit } from '../thread/ThreadFromUnit';
import { LabelTemplateEntity } from '@/types/label-template';
import { useToast } from '@/components/ui/use-toast';

// Import rewrite experiment cards component
import { RewriteExperimentCards } from '../rewrite/RewriteExperimentCards';
import { PromptCategory } from '@/types/experiment';


export interface ViewerContentRewriteProps {
  scraperClusterId: string | null;
  labelTemplateEntity?: LabelTemplateEntity | null;
  clusterUnitEntityExperimentData?: ExperimentAllPredictedData | null;
  allExperimentsModelInformation?: ExperimentModelInformation[]
  isLastClusterUnitEntity: boolean;
  handleNext?: () => void;
  experimentType?: PromptCategory;
  /**
   * Base path for navigation (e.g., '/viewer' or '/viewer/sample')
   */
  // promptsNameExperimentIdDict: Record<string, { promptId: string; promptName: string; modelId: string }>;
  // basePath: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  isLoading: boolean;
}

/**
 * Rewrite viewer component that displays cluster units with rewrite experiment outputs.
 * Shows text generation results in a card-based layout.
 */
export function ViewerContentRewrite({
  scraperClusterId,
  labelTemplateEntity,
  clusterUnitEntityExperimentData,
  allExperimentsModelInformation,
  isLastClusterUnitEntity,
  handleNext,
  experimentType="rewrite_cluster_unit_standalone",
  setIsLoading,
  isLoading
}: ViewerContentRewriteProps) {

  const { toast } = useToast();

  const handleViewExperiments = () => {

  }
  

  // Loading state
  if (isLoading) {
    return <ViewerSkeleton />;
  }

  // No data state
  if (!clusterUnitEntityExperimentData || !allExperimentsModelInformation) {
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
        {/* Thread Context */}
        <ThreadFromUnit clusterUnitEntity={clusterUnitEntityExperimentData.cluster_unit_enity} />

        {/* Rewrite Experiment Cards */}
        <div className="mb-6">
          <RewriteExperimentCards
            allExperimentsModelInformation={allExperimentsModelInformation}
            clusterUnitEntityExperimentData={clusterUnitEntityExperimentData}
            labelTemplateId={labelTemplateEntity?.id || ""}
          />
          <div className="mt-3 text-sm text-gray-600">
            💬 = Click to view additional details
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Link href={`/experiments?scraper_cluster_id=${scraperClusterId}&experiment_type=${experimentType}`}>
            <Button variant="primary">View Experiments</Button>
          </Link>

          <Button variant="primary" onClick={handleNext} disabled={isLastClusterUnitEntity}>
            Next Sample →
          </Button>
        </div>
      </div>
    </div>
  );
}

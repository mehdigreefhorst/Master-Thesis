'use client';
import { StepBackIcon, StepForwardIcon } from 'lucide-react';
import { LabelTable } from '@/components/label/LabelTable';
import { Button } from '@/components/ui/Button';
import { ViewerSkeleton } from '@/components/ui/Skeleton';
import type { ExperimentAllPredictedData, ExperimentModelInformation } from '@/types/cluster-unit';
import Link from 'next/link';
import { ThreadFromUnit } from '../thread/ThreadFromUnit';
import { LabelTemplateEntity } from '@/types/label-template';
import { useToast } from '@/components/ui/use-toast';


export interface ViewerContentClassifyProps {
  scraperClusterId: string | null;
  labelTemplateEntity?: LabelTemplateEntity | null;
  clusterUnitEntityExperimentData?: ExperimentAllPredictedData | null;
  allExperimentsModelInformation?: ExperimentModelInformation[];
  isFirstClusterUnitEntity: boolean;
  isLastClusterUnitEntity: boolean;
  handleUpdateGroundTruth: (labelName: string, value: boolean | string | number) => void;
  labelsPossibleValues?: Record<string, string[] | boolean[]> | null
  handleCompleteSampleLabeling: ()=> void;
  handlePrevious?: () => void;
  handleNext?: () => void;
  /**
   * Base path for navigation (e.g., '/viewer' or '/viewer/sample')
   */
  // promptsNameExperimentIdDict: Record<string, { promptId: string; promptName: string; modelId: string }>;
  // basePath: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  isLoading: boolean;
}

/**
 * Shared viewer component that displays cluster units with label comparison.
 * Can be configured with different data fetching strategies.
 */
export function ViewerContentClassify({
  scraperClusterId,
  labelTemplateEntity,
  clusterUnitEntityExperimentData,
  allExperimentsModelInformation,
  isFirstClusterUnitEntity,
  isLastClusterUnitEntity,  
  handleUpdateGroundTruth,
  labelsPossibleValues,
  handleCompleteSampleLabeling,
  handlePrevious,
  handleNext,
  setIsLoading,
  isLoading
}: ViewerContentClassifyProps) {

  const { toast } = useToast()


  

  // Loading state
  if (isLoading) {
    return <ViewerSkeleton />;
  }

  // No data state
  if (!clusterUnitEntityExperimentData || !allExperimentsModelInformation) {
    return (
      <div className="p-8">
        <div className="max-w-[120rem] mx-auto">
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
      <div className="max-w-[120rem] mx-auto">
        {/* Page Header */}
        
        

        {/* Thread Context */}
        <ThreadFromUnit clusterUnitEntity={clusterUnitEntityExperimentData.cluster_unit_enity} />

        <LabelTable
          allExperimentsModelInformation={allExperimentsModelInformation}
          clusterUnitEntityExperimentData={clusterUnitEntityExperimentData}
          labelTemplateId={labelTemplateEntity?.id || ""}
          handleClusterUnitGroundTruthUpdate={(category, value) =>
            handleUpdateGroundTruth(category, value)
          }
          labelsPossibleValues={labelsPossibleValues}
          
        />
        
          <div className="mt-3 text-sm text-gray-600">
            💬 = Click to view reasoning | ⚠️ = Inconsistent across runs | ✓ = All runs match
          </div>
        


        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Link href={`/experiments?scraper_cluster_id=${scraperClusterId}`}>
            <Button variant="secondary">View Experiments</Button>
          </Link>
          <Button variant="primary" className="flex gap-2" onClick={handlePrevious} disabled={isFirstClusterUnitEntity}>
            
            <StepBackIcon/>
            Previous Sample
          </Button>
          <Button variant="primary" className="flex gap-2" onClick={handleNext} disabled={isLastClusterUnitEntity}>
            Next Sample
            <StepForwardIcon/>
          </Button>
          {isLastClusterUnitEntity &&
            <Button variant="primary" onClick={handleCompleteSampleLabeling} >
              Complete Labeling
            </Button>
          }

        </div>
      </div>
    </div>
  );
}

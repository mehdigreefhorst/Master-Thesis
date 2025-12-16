'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';

import { LabelTable } from '@/components/label/LabelTable';
import { Button } from '@/components/ui/Button';
import { ViewerSkeleton } from '@/components/ui/Skeleton';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import Link from 'next/link';
import { PromptEntity } from '@/types/prompt';
import { ThreadFromUnit } from '../thread/ThreadFromUnit';
import { LabelTemplateEntity } from '@/types/label-template';
import { useToast } from '@/components/ui/use-toast';
import { produce } from 'immer';
import { experimentApi, labelTemplateApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { SampleEntity } from '@/types/sample';
import { MultiLabelTemplateSelector } from '../experiment-create/MultiLabelTemplateSelector';

export interface ViewerContentProps {
  scraperClusterId: string | null;

  handleCompleteSampleLabeling: ()=> void;
  /**
   * Base path for navigation (e.g., '/viewer' or '/viewer/sample')
   */
  promptsNameExperimentIdDict: Record<string, { promptId: string; promptName: string; modelId: string }>;
  basePath: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  isLoading: boolean;
}

/**
 * Shared viewer component that displays cluster units with label comparison.
 * Can be configured with different data fetching strategies.
 */
export function ViewerContent({
  scraperClusterId,
  handleCompleteSampleLabeling,
  promptsNameExperimentIdDict,
  basePath,
  setIsLoading,
  isLoading
}: ViewerContentProps) {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();


  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast()

  // Support both single label_template_id (old) and multiple label_template_ids (new)
  const labelTemplateIdParam = searchParams.get("label_template_id"); // Legacy single ID
  const labelTemplateIdsParam = searchParams.get("label_template_ids"); // New multiple IDs
  const experimentIdParam = searchParams.get("experiment_id"); // New multiple IDs


  const labelTemplateIds = useMemo(() => {
    if (labelTemplateIdsParam) {
      return labelTemplateIdsParam.split(',').filter(id => id.trim());
    } else if (labelTemplateIdParam) {
      return [labelTemplateIdParam];
    }
    return [];
  }, [labelTemplateIdParam, labelTemplateIdsParam]);


  // Get unique prompt IDs (models)
  const [totalClusterUnits, setTotalClusterUnits] = useState<number>(0);

  const [currentClusterUnit, setCurrentClusterUnit] = useState<ClusterUnitEntity>();

  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);

  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);

  const ExperimentIds = Object.keys(currentClusterUnit && currentClusterUnit.predicted_category ? currentClusterUnit.predicted_category : []);
  const [labelTemplateEntities, setLabelTemplateEntities] = useState<LabelTemplateEntity[]>([])

  // Sample entity state (only used in sample view)
  const [sampleEntity, setSampleEntity] = useState<SampleEntity | null>(null);
  const isSampleView = basePath.includes('/sample');



    // Track what we've already fetched to prevent duplicate requests
    const fetchedRef = useRef<string | null>(null);
  
    useEffect(() => {
      async function loadClusterUnits() {
        if (!scraperClusterId) return;
  
        // Create a unique key for this fetch
        const fetchKey = `${scraperClusterId}`;
  
        // Skip if we've already fetched this data
        if (fetchedRef.current === fetchKey) {
          return;
        }
  
        try {
          setIsLoading(true);
          console.log('Fetching sample cluster units for scraper cluster:', scraperClusterId);
  
          const cluster_unit_entities = await experimentApi.getSampleUnits(authFetch, scraperClusterId);
          console.log('Sample cluster units response:', cluster_unit_entities);
  
          setClusterUnits(cluster_unit_entities);
          setCurrentClusterUnit(cluster_unit_entities[0])
          setTotalClusterUnits(cluster_unit_entities.length)
          fetchedRef.current = fetchKey; // Mark as fetched
        } catch (error) {
          console.error('Error fetching cluster units:', error);
        } finally {
          setIsLoading(false);
        }
      }
  
      loadClusterUnits();
    }, [scraperClusterId, authFetch])

  // Fetch sample entity (only in sample view)
  useEffect(() => {
    async function loadSampleEntity() {
      if (!scraperClusterId || !isSampleView) return;

      try {
        const sample = await experimentApi.getSampleEntity(authFetch, scraperClusterId);
        setSampleEntity(sample);
      } catch (error) {
        console.error('Error fetching sample entity:', error);
        toast({
          title: "Error",
          description: "Failed to load sample entity",
          variant: "destructive"
        });
      }
    }

    loadSampleEntity();
  }, [scraperClusterId, isSampleView, authFetch, toast]);

  // Transform data for LabelTable component - now creates data for each template
  const transformDataForTemplate = useCallback((labelTemplateEntity: LabelTemplateEntity) => {
    if (!currentClusterUnit || !currentClusterUnit.ground_truth) {
      return { models: [], labels: [], stats: [] };
    }

    const labelKeys = labelTemplateEntity.labels

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
      if (!currentClusterUnit.ground_truth) return null
      const groundTruth = currentClusterUnit.ground_truth[labelTemplateEntity.id].values[labelKey.label].value ?? null;


      // For each prompt, calculate how many predictions matched ground truth
      const results = ExperimentIds.map((ExperimentId) => {
        if (!currentClusterUnit.predicted_category) return null;
        const predictions = currentClusterUnit.predicted_category[ExperimentId].predicted_categories;
        // console.log("predictions = ")
        // console.log(JSON.stringify(predictions))
        if (!predictions || predictions.length === 0) return null;

        const matchingCount= predictions.filter((pred) => 
          pred.labels_prediction.values[labelKey.label].value === true
        ).length
        
        
        let reasons: string[] = []
        predictions.map((pred, index) => {
          if (pred.labels_prediction.values[labelKey.label]){
            let per_label_fields: string = `Run ${index + 1}: `

            pred.labels_prediction.values[labelKey.label].per_label_details.forEach((per_label) => {
              per_label_fields += `${per_label.label} = ${per_label.value}`
            })
            reasons.push(per_label_fields)
          }
        })
        return {
          count: matchingCount,
          total: predictions.length,
          reasons: reasons
        }
        
      });

      return {
        labelName: labelKey.label,
        groundTruth,
        results,
      };
    });

    // Calculate stats (accuracy & consistency) for each prompt
    const statsData = ExperimentIds.map((ExperimentId) => {
      if (!currentClusterUnit.predicted_category) return null;

      const predictions = currentClusterUnit.predicted_category[ExperimentId].predicted_categories;
      let correctPredictions = 0;
      let totalPredictions = 0;

      labelKeys.forEach((labelKey) => {
        if (!currentClusterUnit.ground_truth?.[labelTemplateEntity.id]) return
        const groundTruth = currentClusterUnit.ground_truth?.[labelTemplateEntity.id].values[labelKey.label].value ?? false;
        predictions.forEach((pred) => {
          if (pred.labels_prediction.values[labelKey.label].value === groundTruth) correctPredictions++;
          totalPredictions++;
        });
      });

      const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

      // Determine consistency
      let consistency = 'Perfect';
      if (predictions.length > 1) {
        // Check if all predictions are identical
        const firstPred = predictions[0];
        const allSame = predictions.every((pred) => labelKeys.every((key) => pred.labels_prediction.values[key.label].value === firstPred.labels_prediction.values[key.label].value));
        consistency = allSame ? 'Perfect' : 'Medium';
      }

      return {
        accuracy,
        consistency,
        isHighlighted: accuracy === 100,
      };
    });

    return {
      models: modelsData,
      labels: labelsData.filter((label): label is NonNullable<typeof label> => label !== null),
      stats: statsData.filter((stat): stat is NonNullable<typeof stat> => stat !== null)
    };
  }, [currentClusterUnit, ExperimentIds, promptsNameExperimentIdDict]);

  // Transform data for all templates
  const allTemplateData = useMemo(() => {
    return labelTemplateEntities.map(template => ({
      template,
      data: transformDataForTemplate(template)
    }));
  }, [labelTemplateEntities, transformDataForTemplate]);

  
  const handleClusterUnitGroundTruthUpdate = (
    clusterUnitEntityId: string,
    labelTemplateId: string,
    category: string,
    newValue: boolean
  ) => {
    if (!clusterUnitEntityId) {
      return toast({
        title: "Error",
        description: "No clusterUnitEntity or clusterUnitEntityId is selected!",
        variant: "destructive"
      });
    }

    const labelTemplateEntity = labelTemplateEntities.find(t => t.id === labelTemplateId);
    if (!labelTemplateEntity) {
      return toast({
        title: "Error",
        description: "No labelTemplateEntity is selected!",
        variant: "destructive"
      });
    }

    if (!labelTemplateEntity.labels.find(field => field.label === category)) {
      return toast({
        title: "Error",
        description: `category: "${category}" is not part of the template`,
        variant: "destructive"
      });
    }

    // we set the ground truth value of the cluster unit ground truth
    setClusterUnits(
      produce((draft) => {
        const unit = draft.find(u => u.id === clusterUnitEntityId);
        if (unit && unit.ground_truth && unit.ground_truth[labelTemplateId] && unit.ground_truth[labelTemplateId].values[category]) {
          unit.ground_truth[labelTemplateId].values[category].value = newValue;
        }
      })
    );
  };

  useEffect(() => {
    async function loadLabelTemplates() {
      if (labelTemplateIds.length === 0) return;

      try {
        setIsLoading(true);
        console.log('Fetching label template entities for IDs:', labelTemplateIds);

        // Fetch all label templates in parallel
        const templates = await Promise.all(
          labelTemplateIds.map(id => labelTemplateApi.getLabelTemplateById(authFetch, id))
        );

        setLabelTemplateEntities(templates);
      } catch (error) {
        console.error('Error fetching label_templates', error);
        toast({
          title: "Error",
          description: "Failed to load label templates",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadLabelTemplates();
  }, [labelTemplateIds, authFetch, toast])

  // Navigation handlers
  const handlePrevious = () => {
    if (!clusterUnits || currentUnitIndex <= 0) return;
    
    const newIndex = currentUnitIndex - 1 
    setCurrentUnitIndex(newIndex)

    const prevUnit = clusterUnits[newIndex];
    const params = new URLSearchParams();
    params.set('scraper_cluster_id', scraperClusterId!);
    params.set('cluster_unit_entity_id', prevUnit.id);
    setCurrentClusterUnit(prevUnit)

    // router.push(`${basePath}?${params.toString()}`);
  };

  const handleNext = () => {
    if (!clusterUnits || currentUnitIndex >= clusterUnits.length - 1) return;
    const newIndex = currentUnitIndex + 1
    const nextUnit = clusterUnits[newIndex];
    setCurrentUnitIndex(newIndex)
    const params = new URLSearchParams();
    params.set('scraper_cluster_id', scraperClusterId!);
    params.set('cluster_unit_entity_id', nextUnit.id);
    setCurrentClusterUnit(nextUnit)

    // router.push(`${basePath}?${params.toString()}`);
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

  if (labelTemplateIds.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">You must supply Label Template ID(s)!</h2>
            <p className="text-yellow-600">No label template IDs found in URL </p>
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
          currentSample={currentUnitIndex + 1}
          totalSamples={totalClusterUnits}
          onPrevious={handlePrevious}
          onNext={handleNext}
          disablePrevious={currentUnitIndex <= 0}
          disableNext={currentUnitIndex >= totalClusterUnits - 1}
          className="mb-6"
        />

        {/* Thread Context */}
        <ThreadFromUnit currentUnit={currentClusterUnit} />

        {/* Label Comparison Tables - One for each template */}
        {allTemplateData.map(({ template, data }, index) => (
          <div key={template.id} className="mb-6">
            {allTemplateData.length > 1 && (
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {template.label_template_name}
              </h2>
            )}
            <LabelTable
              models={data.models}
              labels={data.labels}
              stats={data.stats}
              cluster_unit_id={currentClusterUnit.id}
              labelTemplateId={template.id}
              handleClusterUnitGroundTruthUpdate={(clusterId, category, value) =>
                handleClusterUnitGroundTruthUpdate(clusterId, template.id, category, value)
              }
            />
            {index === allTemplateData.length - 1 && (
              <div className="mt-3 text-sm text-gray-600">
                💬 = Click to view reasoning | ⚠️ = Inconsistent across runs | ✓ = All runs match
              </div>
            )}
          </div>
        ))}

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
          
          <Button variant="primary" onClick={handleNext} disabled={currentUnitIndex >= totalClusterUnits - 1}>
            Next Sample →
          </Button>
          {currentUnitIndex >= totalClusterUnits - 1 &&
            <Button variant="primary" onClick={handleCompleteSampleLabeling} >
              Complete Labeling
            </Button>
          }

        </div>
      </div>
    </div>
  );
}

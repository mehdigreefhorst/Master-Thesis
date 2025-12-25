'use client'

import { LabelTemplateEntity } from "@/types/label-template";
import { useEffect, useRef, useState } from "react";
import ViewerTitle from "./ViewerTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewerSkeleton } from "../ui/Skeleton";
import { ClusterUnitEntity, ExperimentAllPredictedData, GetSampleUnitsLabelingFormatResponse } from "@/types/cluster-unit";
import { ViewerContentClassify } from "./ViewerContentClassify";
import { clusterApi, experimentApi } from "@/lib/api";
import { useAuthFetch } from "@/utils/fetch";
import { useToast } from "@/hooks/use-toast";
import { produce } from "immer";


export default function ViewerPage(){
  const authFetch = useAuthFetch()
  const router = useRouter()
  const { toast } = useToast()

  const [currentLabelTemplateEntity, setCurrentLabelTemplateEntity] = useState<LabelTemplateEntity | null>(null);
  const [currentClusterUnitExperimentData, setCurrentClusterUnitExperimentData] = useState<ExperimentAllPredictedData | null>(null);
  const [sampleUnitsLabelingFormatResponse, setSampleUnitsLabelingFormatResponse] = useState<GetSampleUnitsLabelingFormatResponse | null>(null)
  const [isLastClusterUnitEntity, setIsLastClusterUnitEntity] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  // Get unique prompt IDs (models)
  // const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);
  const [totalClusterUnits, setTotalClusterUnits] = useState<number>(0);

  // Track what we've already fetched to prevent duplicate requests
  const fetchedRef = useRef<string | null>(null);
  
  const getClusterUnitExperimentData = (index: number) => {
    if (!sampleUnitsLabelingFormatResponse) return null

    return sampleUnitsLabelingFormatResponse.experiment_unit_data[index]
  }
  useEffect(() => {
    async function loadClusterUnits() {
      if (!scraperClusterId) return;
      if (!currentLabelTemplateEntity) return;

      // Create a unique key for this fetch
      const fetchKey = `${scraperClusterId}`;

      // Skip if we've already fetched this data
      if (fetchedRef.current === fetchKey) {
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching sample cluster units for scraper cluster:', scraperClusterId);

        const sampleUnitsLabelingFormatResponseAPI: GetSampleUnitsLabelingFormatResponse = await experimentApi.getSampleUnitsLabelingFormat(authFetch, scraperClusterId, currentLabelTemplateEntity.id);
        console.log('Sample cluster units response:', sampleUnitsLabelingFormatResponseAPI);
        setSampleUnitsLabelingFormatResponse(sampleUnitsLabelingFormatResponseAPI)
        

        //setClusterUnits(cluster_unit_entities);
        setCurrentClusterUnitExperimentData(sampleUnitsLabelingFormatResponseAPI.experiment_unit_data[0])
        setTotalClusterUnits(sampleUnitsLabelingFormatResponseAPI.experiment_unit_data.length)
        fetchedRef.current = fetchKey; // Mark as fetched
      } catch (error) {
        console.error('Error fetching cluster units:', error);
        toast({
          title: "Error",
          description: `Failed to load cluster units = error: ${error}`,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadClusterUnits();
  }, [scraperClusterId, currentLabelTemplateEntity, authFetch])

  const handleChangeCurrentLabelTemplateEntity = async (labelTemplateEntity: LabelTemplateEntity | null) => {
    if (!scraperClusterId) return;

    try {
      setIsLoading(true);
      let sampleUnitsLabelingFormatResponseAPI: GetSampleUnitsLabelingFormatResponse | null = null;
      let totalClusterUnits: number = 0;
      let currentClusterUnit: ExperimentAllPredictedData | null = null;

      if (!labelTemplateEntity) {
        sampleUnitsLabelingFormatResponseAPI = null;
      } else {
        sampleUnitsLabelingFormatResponseAPI = await experimentApi.getSampleUnitsLabelingFormat(
          authFetch,
          scraperClusterId,
          labelTemplateEntity.id
        );
        currentClusterUnit = sampleUnitsLabelingFormatResponseAPI.experiment_unit_data[0];
        totalClusterUnits = sampleUnitsLabelingFormatResponseAPI.experiment_unit_data.length;
      }

      console.log('Sample cluster units response:', sampleUnitsLabelingFormatResponseAPI);

      // Update all state together
      setSampleUnitsLabelingFormatResponse(sampleUnitsLabelingFormatResponseAPI);
      setCurrentClusterUnitExperimentData(currentClusterUnit);
      setTotalClusterUnits(totalClusterUnits);
      setCurrentLabelTemplateEntity(labelTemplateEntity);

      toast({
        title: "Success",
        description: `Switched to label template: ${labelTemplateEntity?.label_template_name || 'None'}`,
        variant: "success"
      });
    } catch (error) {
      console.error('Error changing label template:', error);
      toast({
        title: "Error",
        description: `Failed to load label template data: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Navigation handlers
    const handlePrevious = () => {
      if (!sampleUnitsLabelingFormatResponse || currentUnitIndex <= 0) return;
      
      const newIndex = currentUnitIndex - 1 
      setCurrentUnitIndex(newIndex)

      
  
      const prevUnit = getClusterUnitExperimentData(newIndex);
      if (!prevUnit) return null
      const params = new URLSearchParams();
      params.set('scraper_cluster_id', scraperClusterId!);
      params.set('cluster_unit_entity_id', prevUnit.cluster_unit_enity.id);
      setCurrentClusterUnitExperimentData(prevUnit)
  
      setIsLastClusterUnitEntity(currentUnitIndex >= totalClusterUnits)
  
      // router.push(`${basePath}?${params.toString()}`);
    };
  
    const handleNext = () => {
      if (!sampleUnitsLabelingFormatResponse || currentUnitIndex >= sampleUnitsLabelingFormatResponse.experiment_unit_data.length - 1) return;
      const newIndex = currentUnitIndex + 1
      const nextUnit = getClusterUnitExperimentData(newIndex);
      if (!nextUnit) return null
      setCurrentUnitIndex(newIndex)
      const params = new URLSearchParams();
      params.set('scraper_cluster_id', scraperClusterId!);
      params.set('cluster_unit_entity_id', nextUnit.cluster_unit_enity.id);
      setCurrentClusterUnitExperimentData(nextUnit)
  
      setIsLastClusterUnitEntity(currentUnitIndex >= totalClusterUnits-2)
  
      // router.push(`${basePath}?${params.toString()}`);
    };

  const handleCompleteSampleLabeling = async () => {
    if (!scraperClusterId || !currentLabelTemplateEntity) return;
    await experimentApi.completeSampleLabeledStatus(
      authFetch,
      scraperClusterId,
      currentLabelTemplateEntity.id

    )
    router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`)
      }

  // Loading state

  const handleUpdateGroundTruth = (
    category: string,
    newValue: boolean | string | number
  ) => {
    if (!currentClusterUnitExperimentData) {
      return toast({
        title: "Error",
        description: "No clusterUnitEntity or clusterUnitEntityId is selected!",
        variant: "destructive"
      });
    }

    if (!sampleUnitsLabelingFormatResponse) {
      return toast({
        title: "Error",
        description: "No sampleUnitsLabelingFormatResponse loaded!!",
        variant: "destructive"
      });
    }


    if (!currentLabelTemplateEntity) {
      return toast({
        title: "Error",
        description: "No labelTemplateEntity is selected!",
        variant: "destructive"
      });
    }

    if (!currentLabelTemplateEntity.labels.find(field => field.label === category)) {
      return toast({
        title: "Error",
        description: `category: "${category}" is not part of the template`,
        variant: "destructive"
      });
    }

    const clusterUnitToChange = currentClusterUnitExperimentData
    const clusterUnitToChangeIndex = currentUnitIndex
    const labelTemplateEntitySelected = currentLabelTemplateEntity
    
    try {
      clusterApi.updateClusterUnitGroundTruth(authFetch, clusterUnitToChange.cluster_unit_enity.id, labelTemplateEntitySelected.id, category, newValue)
      setSampleUnitsLabelingFormatResponse(
        produce((draft) => {
           if (!draft) {return }
           const unitExperiment = draft.experiment_unit_data[clusterUnitToChangeIndex]
           const labelExperiments = unitExperiment.label_name_predicted_data.find(labelExperiment => labelExperiment.label_name == category)
            const unit = unitExperiment.cluster_unit_enity
           if (unit?.ground_truth && unit.ground_truth[labelTemplateEntitySelected.id] && unit.ground_truth[labelTemplateEntitySelected.id].values[category]) {
            unit.ground_truth[labelTemplateEntitySelected.id].values[category].value = newValue;
          }
          if (labelExperiments) {
            labelExperiments.ground_truth = newValue
          }
        })
      );
    } catch (error) {
        console.error('Error updating ground truth:', error);
        toast({
          title: "Error",
          description: `Failed to update the cluster unit = error: ${error}`,
          variant: "destructive"
        });
      } 
    
    // we set the ground truth value of the cluster unit ground truth
    
    
  };
  

  if (!scraperClusterId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          No scraper cluster ID provided. Please navigate from the experiments page with ?scraper_cluster_id=XXX
        </p>
      </div>
    );
  }
  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-7xl mx-auto">
        <ViewerTitle
          scraperClusterId={scraperClusterId}
          setIsLoading={setIsLoading}
          currentUnitIndex={currentUnitIndex}
          totalClusterUnits={totalClusterUnits}
          currentLabelTemplateEntity={currentLabelTemplateEntity}
          handlePrevious={handlePrevious}
          handleNext={handleNext}
          setCurrentLabelTemplateEntity={handleChangeCurrentLabelTemplateEntity}
          setIsLastClusterUnitEntity={setIsLastClusterUnitEntity}

        />
        {isLoading ?
        <ViewerSkeleton />
      
        : <ViewerContentClassify
            scraperClusterId={scraperClusterId}
            labelTemplateEntity={currentLabelTemplateEntity}
            clusterUnitEntityExperimentData={currentClusterUnitExperimentData}
            allExperimentsModelInformation={sampleUnitsLabelingFormatResponse?.all_experiments_model_information}
            isLastClusterUnitEntity={isLastClusterUnitEntity}
            handleUpdateGroundTruth={handleUpdateGroundTruth}
            labelsPossibleValues={sampleUnitsLabelingFormatResponse?.labels_possible_values}
            handleCompleteSampleLabeling={handleCompleteSampleLabeling}
            handleNext={handleNext}
            setIsLoading={setIsLoading}
            isLoading={isLoading}

          
        />}

      </div>
    </div>
  )
}
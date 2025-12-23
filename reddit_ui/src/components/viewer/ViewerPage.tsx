'use client'

import { LabelTemplateEntity } from "@/types/label-template";
import { useEffect, useRef, useState } from "react";
import ViewerTitle from "./ViewerTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewerSkeleton } from "../ui/Skeleton";
import { ClusterUnitEntity } from "@/types/cluster-unit";
import { ViewerContent } from "./ViewerContent";
import { clusterApi, experimentApi } from "@/lib/api";
import { useAuthFetch } from "@/utils/fetch";
import { useToast } from "@/hooks/use-toast";
import { produce } from "immer";


export default function ViewerPage(){
  const authFetch = useAuthFetch()
  const router = useRouter()
  const { toast } = useToast()

  const [currentLabelTemplateEntity, setCurrentLabelTemplateEntity] = useState<LabelTemplateEntity | null>(null);
  const [currentClusterUnit, setCurrentClusterUnit] = useState<ClusterUnitEntity>();
  const [isLastClusterUnitEntity, setIsLastClusterUnitEntity] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  // Get unique prompt IDs (models)
  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);
  const [totalClusterUnits, setTotalClusterUnits] = useState<number>(0);

  // Track what we've already fetched to prevent duplicate requests
  const fetchedRef = useRef<string | null>(null);
    
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

        const cluster_unit_entities = await experimentApi.getSampleUnits(authFetch, scraperClusterId, "classify_cluster_units", currentLabelTemplateEntity.id);
        console.log('Sample cluster units response:', cluster_unit_entities);

        setClusterUnits(cluster_unit_entities);
        setCurrentClusterUnit(cluster_unit_entities[0])
        setTotalClusterUnits(cluster_unit_entities.length)
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
  
      setIsLastClusterUnitEntity(currentUnitIndex >= totalClusterUnits)
  
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
    newValue: boolean | string
  ) => {
    if (!currentClusterUnit) {
      return toast({
        title: "Error",
        description: "No clusterUnitEntity or clusterUnitEntityId is selected!",
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
    
    try {
      clusterApi.updateClusterUnitGroundTruth(authFetch, currentClusterUnit.id, currentLabelTemplateEntity.id, category, newValue)
      setClusterUnits(
        produce((draft) => {
          const unit = draft.find(u => u.id === currentClusterUnit.id);
          if (unit && unit.ground_truth && unit.ground_truth[currentLabelTemplateEntity.id] && unit.ground_truth[currentLabelTemplateEntity.id].values[category]) {
            unit.ground_truth[currentLabelTemplateEntity.id].values[category].value = newValue;
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
          setCurrentClusterUnit={setCurrentClusterUnit}
          currentUnitIndex={currentUnitIndex}
          totalClusterUnits={totalClusterUnits}
          currentLabelTemplateEntity={currentLabelTemplateEntity}
          handlePrevious={handlePrevious}
          handleNext={handleNext}
          setCurrentLabelTemplateEntity={setCurrentLabelTemplateEntity}
          setIsLastClusterUnitEntity={setIsLastClusterUnitEntity}

        />
        {isLoading ?
        <ViewerSkeleton />
      
        : <ViewerContent
            scraperClusterId={scraperClusterId}
            labelTemplateEntity={currentLabelTemplateEntity}
            clusterUnitEntity={currentClusterUnit}
            isLastClusterUnitEntity={isLastClusterUnitEntity}
            handleUpdateGroundTruth={handleUpdateGroundTruth}
            handleCompleteSampleLabeling={handleCompleteSampleLabeling}
            setIsLoading={setIsLoading}
            isLoading={isLoading}

          
        />}

      </div>
    </div>
  )
}
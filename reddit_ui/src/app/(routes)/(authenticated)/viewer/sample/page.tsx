'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewerContent } from '@/components/viewer/ViewerContent';
import type { ClusterUnitEntity, ClusterUnitEntityCategory } from '@/types/cluster-unit';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi } from '@/lib/api';
import { SampleEntity } from '@/types/sample';
import { PromptEntity } from '@/types/prompt';
import { toast } from '@/components/ui/use-toast';

export default function SampleViewerPage() {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  const [promptsNameExperimentIdDict, setPromptsNameExperimentIdDict] = useState<Record<string, { promptId: string; promptName: string }>>({})
  const [totalClusterUnits, setTotalClusterUnits] = useState<number>(0);
  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);
  const [currentClusterUnit, setCurrentClusterUnit] = useState<ClusterUnitEntity>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  const router = useRouter();
  const basePath = "/viewer/sample";

  // Get URL parameters
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const clusterUnitEntityId = searchParams.get('cluster_unit_entity_id');

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

  // Fetch prompts on mount
  useEffect(() => {
    async function fetchPrompts() {
      if (!scraperClusterId) {
        return toast({
          "variant": "destructive",
          "title": "Missing scraperClusterId",
          "text": "too bad"
        })
      }
      try {
        setIsLoadingPrompts(true)
        const prompts = await experimentApi.getPrompts(authFetch);
        const experiments: any = await experimentApi.getExperiments(authFetch, scraperClusterId)
        console.log("experiments = ", experiments)
        // Step 1: Create quick lookup from promptId → promptName
        const promptLookup: Record<string, string> = {};
        prompts.forEach(p => {
            promptLookup[p.id] = p.name;
        });
        console.log("promptLookup. - ", promptLookup)
        // Step 2: Build your final record
        const promptsNameExperimentIdDictTemp: Record<string, { promptId: string; promptName: string }> = {};
        
        experiments.forEach((exp: { prompt_id: any; id: string | number; }) => {
            const promptId = exp.prompt_id; // adjust if field name differs
            console.log("promptId = ", promptId)
            promptsNameExperimentIdDictTemp[exp.id] = {
                promptId,
                promptName: promptLookup[promptId] ?? "Unknown"
            };
        });
        console.log("promptsNameExperimentIdDict = ", promptsNameExperimentIdDictTemp)

        setPromptsNameExperimentIdDict(promptsNameExperimentIdDictTemp)

        setPrompts(prompts);
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    fetchPrompts();
  }, [authFetch]);


   const handleClusterUnitGroundTruthUpdate =(clusterUnitEntityId: string, category: keyof ClusterUnitEntityCategory, newValue: boolean) => {
    if (!clusterUnits || !clusterUnitEntityId) return;
    console.log("clusterUnits = ", clusterUnits)

      setClusterUnits((prev) => {
        if (!prev) return prev;

        return prev.map((unit) => {
          if (unit.id === clusterUnitEntityId && unit.ground_truth) {
            return {
              ...unit,
              ground_truth: {
                ...unit.ground_truth,
                [category]: newValue,
              },
            };
          }
          return unit;
        });
      });
  }

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

    const handleCompleteSampleLabeling = async () => {
      if (!scraperClusterId) return;
      await experimentApi.completeSampleLabeledStatus(
        authFetch,
        scraperClusterId,
      )
      router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`)
    }


  

  return (
    <>
    {currentClusterUnit  && 
    <ViewerContent
      scraperClusterId={scraperClusterId}
      currentClusterUnit={currentClusterUnit}
      clusterUnitIndex={currentUnitIndex}
      totalClusterUnits={totalClusterUnits}
      handleClusterUnitGroundTruthUpdate={handleClusterUnitGroundTruthUpdate}
      handleCompleteSampleLabeling={handleCompleteSampleLabeling}
      promptsNameExperimentIdDict={promptsNameExperimentIdDict}
      handleNext={handleNext}
      handlePrevious={handlePrevious}
      basePath="/viewer/sample"
      isLoading={isLoading}
    /> }
     
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ViewerContent } from '@/components/viewer/ViewerContent';
import { clusterApi, experimentApi } from '@/lib/api';
import type { ClusterUnitEntity, ClusterUnitEntityCategory } from '@/types/cluster-unit';
import { useAuthFetch } from '@/utils/fetch';
import { PromptEntity } from '@/types/prompt';

export default function ViewerPageContent() {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([])
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  
  const [promptsNameExperimentIdDict, setPromptsNameExperimentIdDict] = useState<Record<string, { promptId: string; promptName: string }>>({})

  const [isLoading, setIsLoading] = useState(true);

  // Get URL parameters
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const clusterUnitEntityId = searchParams.get('cluster_unit_entity_id');

  // Track what we've already fetched to prevent duplicate requests
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadClusterUnits() {
      if (!scraperClusterId) return;

      // Skip if we've already fetched this data
      if (fetchedRef.current === scraperClusterId) {
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching cluster units for scraper cluster:', scraperClusterId);

        const cluster_unit_entities = await clusterApi.getClusterUnits(authFetch, scraperClusterId);
        console.log('Cluster units response:', cluster_unit_entities);

        setClusterUnits(cluster_unit_entities);
        fetchedRef.current = scraperClusterId; // Mark as fetched
      } catch (error) {
        console.error('Error fetching cluster units:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadClusterUnits();
  }, [scraperClusterId, authFetch])

  const handleClusterUnitGroundTruthUpdate =(clusterUnitEntityId: string, category: keyof ClusterUnitEntityCategory, newValue: boolean) => {
      if (!clusterUnits || !clusterUnitEntityId) return;

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
        setIsLoading(true)
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
        console.log("promptsNameExperimentIdDictTemp = ", promptsNameExperimentIdDictTemp)
        setPromptsNameExperimentIdDict(promptsNameExperimentIdDictTemp)

        setPrompts(prompts);
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrompts();
  }, [authFetch]);

  return (
    <ViewerContent
      scraperClusterId={scraperClusterId}
      promptsNameExperimentIdDict={promptsNameExperimentIdDict}
      clusterUnitEntityId={clusterUnitEntityId}
      clusterUnits={clusterUnits}
      handleClusterUnitGroundTruthUpdate={handleClusterUnitGroundTruthUpdate}
      basePath="/viewer"
      isLoading={isLoading}
    />
  );
}


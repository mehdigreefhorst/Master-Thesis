'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ViewerContent } from '@/components/viewer/ViewerContent';
import { clusterApi, experimentApi } from '@/lib/api';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { useAuthFetch } from '@/utils/fetch';
import { PromptEntity } from '@/types/prompt';
import { useToast } from '@/components/ui/use-toast';
import { produce } from 'immer';
import { LabelTemplateEntity } from '@/types/label-template';

export default function ViewerPageContent() {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const [labelTemplateEntity, setLabelTemplateEntity] = useState<LabelTemplateEntity | null>(null);

  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([])
  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  
  const [promptsNameExperimentIdDict, setPromptsNameExperimentIdDict] = useState<Record<string, { promptId: string; promptName: string; modelId: string }>>({})

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
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to fetch cluster units',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadClusterUnits();
  }, [scraperClusterId, authFetch])

  const handleClusterUnitGroundTruthUpdate =(clusterUnitEntityId: string, category: string, newValue: boolean) => {
    if (!clusterUnits || !clusterUnitEntityId) {
      return toast({
        title: "Error",
        description: "No clusterUnitEntity or clusterUnitEntityId is selected!",
        variant: "destructive"
      });
    }

    if (!labelTemplateEntity) {
      return toast({
        title: "Error",
        description: "No labelTemplateEntity is selected!",
        variant: "destructive"
      });
    }
    if (!labelTemplateEntity.labels.find(field=> field.label === category)){
        return toast({
          title: "Error",
          description: `category: "${category}" is not part of ${labelTemplateEntity.labels}`,
          variant: "destructive"
      });
    }
    // we set the ground truth value of the cluster unit ground truth :TODO currently only works with booleans
    setClusterUnits(
      produce((draft) => {
        const unit = draft.find(u=> u.id === clusterUnitEntityId);
        if (unit && unit.ground_truth && unit.ground_truth[labelTemplateEntity.id] && unit.ground_truth[labelTemplateEntity.id].values[category]) {
          unit.ground_truth[labelTemplateEntity.id].values[category].value = newValue
        }
        })
    );
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
        const experiments: any = await experimentApi.getExperiments(authFetch, scraperClusterId, undefined, undefined, "classify_cluster_units")
        console.log("experiments = ", experiments)
        // Step 1: Create quick lookup from promptId → promptName
        const promptLookup: Record<string, string> = {};
        prompts.forEach(p => {
            promptLookup[p.id] = p.name;
        });
        console.log("promptLookup. - ", promptLookup)
        // Step 2: Build your final record
        const promptsNameExperimentIdDictTemp: Record<string, { promptId: string; promptName: string; modelId: string }> = {};
        
        experiments.forEach((exp: { prompt_id: any; id: string | number; model: string }) => {
            const promptId = exp.prompt_id; // adjust if field name differs
            console.log("promptId = ", promptId)
            promptsNameExperimentIdDictTemp[exp.id] = {
                promptId,
                promptName: promptLookup[promptId] ?? "Unknown",
                modelId: exp.model
            };
        });
        console.log("promptsNameExperimentIdDictTemp = ", promptsNameExperimentIdDictTemp)
        setPromptsNameExperimentIdDict(promptsNameExperimentIdDictTemp)

        setPrompts(prompts);
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to fetch prompts and experiments',
          variant: "destructive"
        });
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


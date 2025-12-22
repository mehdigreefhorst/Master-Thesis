'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewerContent } from '@/components/viewer/ViewerContent';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, labelTemplateApi } from '@/lib/api';
import { PromptEntity } from '@/types/prompt';
import { useToast } from '@/components/ui/use-toast';


export default function SampleViewerPage() {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { toast } = useToast();


  const [prompts, setPrompts] = useState<PromptEntity[]>([]);
  const [promptsNameExperimentIdDict, setPromptsNameExperimentIdDict] = useState<Record<string, { promptId: string; promptName: string; modelId: string }>>({})
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  const router = useRouter();
  const basePath = "/viewer/sample";

  // Get URL parameters
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const clusterUnitEntityId = searchParams.get('cluster_unit_entity_id');

  

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
        
        experiments.forEach((exp: { prompt_id: any; id: string | number; model: string}) => {
            const promptId = exp.prompt_id; // adjust if field name differs
            console.log("promptId = ", promptId)
            promptsNameExperimentIdDictTemp[exp.id] = {
                promptId,
                promptName: promptLookup[promptId] ?? "Unknown",
                modelId: exp.model
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
    
    <ViewerContent
      scraperClusterId={scraperClusterId}
      handleCompleteSampleLabeling={handleCompleteSampleLabeling}
      promptsNameExperimentIdDict={promptsNameExperimentIdDict}
      basePath="/viewer/sample"
      setIsLoading={setIsLoading}
      isLoading={isLoading}
    /> 
     
    </>
  );
}

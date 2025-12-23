'use client'
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../layout";
import { ClusterUnitEntity } from "@/types/cluster-unit";
import { useAuthFetch } from "@/utils/fetch";
import { experimentApi, labelTemplateApi } from "@/lib/api";
import { LabelTemplateEntity } from "@/types/label-template";
import { BaseSelector, Button } from "../ui";
import { ExperimentSelector } from "../filtering/ExperimentSelector";
import { LabelTemplateSelector } from "../experiment-create/LabelTemplateSelector";
import { SimpleSelector, SimpleSelectorItem } from "../common/SimpleSelector";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";



export interface ViewerTitleProps{
  scraperClusterId: string;
  setIsLoading: (isLoading: boolean) => void;
  setCurrentClusterUnit: (clusterUnitEntity: ClusterUnitEntity) => void;
  currentUnitIndex: number;
  totalClusterUnits: number
  handleNext: () => void;
  handlePrevious: () => void;
  currentLabelTemplateEntity: LabelTemplateEntity | null;
  setCurrentLabelTemplateEntity: (labelTemplateEntity: LabelTemplateEntity) => void;
  setIsLastClusterUnitEntity: (isLast: boolean) => void;
}
export default function ViewerTitle (
  {scraperClusterId,
    setIsLoading,
    setCurrentClusterUnit,
    currentUnitIndex,
    totalClusterUnits,
    handleNext,
    handlePrevious,
    currentLabelTemplateEntity,
    setCurrentLabelTemplateEntity,
    setIsLastClusterUnitEntity
  }:ViewerTitleProps
) {

  const router = useRouter()
  
  const authFetch = useAuthFetch();
  const { toast } = useToast()

  
  
  
  const searchParams = useSearchParams();
  
  const labelTemplateIdsParam = searchParams.get('label_template_ids');

  if (!labelTemplateIdsParam) {
      return (
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg  p-6">
              <Button onClick={() => router.back()} variant="secondary" size="xl" className="w-full h-48 text-4xl">
                {"← Go Back"}
              </Button>
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">You must supply Label Template ID(s)!</h2>
              <p className="text-yellow-600">No label template IDs found in URL </p>
            </div>
          </div>
        </div>
      );
    }

  const labelTemplateIds = useMemo(() => {
      if (labelTemplateIdsParam) {
        return labelTemplateIdsParam.split(',').filter(id => id.trim());
      } 
      return [];
    }, [labelTemplateIdsParam]);
  
  

  


  const handleSelectLabelTemplateId = async (item: SimpleSelectorItem) => {
    try {
      setIsLoading(true)
      const labelTemplateEntity = await labelTemplateApi.getLabelTemplateById(authFetch, item.id)
      setCurrentLabelTemplateEntity(labelTemplateEntity)
    } catch (error) {
        console.error('Error fetching label_templates', error);
        toast({
          title: "Error",
          description: `Failed to load label template = error: ${error}`,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      } 
    

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
        const promptsNameExperimentIdDictTemp: Record<string, { promptId: string; promptName: string; modelId: string; labelTemplateId: string }> = {};
        
        experiments.forEach((exp: { prompt_id: any; id: string | number; model: string, label_template_id: string;}) => {
            const promptId = exp.prompt_id; // adjust if field name differs
            console.log("promptId = ", promptId)
            promptsNameExperimentIdDictTemp[exp.id] = {
                promptId,
                promptName: promptLookup[promptId] ?? "Unknown",
                modelId: exp.model,
                labelTemplateId: exp.label_template_id
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
  

  

  return (
    <PageHeader
      title="Label Accuracy Viewer" 
      currentSample={currentUnitIndex + 1}
      totalSamples={totalClusterUnits}
      onPrevious={handlePrevious}
      onNext={handleNext}
      disablePrevious={currentUnitIndex <= 0}
      disableNext={currentUnitIndex >= totalClusterUnits - 1}
      menuItem={
        <SimpleSelector 
          items={labelTemplateIds}
          selectedItemId={currentLabelTemplateEntity?.id}
          onSelect={handleSelectLabelTemplateId}/>}
      className="mb-6"
    />
  )
}
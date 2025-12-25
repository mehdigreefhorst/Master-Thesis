'use client'
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../layout";
import { useAuthFetch } from "@/utils/fetch";
import {  labelTemplateApi } from "@/lib/api";
import { LabelTemplateEntity } from "@/types/label-template";
import {  Button } from "../ui";

import { SimpleSelector, SimpleSelectorItem } from "../common/SimpleSelector";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";



export interface ViewerTitleProps{
  scraperClusterId: string;
  setIsLoading: (isLoading: boolean) => void;
  currentUnitIndex: number;
  totalClusterUnits: number
  handleNext: () => void;
  handlePrevious: () => void;
  currentLabelTemplateEntity: LabelTemplateEntity | null;
  setCurrentLabelTemplateEntity: (labelTemplateEntity: LabelTemplateEntity | null) => void;
  setIsLastClusterUnitEntity: (isLast: boolean) => void;
}
export default function ViewerTitle (
  {scraperClusterId,
    setIsLoading,
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

  const [labelTemplateEntities, setLabelTemplateEntities] = useState<LabelTemplateEntity[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(true);

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

  // Fetch label template entities when component mounts or IDs change
  useEffect(() => {
    async function fetchLabelTemplates() {
      if (labelTemplateIds.length === 0) return;

      try {
        setIsLoadingTemplates(true);
        // Fetch all label templates for the provided IDs
        const fetchedTemplates = await Promise.all(
          labelTemplateIds.map(id => labelTemplateApi.getLabelTemplateById(authFetch, id))
        );

        setLabelTemplateEntities(fetchedTemplates);

        // // Automatically select the first template if none is selected
        // if (!currentLabelTemplateEntity && fetchedTemplates.length > 0) {
        //   setCurrentLabelTemplateEntity(fetchedTemplates[0]);
        // }
      } catch (error) {
        console.error('Error fetching label templates:', error);
        toast({
          title: "Error",
          description: `Failed to load label templates: ${error}`,
          variant: "destructive"
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    fetchLabelTemplates();
  }, [labelTemplateIds, authFetch, toast]);

  // Convert label template entities to SimpleSelectorItems
  const labelTemplateSelectorItems: SimpleSelectorItem[] = useMemo(() => {
    return labelTemplateEntities.map(template => ({
      id: template.id,
      name: template.label_template_name,
      value: template
    }));
  }, [labelTemplateEntities]);

  const handleSelectLabelTemplateId = (item: SimpleSelectorItem) => {
    // Since we already have the entities loaded, just find and set it
    const selectedTemplate = labelTemplateEntities.find(t => t.id === item.id);
    if (selectedTemplate) {
      setCurrentLabelTemplateEntity(selectedTemplate);
    }
  }
  
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
          items={labelTemplateSelectorItems}
          selectedItemId={currentLabelTemplateEntity?.id}
          onSelect={handleSelectLabelTemplateId}
          onClear={() => setCurrentLabelTemplateEntity(null)}/>
          
          }
      className="mb-6"
    />
  )
}
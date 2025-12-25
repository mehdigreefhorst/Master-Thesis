'use client'
import { useMemo } from "react";
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
  setCurrentLabelTemplateEntity: (labelTemplateEntity: LabelTemplateEntity) => void;
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
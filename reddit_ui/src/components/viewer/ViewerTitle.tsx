'use client'
import { useMemo } from "react";
import { PageHeader } from "../layout";
import { LabelTemplateEntity } from "@/types/label-template";
import {  Button } from "../ui";

import { LabelTemplateSelector } from "../common/LabelTemplateSelector";
import { useRouter, useSearchParams } from "next/navigation";



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

  // Parse label template IDs from URL params
  const labelTemplateIds = useMemo(() => {
      if (labelTemplateIdsParam) {
        return labelTemplateIdsParam.split(',').filter(id => id.trim());
      }
      return [];
    }, [labelTemplateIdsParam]);
  
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
        <LabelTemplateSelector
          labelTemplateIds={labelTemplateIds}
          selectedLabelTemplateId={currentLabelTemplateEntity?.id}
          onSelect={setCurrentLabelTemplateEntity}
          autoSelectFirst={true}
          onLoadingChange={setIsLoading}
        />
      }
      className="mb-6"
    />
  )
}
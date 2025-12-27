'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';

import { HeaderStep } from '@/components/layout/HeaderStep';
import { SampleView } from '@/components/sample/SampleView';
import { ExperimentsSearchBarResults } from '@/components/experiments/experimentsSearchBarResults';
import { FilterExperimentType, PromptCategory } from '@/types/experiment';

function ExperimentsPageContent() {
  const searchParams = useSearchParams();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  const [canCreateExperiments, setCanCreateExperiments] = useState(false)
  
  let FilterExperimentType: FilterExperimentType = "classify_cluster_units"

  const isValidFilterExperimentType = (
    value: string | null
  ): value is Exclude<FilterExperimentType, null> => {
    return value !== null && [
      'classify_cluster_units',
      'rewrite_cluster_unit_standalone',
      'summarize_prediction_notes'
    ].includes(value);
  };

  const experimentTypeParam = searchParams.get("experiment_type");
  if (isValidFilterExperimentType(experimentTypeParam)) {
    FilterExperimentType = experimentTypeParam;
    console.log("FilterExperimentType = ", FilterExperimentType);
  }

  const [isLoading, setIsLoading] = useState(true);  

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-[95vw] mx-auto">
        {/* Page Header */}

        <HeaderStep 
          title='Experiments Dashboard'
          subtitle=''
        />
        <SampleView scraperClusterId={scraperClusterId ?? ""} setCanCreateExperiments={setCanCreateExperiments}/>
        
        
        <ExperimentsSearchBarResults scraperClusterId={scraperClusterId} isLoading={isLoading} setIsLoading={setIsLoading} canCreateExperiments={canCreateExperiments} defaultFilterExperimentType={FilterExperimentType} basePath='/experiments'/>

        

        
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-[95vw] mx-auto">
          <PageHeader title="Experiments Dashboard" className="mb-6" />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      
      <ExperimentsPageContent />
    </Suspense>
  );
}

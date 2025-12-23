'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewerContent } from '@/components/viewer/ViewerContent';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, labelTemplateApi } from '@/lib/api';
import { PromptEntity } from '@/types/prompt';
import { useToast } from '@/components/ui/use-toast';
import ViewerPage from '@/components/viewer/ViewerPage';


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

  

  

  


  

  return (
    <>
      <ViewerPage/>
      {/* <ViewerContent
        scraperClusterId={scraperClusterId}
        handleCompleteSampleLabeling={handleCompleteSampleLabeling}
        promptsNameExperimentIdDict={promptsNameExperimentIdDict}
        basePath="/viewer/sample"
        setIsLoading={setIsLoading}
        isLoading={isLoading}
      />  */}
     
    </>
  );
}

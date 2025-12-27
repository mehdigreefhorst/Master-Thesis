'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewerContentClassify } from '@/components/viewer/ViewerContentClassify';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, labelTemplateApi } from '@/lib/api';
import { PromptEntity } from '@/types/prompt';
import { useToast } from '@/components/ui/use-toast';
import ViewerPage from '@/components/viewer/ViewerPage';
import { PromptCategory } from '@/types/experiment';


export default function SampleViewerPage() {
  const searchParams = useSearchParams();
  let experimentType: PromptCategory = searchParams.get('experiment_type') as PromptCategory;
  if (!experimentType) {experimentType = "classify_cluster_units" as PromptCategory}
  return (
    <>
      <ViewerPage experimentType={experimentType} />
     
    </>
  );
}

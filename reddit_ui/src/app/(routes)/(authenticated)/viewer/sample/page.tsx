'use client';

import { useSearchParams } from 'next/navigation';

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

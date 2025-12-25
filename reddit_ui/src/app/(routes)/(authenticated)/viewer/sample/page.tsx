'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewerContentClassify } from '@/components/viewer/ViewerContentClassify';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi, labelTemplateApi } from '@/lib/api';
import { PromptEntity } from '@/types/prompt';
import { useToast } from '@/components/ui/use-toast';
import ViewerPage from '@/components/viewer/ViewerPage';


export default function SampleViewerPage() {

  return (
    <>
      <ViewerPage/>
     
    </>
  );
}

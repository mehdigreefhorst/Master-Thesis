'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ViewerContent } from '@/components/viewer/ViewerContent';
import { clusterApi } from '@/lib/api';
import type { ClusterUnitEntity, ClusterUnitEntityCategory } from '@/types/cluster-unit';
import { useAuthFetch } from '@/utils/fetch';

export default function ViewerPageContent() {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([])
  const [isLoading, setIsLoading] = useState(true);

  // Get URL parameters
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const clusterUnitEntityId = searchParams.get('cluster_unit_entity_id');

  // Track what we've already fetched to prevent duplicate requests
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadClusterUnits() {
      if (!scraperClusterId) return;

      // Skip if we've already fetched this data
      if (fetchedRef.current === scraperClusterId) {
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching cluster units for scraper cluster:', scraperClusterId);

        const cluster_unit_entities = await clusterApi.getClusterUnits(authFetch, scraperClusterId);
        console.log('Cluster units response:', cluster_unit_entities);

        setClusterUnits(cluster_unit_entities);
        fetchedRef.current = scraperClusterId; // Mark as fetched
      } catch (error) {
        console.error('Error fetching cluster units:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadClusterUnits();
  }, [scraperClusterId, authFetch])

  const handleClusterUnitGroundTruthUpdate =(clusterUnitEntityId: string, category: keyof ClusterUnitEntityCategory, newValue: boolean) => {
      if (!clusterUnits || !clusterUnitEntityId) return;

        setClusterUnits((prev) => {
          if (!prev) return prev;

          return prev.map((unit) => {
            if (unit.id === clusterUnitEntityId && unit.ground_truth) {
              return {
                ...unit,
                ground_truth: {
                  ...unit.ground_truth,
                  [category]: newValue,
                },
              };
            }
            return unit;
          });
        });
    }

  return (
    <ViewerContent
      scraperClusterId={scraperClusterId}
      clusterUnitEntityId={clusterUnitEntityId}
      clusterUnits={clusterUnits}
      handleClusterUnitGroundTruthUpdate={handleClusterUnitGroundTruthUpdate}
      basePath="/viewer"
      isLoading={isLoading}
    />
  );
}


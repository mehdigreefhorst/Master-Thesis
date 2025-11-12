'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { experimentApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { SampleEntity } from '@/types/sample';
import type { StatusType } from '@/types/scraper-cluster';

interface SampleViewProps {
  scraperClusterId?: string | null;
}

export const SampleView: React.FC<SampleViewProps> = React.memo(({
  scraperClusterId
}) => {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [sample, setSample] = useState<SampleEntity | null>(null);
  const [totalPostsAvailable, setTotalPostsAvailable] = useState<number>(0);
  const [clusterUnitsUsed, setClusterUnitsUsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sample data when scraperClusterId changes
  useEffect(() => {
    if (!scraperClusterId) {
      setSample(null);
      return;
    }

    const fetchSample = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First get the scraper cluster to find the sample_entity_id
       

        // Fetch the sample data
        const sample = await experimentApi.getSampleEntity(authFetch, scraperClusterId);
        
        if (!sample) {
          throw Error("no sample found!")
        }
        setSample(sample);
        setTotalPostsAvailable(sample.picked_post_cluster_unit_ids.length || 0);
        setClusterUnitsUsed(sample.sample_size   || 0);
      } catch (err) {
        console.error('Failed to fetch sample:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sample');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSample();
  }, [scraperClusterId, authFetch]);

  

  // Determine if sample can be labeled
  const canLabel = useMemo(() => {
    return sample && (sample.sample_labeled === 'initialized' || sample.sample_labeled === 'ongoing');
  }, [sample]);

  const handleViewSample = () => {
    if (sample && scraperClusterId) {
      router.push(`/sample/view?scraper_cluster_id=${scraperClusterId}&sample_id=${sample.id}`);
    }
  };

  const handleLabelSample = () => {
    if (sample && scraperClusterId) {
      router.push(`/sample/label?scraper_cluster_id=${scraperClusterId}&sample_id=${sample.id}`);
    }
  };

  // Don't render anything if no scraperClusterId
  if (!scraperClusterId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-600">Loading sample data...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 mb-6 bg-red-50 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-800 mb-1">Error Loading Sample</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // No sample state
  if (!sample) {
    return (
      <Card className="p-6 mb-6 bg-gray-50">
        <div className="text-center text-gray-600">
          <p className="font-medium">No sample created yet</p>
          <p className="text-sm mt-1">Create a sample to begin labeling</p>
        </div>
      </Card>
    );
  }

  // Sample data display
  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-xl font-bold text-gray-800">Sample Information</h3>
            <StatusBadge status={sample.sample_labeled as StatusType} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sample ID */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Sample ID</p>
              <p className="font-mono text-sm font-semibold text-gray-800 truncate" title={sample.id}>
                {sample.id}
              </p>
            </div>

            {/* Sample Size */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Sample Size</p>
              <p className="font-semibold text-gray-800">
                {clusterUnitsUsed} units
              </p>
              <p className="text-xs text-gray-500">
                combination of posts & comments
              </p>
            </div>

            {/* Posts Used */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Posts Sampled From</p>
              <p className="font-semibold text-gray-800">
                {sample.picked_post_cluster_unit_ids.length} posts
              </p>
              {totalPostsAvailable > 0 && (
                <p className="text-xs text-gray-500">
                  of {totalPostsAvailable} available
                </p>
              )}
            </div>

            {/* Labeling Status */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Labeling Status</p>
              <p className="font-semibold text-gray-800 capitalize">
                {sample.sample_labeled}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 ml-6">
          <Button
            variant="secondary"
            size="md"
            onClick={handleViewSample}
          >
            View Sample
          </Button>

          {canLabel && (
            <Button
              variant="primary"
              size="md"
              onClick={handleLabelSample}
            >
              Label Sample
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

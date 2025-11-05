'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScraperClusterTable } from '@/components/scraper/ScraperClusterTable';
import { useAuthFetch } from '@/utils/fetch';
import type { ScraperClusterEntity } from '@/types/scraper-cluster';

export default function OverviewPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [clusters, setClusters] = useState<ScraperClusterEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch scraper cluster instances
  useEffect(() => {
    async function fetchClusters() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await authFetch('/scraper_cluster/');
        const data: ScraperClusterEntity[] = await response.json();

        setClusters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scraper clusters');
      } finally {
        setIsLoading(false);
      }
    }

    fetchClusters();
  }, []);

  // Navigate to define page to create new research project
  const handleCreateNew = () => {
    router.push('/define');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader title="Scraper Cluster Instances" className="mb-6" />
          <Card className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6 animate-[fadeInDown_0.5s_ease-out]">
          <h1 className="text-4xl font-semibold">Scraper Cluster Instances</h1>
          <Button
            variant="primary"
            onClick={handleCreateNew}
            className="transform mt-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            + Create New Research Project
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 p-4 bg-red-50 border-red-200 animate-[slideIn_0.3s_ease-out]">
            <p className="text-red-600 text-sm">{error}</p>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mb-6 p-5 bg-blue-50 border-blue-200 animate-[fadeIn_0.6s_ease-out_0.2s_both]">
          <h3 className="font-semibold text-blue-900 mb-2">About Scraper Clusters</h3>
          <p className="text-sm text-blue-800">
            Scraper cluster instances allow you to manage different data collection and analysis workflows.
            Each instance goes through multiple stages from initialization to clustering. Click on a row to
            configure an instance, or create a new one to get started.
          </p>
        </Card>

        {/* Scraper Cluster Table */}
        <Card className="overflow-hidden animate-[fadeIn_0.7s_ease-out_0.3s_both] shadow-lg hover:shadow-xl transition-shadow duration-300">
          <ScraperClusterTable clusters={clusters} />
        </Card>

        {/* Stage Legend */}
        <Card className="mt-6 p-5 animate-[fadeIn_0.8s_ease-out_0.4s_both]">
          <h3 className="font-semibold mb-4 text-base">Stage Descriptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {[
              { name: 'Initialized', desc: 'Setup with all information to start', delay: '0.5s' },
              { name: 'Scraping', desc: 'Scraping data from Reddit', delay: '0.55s' },
              { name: 'Cluster Prep', desc: 'Converting to cluster units', delay: '0.6s' },
              { name: 'Cluster Filter', desc: 'Filtering with prompts on sample data', delay: '0.65s' },
              { name: 'Cluster Enrich', desc: 'Applying filtering and enrichment to all data', delay: '0.7s' },
              { name: 'Clustering', desc: 'Clustering of standalone text', delay: '0.75s' },
            ].map((stage) => (
              <div
                key={stage.name}
                className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:scale-102"
                style={{ animation: `fadeIn 0.5s ease-out ${stage.delay} both` }}
              >
                <span className="font-medium text-gray-900">{stage.name}:</span>{' '}
                <span className="text-gray-700">{stage.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
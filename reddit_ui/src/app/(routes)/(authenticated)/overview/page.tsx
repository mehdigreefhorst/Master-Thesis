'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BatteryProgressTable } from '@/components/scraper/BatteryProgressTable';
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
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with CTA */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 animate-[fadeInDown_0.5s_ease-out]">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 mb-1">
                🎯 Ready to explore new insights?
              </h1>
              <p className="text-sm text-gray-600">
                Create a new research project to discover patterns in Reddit discussions
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleCreateNew}
              className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg whitespace-nowrap ml-4"
            >
              + Create New Research Project
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 p-4 bg-red-50 border-red-200 animate-[slideIn_0.3s_ease-out]">
            <p className="text-red-600 text-sm">{error}</p>
          </Card>
        )}

        {/* Battery Progress Table */}
        <div className="animate-[fadeIn_0.6s_ease-out_0.2s_both]">
          <BatteryProgressTable clusters={clusters} />
        </div>

        {/* Color Legend */}
        <Card className="mt-6 p-5 animate-[fadeIn_0.7s_ease-out_0.3s_both]">
          <h3 className="font-semibold mb-4 text-base text-gray-800">Status Colors</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            {[
              { color: 'bg-gray-300', label: 'Initialized', desc: 'Not started yet' },
              { color: 'bg-blue-500', label: 'Ongoing', desc: 'Currently in progress' },
              { color: 'bg-pink-500', label: 'Paused', desc: 'Temporarily stopped' },
              { color: 'bg-green-500', label: 'Completed', desc: 'Successfully finished' },
              { color: 'bg-red-500', label: 'Error', desc: 'Failed or encountered issue' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-6 h-6 ${item.color} rounded border border-gray-400`}></div>
                <div>
                  <span className="font-medium text-gray-900">{item.label}</span>
                  <span className="text-gray-600"> - {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stage Descriptions */}
        <Card className="mt-6 p-5 animate-[fadeIn_0.8s_ease-out_0.4s_both]">
          <h3 className="font-semibold mb-4 text-base text-gray-800">Pipeline Stages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
            {[
              { name: 'Initialized', desc: 'Setup with all information to start' },
              { name: 'Scraping', desc: 'Scraping data from Reddit' },
              { name: 'Cluster Prep', desc: 'Converting to cluster units' },
              { name: 'Experiment', desc: 'Running experiments on sample data' },
              { name: 'Cluster Filter', desc: 'Filtering with prompts on sample data' },
              { name: 'Cluster Enrich', desc: 'Applying filtering and enrichment to all data' },
              { name: 'Clustering', desc: 'Clustering of standalone text' },
            ].map((stage, index) => (
              <div
                key={stage.name}
                className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 hover:scale-105"
                style={{ animation: `fadeIn 0.5s ease-out ${0.5 + index * 0.05}s both` }}
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
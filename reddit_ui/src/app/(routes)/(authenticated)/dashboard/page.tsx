'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthFetch } from '@/utils/fetch';
import type { ScraperClusterEntity, StatusType } from '@/types/scraper-cluster';
import { scraperApi, scraperClusterApi } from '@/lib/api';

interface StageData {
  name: string;
  key: keyof ScraperClusterEntity['stages'];
  status: StatusType;
  route: string;
  description: string;
  metrics: { label: string; value: string }[];
}

// Stage configuration
const stageConfig = {
  define: {
    name: 'DEFINE',
    route: '/define',
    description: 'Project configuration and setup',
  },
  scraping: {
    name: 'SCRAPING',
    route: '/scraping-progress',
    description: 'Collecting data from Reddit',
  },
  cluster_prep: {
    name: 'CLUSTER PREP & SAMPLE',
    route: '/sample',
    description: 'Converting to cluster units',
  },
  experiment: {
    name: 'EXPERIMENT',
    route: '/experiments',
    description: 'Testing prompts and models',
  },
  cluster_filter: {
    name: 'CLUSTER FILTER',
    route: '/filtering',
    description: 'Labeling and filtering samples',
  },
  cluster_enrich: {
    name: 'CLUSTER ENRICH',
    route: '/enrich',
    description: 'Applying filters to all data',
  },
  clustering: {
    name: 'CLUSTERING',
    route: '/clustering',
    description: 'Grouping similar content',
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  const [clusterData, setClusterData] = useState<ScraperClusterEntity | null>(null);
  const [scraperData, setScraperData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cluster data and scraper data
  useEffect(() => {
    async function fetchClusterData() {
      if (!scraperClusterId) {
        setError('No scraper cluster ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch all clusters and find the one matching the ID
        const scraperCluster = await scraperClusterApi.getScraperClusterById(authFetch, scraperClusterId)

        if (!scraperCluster) {
          setError('Scraper cluster not found');
          return;
        }

        setClusterData(scraperCluster);

        // Fetch scraper data if scraper_entity_id exists
        if (scraperCluster.scraper_entity_id) {
          try {
            const scraper = await scraperApi.getScraperByScraperClusterId(authFetch, scraperCluster.id)
            if (scraper) {
              setScraperData(scraper);
            }
          } catch (scraperErr) {
            console.error('Failed to fetch scraper data:', scraperErr);
            // Don't fail the entire page if scraper fetch fails
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cluster data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchClusterData();
  }, [scraperClusterId]);

  // Generate stage metrics based on actual data
  const getStageMetrics = (stageKey: keyof ScraperClusterEntity['stages']): { label: string; value: string }[] => {
    if (!clusterData) return [];

    const status = clusterData.stages[stageKey];

    // Base metrics based on stage
    switch (stageKey) {
      case 'define':
        const metrics = [
          { label: 'Problem', value: clusterData.problem_exporation_description || 'Not set' },
          { label: 'Target Audience', value: clusterData.target_audience || 'Not set' },
        ];

        if (scraperData) {
          // Add keywords
          if (scraperData.keywords && scraperData.keywords.length > 0) {
            metrics.push({
              label: 'Keywords',
              value: scraperData.keywords.join(', '),
            });
          }

          // Add subreddits
          if (scraperData.subreddits && scraperData.subreddits.length > 0) {
            metrics.push({
              label: 'Subreddits',
              value: scraperData.subreddits.map((s: string) => `r/${s}`).join(', '),
            });
          }
        } else {
          metrics.push({ label: 'Configuration', value: clusterData.scraper_entity_id ? '✓ Configured' : '✗ Not configured' });
        }

        return metrics;

      case 'scraping':
        return [
          { label: 'Scraper Entity', value: clusterData.scraper_entity_id || 'Not started' },
          { label: 'Status', value: status === 'ongoing' ? 'In progress...' : status === 'completed' ? '✓ Complete' : 'Not started' },
          { label: 'Dependencies', value: clusterData.stages.define === 'completed' ? '✓ Initialized' : '✗ Pending' },
        ];

      case 'cluster_prep':
        return [
          { label: 'Sample Entity', value: clusterData.sample_id || 'Not created' },
          { label: 'Status', value: status === 'completed' ? '✓ Complete' : 'Pending' },
          { label: 'Dependencies', value: clusterData.stages.scraping === 'completed' ? '✓ Scraping done' : '✗ Scraping pending' },
        ];

      case 'experiment':
        return [
          { label: 'Sample ID', value: clusterData.sample_id || 'Waiting...' },
          { label: 'Status', value: status === 'completed' ? '✓ Complete' : 'Not started' },
          { label: 'Dependencies', value: clusterData.stages.cluster_prep === 'completed' ? '✓ Prep done' : '✗ Prep pending' },
        ];

      case 'cluster_filter':
        return [
          { label: 'Status', value: status === 'ongoing' ? 'In progress...' : status === 'completed' ? '✓ Complete' : 'Not started' },
          { label: 'Sample', value: clusterData.sample_id || 'N/A' },
          { label: 'Dependencies', value: clusterData.stages.experiment === 'completed' ? '✓ Experiment done' : '✗ Experiment pending' },
        ];

      case 'cluster_enrich':
        return [
          { label: 'Status', value: status === 'completed' ? '✓ Complete' : 'Waiting...' },
          { label: 'Dependencies', value: clusterData.stages.cluster_filter === 'completed' ? '✓ Filter done' : '✗ Filter pending' },
          { label: 'Cluster ID', value: clusterData.cluster_entity_id || 'Not created' },
        ];

      case 'clustering':
        return [
          { label: 'Cluster Entity', value: clusterData.cluster_entity_id || 'Not created' },
          { label: 'Status', value: status === 'completed' ? '✓ Complete' : status === 'error' ? '⚠ Error' : 'Not started' },
          { label: 'Dependencies', value: clusterData.stages.cluster_enrich === 'completed' ? '✓ Enrich done' : '✗ Enrich pending' },
        ];

      default:
        return [];
    }
  };

  const getStatusIcon = (status: StatusType): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'ongoing':
        return '///';
      case 'paused':
        return '◼';
      case 'error':
        return '⚠';
      case 'initialized':
      default:
        return '□';
    }
  };

  const getStatusColor = (status: StatusType): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-600';
      case 'ongoing':
        return 'bg-blue-500 border-blue-600 animate-stripe';
      case 'paused':
        return 'bg-pink-500 border-pink-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'initialized':
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getBoxBackgroundColor = (status: StatusType): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'ongoing':
        return 'bg-blue-50 border-blue-200';
      case 'paused':
        return 'bg-pink-50 border-pink-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'initialized':
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getButtonLabel = (status: StatusType): string => {
    switch (status) {
      case 'completed':
        return 'View';
      case 'ongoing':
        return 'Monitor';
      case 'paused':
        return 'Resume Work';
      case 'error':
        return 'Retry';
      case 'initialized':
      default:
        return 'Start Process';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <div className="max-w-[1600px] mx-auto">
          <Card className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !clusterData) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <div className="max-w-[1600px] mx-auto">
          <Card className="p-8 bg-red-50 border-red-200">
            <p className="text-red-600 text-center">{error || 'Failed to load cluster data'}</p>
            <div className="text-center mt-4">
              <Button variant="secondary" onClick={() => router.push('/overview')}>
                ← Back to Overview
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Build stage data from cluster
  const stageData: StageData[] = Object.keys(stageConfig).map((key) => {
    const stageKey = key as keyof typeof stageConfig;
    const config = stageConfig[stageKey];
    return {
      name: config.name,
      key: stageKey,
      status: clusterData.stages[stageKey],
      route: `${config.route}?scraper_cluster_id=${scraperClusterId}${stageKey === "cluster_prep" && clusterData.stages[stageKey] === "completed" ? `&sample_id=${clusterData.sample_id}`: ""}`,
      description: config.description,
      metrics: getStageMetrics(stageKey),
    };
  });

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 animate-fadeInDown">
          <h1 className="text-4xl font-bold text-foreground">Pipeline Dashboard</h1>
          <Button variant="secondary" onClick={() => router.push('/overview')}>
            ← Back to Overview
          </Button>
        </div>

        {/* Project Info */}
        <Card className="mb-8 p-6 animate-fadeIn">
          <div className="space-y-2">
            <div>
              <span className="font-semibold text-foreground">Research Project: </span>
              <span className="text-(--muted-foreground)">
                {clusterData.problem_exporation_description || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Target Audience: </span>
              <span className="text-(--muted-foreground)">
                {clusterData.target_audience || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Cluster ID: </span>
              <span className="text-(--muted-foreground) font-mono text-sm">{clusterData.id}</span>
            </div>
          </div>
        </Card>

        {/* Stage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stageData.map((stage, index) => (
            <Card
              key={stage.key}
              className={`p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-fadeIn ${getBoxBackgroundColor(stage.status)}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Stage Header with Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{stage.name}</h2>
                <div
                  className={`px-3 py-1 rounded-md text-white font-semibold text-sm flex items-center gap-2 ${getStatusColor(
                    stage.status
                  )}`}
                >
                  <span className="text-lg">{getStatusIcon(stage.status)}</span>
                  <span className="capitalize">{stage.status}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-(--muted-foreground) mb-4 border-b border-(--border) pb-3">
                {stage.description}
              </p>

              {/* Metrics */}
              <div className="space-y-3 mb-6 min-h-[180px]">
                {stage.metrics.map((metric, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-semibold text-foreground">{metric.label}: </span>
                    <span className="text-(--muted-foreground) whitespace-pre-line">{metric.value}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push(stage.route)}
              >
                {getButtonLabel(stage.status)} →
              </Button>
            </Card>
          ))}
        </div>

        {/* Legend */}
        <Card className="p-4 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="text-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">///</span>
              <span className="text-foreground">Ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">◼</span>
              <span className="text-foreground">Paused</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠</span>
              <span className="text-foreground">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">□</span>
              <span className="text-foreground">Initialized</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Animations */}
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

        @keyframes stripe {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 50px 50px;
          }
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.5s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out both;
        }

        .animate-stripe {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.2) 10px,
            rgba(255, 255, 255, 0.2) 20px
          );
          background-size: 50px 50px;
          animation: stripe 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

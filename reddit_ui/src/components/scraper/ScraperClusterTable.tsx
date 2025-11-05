import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ScraperClusterEntity, StatusType } from '@/types/scraper-cluster';
import { Button } from '../ui';

interface ScraperClusterTableProps {
  clusters: ScraperClusterEntity[];
}

const stageLabels = {
  initialized: 'Initialized',
  scraping: 'Scraping',
  cluster_prep: 'Cluster Prep',
  cluster_filter: 'Cluster Filter',
  cluster_enrich: 'Cluster Enrich',
  clustering: 'Clustering',
};

const stageDescriptions = {
  initialized: 'Setup with all information to start',
  scraping: 'Scraping data from Reddit',
  cluster_prep: 'Converting to cluster units',
  cluster_filter: 'Filtering with prompts on sample data',
  cluster_enrich: 'Applying filtering and enrichment to all data',
  clustering: 'Clustering of standalone text',
};

// Map stage names to their respective routes
const stageRoutes = {
  initialized: '/define',
  scraping: '/scraper',
  cluster_prep: '/prompts',
  cluster_filter: '/viewer',
  cluster_enrich: '/enrich',
  clustering: '/clustering',
};

// Helper function to get the route for a stage
const getStageRoute = (stage: keyof typeof stageRoutes, clusterId: string): string => {
  return `${stageRoutes[stage]}?scraper_cluster_id=${clusterId}`;
};

// Helper function to determine the next step to navigate to
const getNextStepRoute = (cluster: ScraperClusterEntity): string => {
  const stageOrder: (keyof typeof stageRoutes)[] = [
    'initialized',
    'scraping',
    'cluster_prep',
    'cluster_filter',
    'cluster_enrich',
    'clustering',
  ];

  // First, check if there's an "ongoing" stage
  for (const stage of stageOrder) {
    if (cluster.stages[stage] === 'ongoing') {
      return getStageRoute(stage, cluster.id);
    }
  }

  // Otherwise, find the first stage that is not "completed"
  for (const stage of stageOrder) {
    if (cluster.stages[stage] !== 'completed') {
      return getStageRoute(stage, cluster.id);
    }
  }

  // If all are completed, go to the last stage
  return getStageRoute('clustering', cluster.id);
};

export const ScraperClusterTable: React.FC<ScraperClusterTableProps> = ({
  clusters,
}) => {
  if (clusters.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No scraper cluster instances found. Create one to get started!</p>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-(--border)">
            <th className="text-left p-3 font-semibold text-sm bg-(--muted)">ID</th>
            {Object.entries(stageLabels).map(([key, label]) => (
              <th
                key={key}
                className="text-center p-3 font-semibold text-sm bg-(--muted)"
                title={stageDescriptions[key as keyof typeof stageDescriptions]}
              >
                {label}
              </th>
            ))}
            <th className="text-center p-3 font-semibold text-sm bg-(--muted)">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => {
            const nextStepRoute = getNextStepRoute(cluster);

            return (
              <tr
                key={cluster.id}
                className="border-b border-(--border) hover:bg-(--muted) transition-colors"
              >
                <td className="p-3 text-sm font-mono">
                  <Link
                    href={nextStepRoute}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {cluster.id}
                  </Link>
                </td>
                {Object.keys(stageLabels).map((stageKey) => (
                  <td key={stageKey} className="py-2 text-center">
                    <StatusBadge
                      status={cluster.stages[stageKey as keyof typeof cluster.stages]}
                      href={getStageRoute(stageKey as keyof typeof stageRoutes, cluster.id)}
                    />
                  </td>
                ))}
                <td className="text-center">
                  <Link
                    href={`/results?scraper_cluster_id=${cluster.id}`}
                    className="text-md text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className='p-0 m-0'>
                      {cluster.stages.clustering === "completed" ? "View Results" : "Next Step"}
                    </Button>
                    
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

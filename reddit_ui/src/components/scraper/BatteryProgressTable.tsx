'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BatteryProgress } from './BatteryProgress';
import type { ScraperClusterEntity, StageStatus } from '@/types/scraper-cluster';

interface BatteryProgressTableProps {
  clusters: ScraperClusterEntity[];
}

const stageLabels: Record<keyof StageStatus, string> = {
  define: 'Define',
  scraping: 'Scrape',
  cluster_prep: 'Prep',
  experiment: 'Experiment',
  cluster_filter: 'Filter',
  cluster_enrich: 'Enrich',
  clustering: 'Cluster',
};

export const BatteryProgressTable: React.FC<BatteryProgressTableProps> = ({ clusters }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clusters based on search query
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;

    const query = searchQuery.toLowerCase();
    return clusters.filter((cluster) => {
      // Search by ID or any other searchable fields
      return (
        cluster.id.toLowerCase().includes(query) ||
        (cluster.problem_exporation_description?.toLowerCase().includes(query)) ||
        (cluster.target_audience?.toLowerCase().includes(query))
      );
    });
  }, [clusters, searchQuery]);

  // Handle row click to navigate to dashboard
  const handleRowClick = (clusterId: string) => {
    router.push(`/dashboard?scraper_cluster_id=${clusterId}`);
  };

  if (clusters.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No research projects found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left px-6 py-4 font-semibold text-sm text-gray-700" style={{ width: '100px' }}>
                ID
              </th>
              <th className="text-left px-6 py-4 font-semibold text-sm text-gray-700" style={{ width: '250px' }}>
                Name
              </th>
              <th className="px-4 py-4" colSpan={7}>
                <div className="grid grid-cols-7 gap-0 w-full">
                  {Object.entries(stageLabels).map(([key, label]) => (
                    <div
                      key={key}
                      className="text-center font-semibold text-xs text-gray-600"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClusters.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No projects match your search query.
                </td>
              </tr>
            ) : (
              filteredClusters.map((cluster, index) => (
                <tr
                  key={cluster.id}
                  onClick={() => handleRowClick(cluster.id)}
                  className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 cursor-pointer group animate-[fadeIn_0.3s_ease-out]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-5 text-sm font-mono text-gray-600 group-hover:text-blue-600 transition-colors" style={{ width: '100px' }}>
                    #{cluster.id.substring(0, 6)}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-800 font-medium" style={{ width: '250px' }}>
                    <div className="truncate" title={cluster.problem_exporation_description || cluster.target_audience || 'Untitled Project'}>
                      {cluster.target_audience && cluster.target_audience.substring(0, 20) + (cluster.target_audience.length > 20  ? "..." : "") || 'Untitled Project'}
                    </div>
                  </td>
                  <td className="px-4 py-5" colSpan={7}>
                    <BatteryProgress stages={cluster.stages} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="text-sm text-gray-600 animate-[fadeIn_0.3s_ease-out]">
          Showing {filteredClusters.length} of {clusters.length} projects
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

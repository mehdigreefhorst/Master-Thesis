'use client';

import React, { JSX } from 'react';
import type { StatusType, StageStatus } from '@/types/scraper-cluster';

interface BatteryProgressProps {
  stages: StageStatus;
  className?: string;
}

const stageOrder: (keyof StageStatus)[] = [
  'define',
  'scraping',
  'cluster_prep',
  'experiment',
  'cluster_filter',
  'cluster_enrich',
  'clustering',
];

const stageLabels: Record<keyof StageStatus, string> = {
  define: 'Define',
  scraping: 'Scrape',
  cluster_prep: 'Prep & Sample',
  experiment: 'Experiment',
  cluster_filter: 'Filter',
  cluster_enrich: 'Enrich',
  clustering: 'Cluster',
};

// Color mapping for different status types
const getStatusColor = (status: StatusType): string => {
  switch (status) {
    case 'initialized':
      return 'bg-gray-200'; // Grey
    case 'ongoing':
      return 'bg-blue-500'; // Blue
    case 'paused':
      return 'bg-pink-500'; // Pink
    case 'completed':
      return 'bg-green-500'; // Green
    case 'error':
      return 'bg-red-500'; // Red
    default:
      return 'bg-gray-200';
  }
};

// Get border color for cells
const getBorderColor = (status: StatusType): string => {
  switch (status) {
    case 'initialized':
      return 'border-gray-500';
    case 'ongoing':
      return 'border-blue-700';
    case 'paused':
      return 'border-pink-700';
    case 'completed':
      return 'border-green-700';
    case 'error':
      return 'border-red-700';
    default:
      return 'border-gray-400';
  }
};

// Get status icon/pattern
const getStatusPattern = (status: StatusType): JSX.Element | null => {
  if (status === 'ongoing') {
    // Diagonal stripes for ongoing
    return (
      <div className="absolute inset-0 overflow-hidden rounded-sm">
        <div className="diagonal-stripes"></div>
      </div>
    );
  }
  if (status === 'error') {
    // Warning icon for error
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-sm font-bold">⚠</span>
      </div>
    );
  }
  return null;
};

export const BatteryProgress: React.FC<BatteryProgressProps> = ({ stages, className = '' }) => {
  return (
    <div className={`flex items-center w-full ${className}`}>
      {/* Battery terminal (left cap) */}
      <div className="w-2 h-12 bg-gradient-to-b from-gray-500 to-gray-600 rounded-l-md flex-shrink-0 shadow-md"></div>

      {/* Battery cells container */}
      <div className="flex items-center flex-1 bg-gradient-to-b from-gray-400 to-gray-500 p-1 shadow-inner">
        {stageOrder.map((stage, index) => {
          const status = stages[stage];
          const colorClass = getStatusColor(status);
          const borderClass = getBorderColor(status);
          const pattern = getStatusPattern(status);

          return (
            <div
              key={stage}
              className="flex-1 px-[2px]"
            >
              <div
                className={`relative h-10 border-2 ${borderClass} ${
                  status === 'initialized' ? 'bg-white' : colorClass
                } rounded-sm transition-all duration-500 ease-in-out hover:scale-105 hover:z-10 group shadow-sm overflow-hidden`}
                title={`${stageLabels[stage]}: ${status}`}
              >
                {/* Diagonal separator line (SVG for better control) */}
                {index < stageOrder.length - 1 && (
                  <svg
                    className="absolute right-0 top-0 h-full w-[2px] pointer-events-none"
                    style={{ transform: 'translateX(1px)' }}
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="2"
                      y2="100%"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeDasharray="none"
                    />
                  </svg>
                )}

                {/* Status pattern overlay */}
                {pattern}

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-20">
                  <div className="font-semibold">{stageLabels[stage]}</div>
                  <div className="text-[10px] text-gray-300 capitalize">{status}</div>
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px]">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Battery terminal (right cap) */}
      <div className="w-2 h-12 bg-gradient-to-b from-gray-500 to-gray-600 rounded-r-md flex-shrink-0 shadow-md"></div>

      <style jsx>{`
        .diagonal-stripes {
          background: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.4) 0px,
            rgba(255, 255, 255, 0.4) 6px,
            transparent 6px,
            transparent 12px
          );
          width: 100%;
          height: 100%;
          animation: slide 1.5s linear infinite;
        }

        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(12px);
          }
        }
      `}</style>
    </div>
  );
};

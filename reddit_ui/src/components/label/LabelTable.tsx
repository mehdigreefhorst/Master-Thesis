'use client';

import React from 'react';
import { LabelRow, LabelResult } from './LabelRow';

export interface ModelColumn {
  name: string;
  version: string;
}

export interface LabelData {
  labelName: string;
  groundTruth: boolean;
  results: (LabelResult | null)[];
}

export interface PerformanceStats {
  accuracy: number;
  consistency: string;
  isHighlighted?: boolean;
}

interface LabelTableProps {
  models: ModelColumn[];
  labels: LabelData[];
  stats?: PerformanceStats[];
  className?: string;
}

export const LabelTable: React.FC<LabelTableProps> = ({
  models,
  labels,
  stats,
  className = ''
}) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <table className="w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg shadow-(--shadow-sm)">
        <thead>
          <tr>
            <th className="bg-(--secondary) p-3 text-left font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border) w-1/4">
              Category
            </th>
            <th className="bg-(--secondary) p-3 text-center font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border) w-[10%]">
              Truth
            </th>
            {models.map((model, index) => (
              <th
                key={index}
                className="bg-(--secondary) text-center font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border)"
              >
                <div className="font-bold">
                  <span>{model.name}</span> <span className="text-xs font-normal text-gray-600">{model.version}</span>
                </div>

              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => (
            <LabelRow
              key={index}
              labelName={label.labelName}
              groundTruth={label.groundTruth}
              results={label.results}
            />
          ))}
          {stats && (
            <tr className="bg-gray-50">
              <td
                colSpan={2}
                className="p-4 font-semibold text-sm border-b border-(--border)"
              >
                Overall Performance
              </td>
              {stats.map((stat, index) => (
                <td key={index} className="p-4 border-b border-(--border)">
                  <div className="text-sm">
                    <strong>Accuracy:</strong>{' '}
                    <span
                      className={
                        stat.isHighlighted
                          ? 'text-green-600 font-bold'
                          : ''
                      }
                    >
                      {stat.accuracy}%{stat.isHighlighted ? ' ✓' : ''}
                    </span>
                  </div>

                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

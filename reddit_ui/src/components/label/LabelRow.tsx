'use client';

import React from 'react';
import { ConsensusBar } from '../ui/ConsensusBar';
import { ReasoningIcon } from '../ui/ReasoningIcon';

export interface LabelResult {
  count: number; // How many runs matched (0-3)
  total?: number; // Total runs (default 3)
  isWarning?: boolean; // Inconsistent results
  isSuccess?: boolean; // All matched
  reasoning?: string | React.ReactNode;
}

interface LabelRowProps {
  labelName: string;
  groundTruth: boolean; // true = ✓, false = ✗
  results: (LabelResult | null)[]; // null means no data (—)
  className?: string;
}

export const LabelRow: React.FC<LabelRowProps> = ({
  labelName,
  groundTruth,
  results,
  className = ''
}) => {
  return (
    <tr className={`hover:bg-(--muted) ${className}`}>
      <td className="p-4 border-b border-(--border) text-sm">
        <strong>{labelName}</strong>
      </td>
      <td className="p-4 border-b border-(--border) text-center text-xl">
        <span className={groundTruth ? 'text-green-600' : ''}>
          {groundTruth ? '✓' : '✗'}
        </span>
      </td>
      {results.map((result, index) => (
        <td key={index} className="p-4 border-b border-(--border)">
          {result === null ? (
            <div className="text-center text-gray-400">—</div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ConsensusBar
                  value={result.count}
                  total={result.total}
                  isPartial={result.isWarning}
                />
              </div>
              <span className="text-sm font-semibold">
                {result.count}/{result.total || 3}
              </span>
              {result.isWarning && (
                <span className="text-yellow-600 animate-[warningPulse_1500ms_ease-in-out_infinite]">
                  ⚠️
                </span>
              )}
              {result.isSuccess && <span className="text-green-600">✓</span>}
              {result.reasoning && <ReasoningIcon reasoning={result.reasoning} />}
            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

'use client';

import React, { useState } from 'react';
import { ConsensusBar } from '../ui/ConsensusBar';
import { ReasoningIcon } from '../ui/ReasoningIcon';

export interface LabelResult {
  count: number; // How many runs matched (0-3)
  total?: number; // Total runs (default 3)
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
  // Track which result cells have their reasoning expanded
  const [openStates, setOpenStates] = useState<boolean[]>(
    results.map(() => false)
  );

  const toggleOpen = (index: number) => {
    setOpenStates(prev => prev.map((state, i) => i === index ? !state : state));
  };

  return (
    <tr className={`hover:bg-(--muted) ${className}`}>
      <td className="p-4 border-b border-(--border) text-sm">
        <strong>{labelName}</strong>
      </td>
      <td className=" border-b border-(--border) text-center text-xl">
        <span className={groundTruth ? 'text-green-600' : ''}>
          {groundTruth ? '✓' : '✗'}
        </span>
      </td>
      {results.map((result, index) => (
        <td key={index} className="p-4 border-b border-(--border)">
          {result === null ? (
            <div className="text-center text-gray-400">—</div>
          ) : (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ConsensusBar
                    value={result.count}
                    total={result.total}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {result.count}/{result.total || 3}
                </span>
                {result.reasoning && (
                  <span
                    className="inline-block cursor-pointer text-xl transition-transform duration-200 hover:scale-110 hover:rotate-6"
                    onClick={() => toggleOpen(index)}
                  >
                    💬
                  </span>
                )}
              </div>
              <ReasoningIcon reasoning={result.reasoning} setIsOpen={() => toggleOpen(index)} isOpen={openStates[index]}/>

            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

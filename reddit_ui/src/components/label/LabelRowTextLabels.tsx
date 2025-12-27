'use client';

import React, { useState, useEffect } from 'react';
import { ReasoningIcon } from '../ui/ReasoningIcon';

import { useToast } from '@/components/ui/use-toast';
import { LabelResult } from '@/types/cluster-unit';

// export interface LabelResult {
//   count: number; // How many runs matched (0-3)
//   total: number; // Total runs (default 3)
//   reasons?: string[]
// }

interface LabelRowProps {
  labelName: string;
  labelTemplateId: string;
  results: (LabelResult | null)[]; // null means no data (—)
  clusterUnitEntityId?: string | null;
  className?: string;
}

export const LabelRowTextLabels: React.FC<LabelRowProps> = ({
  labelName,
  labelTemplateId,
  results,
  clusterUnitEntityId,
  className = ''
}) => {
  const { toast } = useToast();
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
      <td className="border-b border-(--border) text-center text-xl px-4">
      </td>
      {results.map((result, index) => (
        <td key={index} className={`p-4 border-b border-(--border)`}>
          {result === null ? (
            <div className="text-center text-gray-400">—</div>
          ) : (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <div className="flex items-center gap-2">
                {result.values}


                {result.per_label_labels && (
                  <span
                    className="inline-block cursor-pointer text-xl transition-transform duration-200 hover:scale-110 hover:rotate-6"
                    onClick={() => toggleOpen(index)}
                  >
                    💬
                  </span>
                )}
              </div>
              <ReasoningIcon per_label_labels={result.per_label_labels} setIsOpen={() => toggleOpen(index)} isOpen={openStates[index]}/>

            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

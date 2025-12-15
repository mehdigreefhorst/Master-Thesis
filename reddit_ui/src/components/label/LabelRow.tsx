'use client';

import React, { useState, useEffect } from 'react';
import { ConsensusBar } from '../ui/ConsensusBar';
import { ReasoningIcon } from '../ui/ReasoningIcon';
import { Button } from '../ui';
import { clusterApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';

export interface LabelResult {
  count: number; // How many runs matched (0-3)
  total: number; // Total runs (default 3)
  reasons?: string[]
}

interface LabelRowProps {
  labelName: string;
  labelTemplateId: string;
  groundTruth: boolean | null; // true = ✓, false = ✗, null = -
  results: (LabelResult | null)[]; // null means no data (—)
  cluster_unit_id: string;
  handleClusterUnitGroundTruthUpdate?: (clusterUnitEntityId: string, category: string, newValue: boolean) => void;
  className?: string;
}

export const LabelRow: React.FC<LabelRowProps> = ({
  labelName,
  labelTemplateId,
  groundTruth,
  results,
  cluster_unit_id,
  handleClusterUnitGroundTruthUpdate,
  className = ''
}) => {
  const authFetch = useAuthFetch();
  const [newGroundTruth, setNewGroundTruth] = useState<boolean | null >(groundTruth)
  // Track which result cells have their reasoning expanded
  const [openStates, setOpenStates] = useState<boolean[]>(
    results.map(() => false)
  );

  // Update newGroundTruth when groundTruth or cluster_unit_id or labelTemplateId changes
  useEffect(() => {
    setNewGroundTruth(groundTruth);
  }, [groundTruth, cluster_unit_id, labelTemplateId]);

  const toggleOpen = (index: number) => {
    setOpenStates(prev => prev.map((state, i) => i === index ? !state : state));
  };

  const updateGroundTruth = () => {
    const newBool = !newGroundTruth
    setNewGroundTruth(newBool);
    clusterApi.updateClusterUnitGroundTruth(authFetch, cluster_unit_id, labelTemplateId, labelName, newBool);

    // Update the cached data in the parent component
    if (handleClusterUnitGroundTruthUpdate) {
      handleClusterUnitGroundTruthUpdate(cluster_unit_id, labelName, newBool);
    }
  }

  return (
    <tr className={`hover:bg-(--muted) ${className}`}>
      <td className="p-4 border-b border-(--border) text-sm">
        <strong>{labelName}</strong>
      </td>
      <td className=" border-b border-(--border) text-center text-xl">
        <Button variant="invisible" onClick={updateGroundTruth}>        
          <span className={newGroundTruth ? 'text-green-600' : ''}>
            {newGroundTruth===true ? '✓' : '✗'}
          </span>
        </Button>
      </td>
      {results.map((result, index) => (
        <td key={index} className={`p-4 border-b border-(--border) ${newGroundTruth && result && result.count !== result.total ? "bg-amber-200": ""} `}>
          {result === null ? (
            <div className="text-center text-gray-400">—</div>
          ) : (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ConsensusBar
                    value={result.count}
                    groundTruth={newGroundTruth}
                    total={result.total}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {result.count}/{result.total || 3}
                </span>
                {result.reasons && (
                  <span
                    className="inline-block cursor-pointer text-xl transition-transform duration-200 hover:scale-110 hover:rotate-6"
                    onClick={() => toggleOpen(index)}
                  >
                    💬
                  </span>
                )}
              </div>
              <ReasoningIcon reasons={result.reasons} setIsOpen={() => toggleOpen(index)} isOpen={openStates[index]}/>

            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

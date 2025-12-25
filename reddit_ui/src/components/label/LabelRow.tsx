'use client';

import React, { useState, useEffect } from 'react';
import { ConsensusBar } from '../ui/ConsensusBar';
import { ReasoningIcon } from '../ui/ReasoningIcon';
import { Button } from '../ui';
import { clusterApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
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
  groundTruth: boolean | string | null; // true = ✓, false = ✗, null = -
  results: (LabelResult | null)[]; // null means no data (—)
  handleClusterUnitGroundTruthUpdate: (category: string, newValue: boolean) => void;
  className?: string;
}

export const LabelRow: React.FC<LabelRowProps> = ({
  labelName,
  labelTemplateId,
  groundTruth,
  results,
  handleClusterUnitGroundTruthUpdate,
  className = ''
}) => {
  const { toast } = useToast();
  const [newGroundTruth, setNewGroundTruth] = useState<boolean | null | string >(groundTruth)
  // Track which result cells have their reasoning expanded
  const [openStates, setOpenStates] = useState<boolean[]>(
    results.map(() => false)
  );

  // Update newGroundTruth when groundTruth or cluster_unit_id or labelTemplateId changes
  useEffect(() => {
    setNewGroundTruth(groundTruth);
  }, [groundTruth, labelTemplateId]);

  const toggleOpen = (index: number) => {
    setOpenStates(prev => prev.map((state, i) => i === index ? !state : state));
  };

  const updateGroundTruth = async () => {
    const newBool = !newGroundTruth;
    const previousValue = newGroundTruth;

    // Optimistically update the UI
    setNewGroundTruth(newBool);

    try {
      // Update the cached data in the parent component
     
      handleClusterUnitGroundTruthUpdate(labelName, newBool);
      

      toast({
        title: "Success",
        description: `Ground truth updated to ${newBool ? 'True' : 'False'}`,
        variant: "success"
      });
    } catch (err) {
      // Revert the optimistic update on error
      setNewGroundTruth(previousValue);

      const errorMessage = err instanceof Error ? err.message : 'Failed to update ground truth';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
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
        <td key={index} className={`p-4 border-b border-(--border) ${newGroundTruth && result && result.count_match_ground_truth !== result.total_runs ? "bg-amber-200": ""} `}>
          {result === null ? (
            <div className="text-center text-gray-400">—</div>
          ) : (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ConsensusBar
                    value={result.count_match_ground_truth}
                    groundTruth={newGroundTruth}
                    total={result.total_runs}
                  />
                  {JSON.stringify(result.count_match_ground_truth)}
                </div>
                <span className="text-sm font-semibold">
                  {result.count_match_ground_truth}/{result.total_runs || 3}
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
              <ReasoningIcon per_label_labels={result.per_label_labels} setIsOpen={() => toggleOpen(index)} isOpen={openStates[index]}/>

            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

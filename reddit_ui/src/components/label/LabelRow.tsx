'use client';

import React, { useState, useEffect } from 'react';
import { ConsensusBar } from '../ui/ConsensusBar';
import { ReasoningIcon } from '../ui/ReasoningIcon';
import { Button, Input } from '../ui';
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
  groundTruth: boolean | string | null | number; // true = ✓, false = ✗, null = -
  groundTruthValues?: (boolean)[] | string[] | null
  results: (LabelResult | null)[]; // null means no data (—)
  handleClusterUnitGroundTruthUpdate: (category: string, newValue: boolean | string | number) => void;
  clusterUnitEntityId?: string | null;
  isScrollMode?: boolean;
  className?: string;
}

export const LabelRow: React.FC<LabelRowProps> = ({
  labelName,
  labelTemplateId,
  groundTruth,
  groundTruthValues,
  results,
  handleClusterUnitGroundTruthUpdate,
  clusterUnitEntityId,
  isScrollMode = false,
  className = ''
}) => {
  const { toast } = useToast();
  const [newGroundTruth, setNewGroundTruth] = useState<boolean | null | string | number >(groundTruth)
  // Track which result cells have their reasoning expanded
  const [openStates, setOpenStates] = useState<boolean[]>(
    results.map(() => false)
  );

  // // // Update newGroundTruth when groundTruth or cluster_unit_id or labelTemplateId changes
    useEffect(() => {
      setNewGroundTruth(groundTruth);
    }, [groundTruth, labelTemplateId, clusterUnitEntityId]);

  const toggleOpen = (index: number) => {
    setOpenStates(prev => prev.map((state, i) => i === index ? !state : state));
  };

  const nextGroundTruthToggle = () => {
    if (!groundTruthValues) return false 
    
    if (newGroundTruth === null || newGroundTruth === undefined) return groundTruthValues[0]
    let newGroundTruthIndex: number
    const currentGroundTruthIndex = groundTruthValues.findIndex(value => value === newGroundTruth);


    if (currentGroundTruthIndex === undefined)  {
      newGroundTruthIndex = 0
    } else{
      newGroundTruthIndex = currentGroundTruthIndex + 1
    }

    if (newGroundTruthIndex > groundTruthValues.length -1) {
      newGroundTruthIndex -= groundTruthValues.length
    }

    return groundTruthValues[newGroundTruthIndex]
}

  const updateGroundTruth = async () => {
    const newGroundTruthValue = nextGroundTruthToggle()

    try {
      handleClusterUnitGroundTruthUpdate(labelName, newGroundTruthValue);
      setNewGroundTruth(newGroundTruthValue)

      toast({
        title: "Success",
        description: `Ground truth updated to ${newGroundTruthValue}`,
        variant: "success"
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ground truth';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }

  const updateGroundTruthFromInput = async (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    // Try to parse as number if it looks like a number
    const numValue = Number(trimmedValue);
    const finalValue = !isNaN(numValue) && trimmedValue !== '' ? numValue : trimmedValue;

    try {
      handleClusterUnitGroundTruthUpdate(labelName, finalValue);
      setNewGroundTruth(finalValue);

      toast({
        title: "Success",
        description: `Ground truth updated to ${finalValue}`,
        variant: "success"
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ground truth';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }

  // Helper to render the ground truth value
  const renderGroundTruthValue = () => {
    if (typeof newGroundTruth === 'boolean') {
      return newGroundTruth ? '✓' : '✗';
    }
    return String(newGroundTruth ?? '—');
  }

  // Determine if we should show input box (no possible values and type is string/number)
  const shouldShowInput = !groundTruthValues && (typeof groundTruth === 'string' || typeof groundTruth === 'number' || groundTruth === null);

  // Determine text color based on value type
  const getValueColor = () => {
    if (typeof newGroundTruth === 'boolean') {
      return newGroundTruth ? 'text-green-600' : 'text-red-600';
    }
    return 'text-blue-600';
  }

  return (
    <tr className={`hover:bg-gray-50 ${className}`}>
      <td
        className="p-4 border-b border-gray-200 text-sm bg-white sticky left-0 z-10"
        style={isScrollMode ? { minWidth: '200px', width: '200px' } : { width: '15%' }}
      >
        <strong className="block truncate" title={labelName}>{labelName}</strong>
      </td>
      <td
        className="border-b border-gray-200 text-center text-xl px-4 bg-white"
        style={isScrollMode ? { minWidth: '100px', width: '100px' } : { width: '10%' }}
      >
        {shouldShowInput ? (
          <Input
            type="text"
            variant="primary"
            value={String(newGroundTruth ?? '')}
            onChange={(e) => setNewGroundTruth(e.target.value)}
            onBlur={(e) => updateGroundTruthFromInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateGroundTruthFromInput(e.currentTarget.value);
                e.currentTarget.blur();
              }
            }}
            placeholder="Enter value..."
            className="text-sm"
          />
        ) : (
          <Button variant="invisible" onClick={updateGroundTruth}>
            <span className={getValueColor()}>
              {renderGroundTruthValue()}
            </span>
          </Button>
        )}
      </td>
      {results.map((result, index) => (
        <td
          key={index}
          className={`p-1 border-b border-gray-200 ${newGroundTruth && result && result.count_match_ground_truth !== result.total_runs ? "bg-amber-200": ""}`}
          style={isScrollMode ? { minWidth: '300px', width: '25%' } : {}}
        >
          {result === null ? (
            <div className="text-center text-gray-400">—</div>
          ) : (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ConsensusBar
                    value={result.count_match_ground_truth}
                    predictedValues={result.values}
                    groundTruth={newGroundTruth}
                    total={result.total_runs}
                  />
                  {JSON.stringify(result.count_match_ground_truth)}
                </div>
                <div className='flex flex-col'>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {result.count_match_ground_truth}/{result.total_runs || 3}
                  </span>
                  {result.per_label_labels && (
                    <span
                      className="inline-block cursor-pointer text-xl transition-transform duration-200 hover:scale-110 hover:rotate-6 flex-shrink-0"
                      onClick={() => toggleOpen(index)}
                    >
                      💬
                    </span>
                  )}
                </div>
              </div>
              <ReasoningIcon per_label_labels={result.per_label_labels} setIsOpen={() => toggleOpen(index)} isOpen={openStates[index]}/>

            </div>
          )}
        </td>
      ))}
    </tr>
  );
};

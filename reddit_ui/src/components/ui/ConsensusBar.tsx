import React from 'react';

interface ConsensusBarProps {
  value: number; // 0-3 representing how many runs matched
  groundTruth?: boolean | null; // The ground truth * total -> this is what we would like to see
  total?: number; // Total runs (default 3)
  isPartial?: boolean; // Whether this is a partial match (warning state)
}

export const ConsensusBar: React.FC<ConsensusBarProps> = ({
  value,
  groundTruth,
  total = 3,
}) => {
  const percentage = (value / total) * 100;

  return (
    <div className="h-2 bg-(--bar-empty) rounded overflow-hidden relative">
      <div
        className={`h-full rounded transition-all duration-500 ease-out ${
          !groundTruth && value>0 || groundTruth && value !==total ? 'bg-(--warning)' : 'bg-(--bar-full)'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

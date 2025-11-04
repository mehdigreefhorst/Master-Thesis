import React from 'react';

interface ConsensusBarProps {
  value: number; // 0-3 representing how many runs matched
  total?: number; // Total runs (default 3)
  isPartial?: boolean; // Whether this is a partial match (warning state)
}

export const ConsensusBar: React.FC<ConsensusBarProps> = ({
  value,
  total = 3,
  isPartial = false
}) => {
  const percentage = (value / total) * 100;

  return (
    <div className="h-2 bg-[var(--bar-empty)] rounded overflow-hidden relative">
      <div
        className={`h-full rounded transition-all duration-500 ease-out ${
          isPartial ? 'bg-[var(--warning)]' : 'bg-[var(--bar-full)]'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

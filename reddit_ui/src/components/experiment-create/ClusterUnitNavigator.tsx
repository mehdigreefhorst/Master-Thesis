import React from 'react';
import { Button } from '../ui/Button';
import type { ClusterUnitEntity } from '@/types/cluster-unit';

interface ClusterUnitNavigatorProps {
  clusterUnits: ClusterUnitEntity[];
  currentUnitIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (unitId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const ClusterUnitNavigator: React.FC<ClusterUnitNavigatorProps> = ({
  clusterUnits,
  currentUnitIndex,
  onPrev,
  onNext,
  onSelect,
  isLoading = false,
  className = '',
}) => {
  const currentUnit = clusterUnits[currentUnitIndex];

  if (clusterUnits.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Button
        variant="secondary"
        onClick={onPrev}
        disabled={currentUnitIndex === 0 || isLoading}
        className="px-3 py-2"
      >
        &lt;
      </Button>

      <select
        value={currentUnit?.id || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading}
        className="h-10 px-3 py-2 border-2 border-[var(--border)] rounded-lg
                 bg-[var(--card)] text-[var(--foreground)] text-sm
                 focus:outline-none focus:ring-2 focus:border-[var(--primary)] focus:shadow-[var(--shadow)]
                 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {clusterUnits.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.author.substring(0, 4)}... |
            {unit.type === 'post' ? ' Post' : ` Comment (depth: ${unit.thread_path_text?.length || 0})`} |
            ↑{unit.upvotes}
          </option>
        ))}
      </select>

      <Button
        variant="secondary"
        onClick={onNext}
        disabled={currentUnitIndex === clusterUnits.length - 1 || isLoading}
        className="px-3 py-2"
      >
        &gt;
      </Button>

      <span className="text-sm text-[var(--muted-foreground)]">
        {currentUnitIndex + 1} / {clusterUnits.length}
      </span>
    </div>
  );
};

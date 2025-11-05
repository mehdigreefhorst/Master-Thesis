import React from 'react';

interface CertaintyBarProps {
  certain: number;    // Count of samples with 3/3 agreement
  uncertain: number;  // Count of samples with 2/3 agreement
  split: number;      // Count of samples with 1/3 or split
  total: number;      // Total samples with this label
  className?: string;
}

export const CertaintyBar: React.FC<CertaintyBarProps> = ({
  certain,
  uncertain,
  split,
  total,
  className = ''
}) => {
  const certainPct = (certain / total) * 100;
  const uncertainPct = (uncertain / total) * 100;
  const splitPct = (split / total) * 100;

  return (
    <div className={className}>
      <div className="flex gap-0.5 h-4 rounded overflow-hidden">
        {/* Certain segment */}
        <div
          className="bg-(--success) transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
          style={{ width: `${certainPct}%` }}
          title={`${certain} samples (${certainPct.toFixed(0)}%) - 3/3 agreement`}
        >
          {certainPct > 15 ? '▓' : ''}
        </div>

        {/* Uncertain segment */}
        <div
          className="bg-(--warning) transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
          style={{ width: `${uncertainPct}%` }}
          title={`${uncertain} samples (${uncertainPct.toFixed(0)}%) - 2/3 agreement`}
        >
          {uncertainPct > 15 ? '▒' : ''}
        </div>

        {/* Split segment */}
        <div
          className="bg-(--muted) transition-all duration-500 flex items-center justify-center text-[10px] text-(--muted-foreground) font-bold"
          style={{ width: `${splitPct}%` }}
          title={`${split} samples (${splitPct.toFixed(0)}%) - split/uncertain`}
        >
          {splitPct > 15 ? '░' : ''}
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-(--muted-foreground) mt-1">
        <span>{certainPct.toFixed(0)}%-{uncertainPct.toFixed(0)}%-{splitPct.toFixed(0)}%</span>
      </div>
    </div>
  );
};

import React from 'react';

interface ThreadTargetProps {
  username: string;
  content: string;
  label?: string;
  className?: string;
}

export const ThreadTarget: React.FC<ThreadTargetProps> = ({
  username,
  content,
  label = '⭐ ANALYZING THIS REPLY',
  className = ''
}) => {
  return (
    <div className={`bg-(--thread-target) border-2 border-(--thread-target-border) p-2 rounded-(--radius) ml-12 relative animate-[targetPulse_2s_ease-in-out_infinite] ${className}`}>
      <div className="absolute top-2 right-2 text-xs font-bold text-green-700">
        {label}
      </div>
      <div className="text-sm">
        → <span className="font-semibold">{username}</span> replied:
      </div>
      <div className="text-sm">{content}</div>
    </div>
  );
};

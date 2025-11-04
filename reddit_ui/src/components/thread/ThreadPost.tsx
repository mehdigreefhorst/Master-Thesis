import React from 'react';

interface ThreadPostProps {
  username: string;
  content: string;
  className?: string;
}

export const ThreadPost: React.FC<ThreadPostProps> = ({
  username,
  content,
  className = ''
}) => {
  return (
    <div className={`bg-[var(--thread-post)] p-4 rounded-[var(--radius)] mb-4 ${className}`}>
      <div className="font-semibold text-sm mb-2">{username} wrote:</div>
      <div className="text-sm">{content}</div>
    </div>
  );
};

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
    <div className={`bg-(--thread-post) pl-4 rounded-(--radius) mb-2 ${className}`}>
      <div className="font-semibold text-sm">{username} wrote:</div>
      <div className="text-sm">{content}</div>
    </div>
  );
};

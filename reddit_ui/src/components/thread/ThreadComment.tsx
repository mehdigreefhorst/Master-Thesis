import React from 'react';

interface ThreadCommentProps {
  username: string;
  content: string;
  className?: string;
}

export const ThreadComment: React.FC<ThreadCommentProps> = ({
  username,
  content,
  className = ''
}) => {
  return (
    <div className={`bg-(--thread-comment) p-4 rounded-(--radius) ml-6 mb-3 ${className}`}>
      <div className="text-sm mb-1">
        → <span className="font-semibold">{username}</span> replied:
      </div>
      <div className="text-sm">{content}</div>
    </div>
  );
};

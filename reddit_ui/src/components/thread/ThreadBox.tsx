import React from 'react';

interface ThreadBoxProps {
  children: React.ReactNode;
  className?: string;
}

export const ThreadBox: React.FC<ThreadBoxProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white border border-(--border) rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
};

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style }) => {
  return (
    <div className={`bg-(--card) border border-(--border) rounded-lg shadow-(--shadow-sm) ${className}`} style={style}>
      {children}
    </div>
  );
};

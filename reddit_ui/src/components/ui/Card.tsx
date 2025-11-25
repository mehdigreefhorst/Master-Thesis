import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style, onClick }) => {
  return (
    <div className={`bg-(--card) border border-(--border) rounded-lg shadow-(--shadow-sm) ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
};

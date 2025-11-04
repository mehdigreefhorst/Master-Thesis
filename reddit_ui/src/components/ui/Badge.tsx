import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = ''
}) => {
  const baseStyles = 'inline-block px-3 py-1 rounded text-xs font-semibold';

  const variantStyles = {
    default: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
    success: 'bg-[var(--success)] text-[var(--success-foreground)]',
    warning: 'bg-[var(--warning)] text-[var(--warning-foreground)]',
    error: 'bg-[var(--error)] text-[var(--error-foreground)]'
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

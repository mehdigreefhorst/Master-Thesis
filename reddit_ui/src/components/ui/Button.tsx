import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-4 py-2 rounded font-medium text-sm cursor-pointer transition-all duration-200 border-none';

  const variantStyles = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[oklch(0.50_0.15_250)] hover:shadow-[var(--shadow)]',
    secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[oklch(0.88_0_0)]'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

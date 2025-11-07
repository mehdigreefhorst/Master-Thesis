import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | "invisible";
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl"
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  size = "lg",
  disabled,
  ...props
}) => {
  const baseStyles = `px-5 py-3 rounded-${size} font-semibold text-base transition-all duration-300 border-2 transform`;
  const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100';

  const variantStyles = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] hover:bg-[var(--primary-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:shadow-lg hover:scale-105',
    secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] border-[var(--border)] hover:bg-[var(--secondary-foreground)] hover:text-[var(--secondary)] hover:border-[var(--secondary-foreground)] hover:shadow-lg hover:scale-105',
    invisible: 'bg-transparent text-[var(--foreground)] border-transparent hover:bg-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--muted)] hover:shadow-md'
  };

  const cursorStyle = disabled ? '' : 'cursor-pointer';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${cursorStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

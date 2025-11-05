import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'primary' | 'secondary' | 'invisible';
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  variant = 'primary',
  icon,
  label,
  error,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full px-4 py-3 rounded font-medium text-sm transition-all duration-200 outline-none';
  const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--muted)]';

  const variantStyles = {
    primary: 'bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--border)] focus:border-[var(--primary)] focus:shadow-[var(--shadow)]',
    secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] border-2 border-transparent focus:border-[var(--border)] focus:bg-[var(--card)]',
    invisible: 'bg-transparent text-[var(--foreground)] border-2 border-transparent focus:border-[var(--muted)] hover:bg-[var(--muted)]'
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
            {icon}
          </div>
        )}
        <input
          className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${
            icon ? 'pl-10' : ''
          } ${className}`}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-[var(--error)]">{error}</p>
      )}
    </div>
  );
};

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'primary' | 'secondary' | 'invisible';
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  variant = 'primary',
  label,
  error,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full px-4 py-3 rounded font-medium text-sm transition-all duration-200 outline-none resize-none';
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
      <textarea
        className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-[var(--destructive)]">{error}</p>
      )}
    </div>
  );
};

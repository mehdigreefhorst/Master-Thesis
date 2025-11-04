import React from 'react';

interface InsightBoxProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const InsightBox: React.FC<InsightBoxProps> = ({
  icon = '🤖',
  title = 'Key Insight (AI Analysis):',
  children,
  className = ''
}) => {
  return (
    <div
      className={`bg-gradient-to-br from-[oklch(0.95_0.02_250)] to-[oklch(0.95_0.02_200)] border border-[var(--primary)] rounded-[var(--radius-lg)] p-6 animate-[insightAppear_400ms_ease-out] ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="font-semibold mb-2">{title}</div>
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
};

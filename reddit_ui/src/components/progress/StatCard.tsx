'use client';

import { memo, ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  animated?: boolean;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-500',
    text: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-500',
    text: 'text-green-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-500',
    text: 'text-purple-700',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-500',
    text: 'text-orange-700',
  },
};

const StatCardComponent: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  color = 'blue',
  trend,
  animated = true,
}) => {
  const colors = colorMap[color];

  return (
    <div
      className={`
        ${colors.bg} rounded-xl p-6 border-2 border-gray-200
        hover:border-${color}-300 hover:shadow-lg
        transition-all duration-300
        ${animated ? 'hover:scale-105' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${colors.icon} w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-600 mb-1">
            {label}
          </div>
          <div className={`text-3xl font-bold ${colors.text} mb-1 animate-[countUp_600ms_ease-out]`}>
            {value}
          </div>
          {subtext && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {trend && (
                <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                  {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                </span>
              )}
              {subtext}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StatCard = memo(StatCardComponent);

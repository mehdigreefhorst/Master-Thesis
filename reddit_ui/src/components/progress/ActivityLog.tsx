'use client';

import { memo, useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface ActivityLogProps {
  entries: LogEntry[];
  maxEntries?: number;
  autoScroll?: boolean;
  height?: string;
}

const typeConfig = {
  success: { icon: '✅', color: 'text-green-600' },
  info: { icon: '🔍', color: 'text-blue-600' },
  warning: { icon: '⚠️', color: 'text-yellow-600' },
  error: { icon: '❌', color: 'text-red-600' },
};

const ActivityLogComponent: React.FC<ActivityLogProps> = ({
  entries,
  maxEntries = 50,
  autoScroll = true,
  height = '300px',
}) => {
  const logRef = useRef<HTMLDivElement>(null);
  const displayedEntries = entries.slice(-maxEntries);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📡</span>
          Live Activity Log
        </h3>
        {autoScroll && (
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
            Auto-scroll enabled
          </span>
        )}
      </div>

      {/* Log entries */}
      <div
        ref={logRef}
        className="overflow-y-auto font-mono text-sm"
        style={{ height }}
      >
        {displayedEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📭</div>
              <div>No activity yet...</div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {displayedEntries.map((entry, index) => {
              const config = typeConfig[entry.type];
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors animate-[slideInLeft_300ms_ease-out]"
                  style={{
                    animationDelay: `${index * 20}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <span className="text-gray-400 text-xs shrink-0 w-20">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="shrink-0">{config.icon}</span>
                  <span className={`${config.color} flex-1`}>
                    {entry.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const ActivityLog = memo(ActivityLogComponent);

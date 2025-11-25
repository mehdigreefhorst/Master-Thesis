import React from 'react';
import { Card } from '../ui/Card';

interface StatusMessagesProps {
  error?: string | null;
  success?: string | null;
  className?: string;
}

export const StatusMessages: React.FC<StatusMessagesProps> = ({
  error,
  success,
  className = '',
}) => {
  if (!error && !success) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-[panelExpand_300ms_ease-out]">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </Card>
      )}

      {/* Success Display */}
      {success && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-[panelExpand_300ms_ease-out]">
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </Card>
      )}
    </div>
  );
};

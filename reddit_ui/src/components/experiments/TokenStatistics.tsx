import React from 'react';
import { TokenStatistics as TokenStatsType } from './ExperimentCard';

interface TokenStatisticsProps {
  stats: TokenStatsType;
  className?: string;
}

export const TokenStatistics: React.FC<TokenStatisticsProps> = ({ stats, className = '' }) => {
  // Calculate derived metrics
  const totalAttempts = stats.total_successful_predictions + stats.total_failed_attempts;
  const successRate = totalAttempts > 0
    ? ((stats.total_successful_predictions / totalAttempts) * 100).toFixed(1)
    : '0.0';

  const wastePercentage = stats.total_tokens_used.total_tokens > 0
    ? ((stats.tokens_wasted_on_failures.total_tokens / stats.total_tokens_used.total_tokens) * 100).toFixed(1)
    : '0.0';

  const retryPercentage = stats.total_tokens_used.total_tokens > 0
    ? ((stats.tokens_from_retries.total_tokens / stats.total_tokens_used.total_tokens) * 100).toFixed(1)
    : '0.0';

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="text-base">🎯</span> Token Usage Statistics
        </h4>
        <div className="text-xs text-muted-foreground">
          {stats.total_failed_attempts > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              {stats.total_failed_attempts} failed attempts
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Tokens */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Tokens</div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {formatNumber(stats.total_tokens_used.total_tokens)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {formatNumber(stats.total_tokens_used.prompt_tokens)} prompt + {formatNumber(stats.total_tokens_used.completion_tokens)} completion
            {stats.total_tokens_used.reasoning_tokens && stats.total_tokens_used.reasoning_tokens > 0 && (
              <span> + {formatNumber(stats.total_tokens_used.reasoning_tokens)} reasoning</span>
            )}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Success Rate</div>
          <div className="text-lg font-bold text-green-900 dark:text-green-100">
            {successRate}%
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {formatNumber(stats.total_successful_predictions)} / {formatNumber(totalAttempts)} attempts
          </div>
        </div>

        {/* Wasted Tokens */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Wasted Tokens</div>
          <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
            {stats.tokens_wasted_on_failures.total_tokens > 0
              ? formatNumber(stats.tokens_wasted_on_failures.total_tokens)
              : '0'
            }
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {wastePercentage}% of total
          </div>
        </div>
      </div>

      {/* Retry Information - Only show if there were retries */}
      {stats.tokens_from_retries.total_tokens > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                Tokens from Retries
              </div>
              <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                {formatNumber(stats.tokens_from_retries.total_tokens)} tokens ({retryPercentage}%)
              </div>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 text-right">
              <div>{formatNumber(stats.tokens_from_retries.prompt_tokens)} prompt</div>
              <div>{formatNumber(stats.tokens_from_retries.completion_tokens)} completion</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Breakdown - Collapsible */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          View detailed token breakdown
        </summary>
        <div className="mt-3 space-y-2 text-xs">
          {/* Total Usage Breakdown */}
          <div className="bg-muted/30 rounded p-2">
            <div className="font-medium text-foreground mb-1">Total Usage</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <div>Prompt tokens:</div>
              <div className="text-right font-mono">{formatNumber(stats.total_tokens_used.prompt_tokens)}</div>
              <div>Completion tokens:</div>
              <div className="text-right font-mono">{formatNumber(stats.total_tokens_used.completion_tokens)}</div>
              {stats.total_tokens_used.reasoning_tokens && stats.total_tokens_used.reasoning_tokens > 0 && (
                <>
                  <div>Reasoning tokens:</div>
                  <div className="text-right font-mono">{formatNumber(stats.total_tokens_used.reasoning_tokens)}</div>
                </>
              )}
              <div className="font-medium text-foreground">Total:</div>
              <div className="text-right font-mono font-medium text-foreground">
                {formatNumber(stats.total_tokens_used.total_tokens)}
              </div>
            </div>
          </div>

          {/* Wasted Tokens Breakdown */}
          {stats.tokens_wasted_on_failures.total_tokens > 0 && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded p-2">
              <div className="font-medium text-foreground mb-1">Wasted on Failures</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Prompt tokens:</div>
                <div className="text-right font-mono">{formatNumber(stats.tokens_wasted_on_failures.prompt_tokens)}</div>
                <div>Completion tokens:</div>
                <div className="text-right font-mono">{formatNumber(stats.tokens_wasted_on_failures.completion_tokens)}</div>
                <div className="font-medium text-foreground">Total:</div>
                <div className="text-right font-mono font-medium text-foreground">
                  {formatNumber(stats.tokens_wasted_on_failures.total_tokens)}
                </div>
              </div>
            </div>
          )}

          {/* Retry Tokens Breakdown */}
          {stats.tokens_from_retries.total_tokens > 0 && (
            <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded p-2">
              <div className="font-medium text-foreground mb-1">From Retry Attempts</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Prompt tokens:</div>
                <div className="text-right font-mono">{formatNumber(stats.tokens_from_retries.prompt_tokens)}</div>
                <div>Completion tokens:</div>
                <div className="text-right font-mono">{formatNumber(stats.tokens_from_retries.completion_tokens)}</div>
                <div className="font-medium text-foreground">Total:</div>
                <div className="text-right font-mono font-medium text-foreground">
                  {formatNumber(stats.tokens_from_retries.total_tokens)}
                </div>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* Success Message if perfect */}
      {stats.total_failed_attempts === 0 && stats.tokens_from_retries.total_tokens === 0 && (
        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
          <span>✓</span> Perfect run - no failures or retries needed!
        </div>
      )}
    </div>
  );
};

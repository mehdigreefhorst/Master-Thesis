'use client';

import { memo } from 'react';
import { ProgressBar } from './ProgressBar';
import { StatusBadge, Status } from './StatusBadge';
import type { KeywordSearchSubreddit } from '@/types/scraper-cluster';

interface SubredditProgressCardProps {
  subredditData: KeywordSearchSubreddit;
  totalKeywords: number;
}

const SubredditProgressCardComponent: React.FC<SubredditProgressCardProps> = ({
  subredditData,
  totalKeywords,
}) => {
  const keywordSearches = Object.values(subredditData.keyword_searches);
  const completedKeywords = keywordSearches.filter(k => k.status === 'done').length;
  const ongoingKeyword = keywordSearches.find(k => k.status === 'ongoing');
  const totalPosts = keywordSearches.reduce((sum, k) => sum + k.found_post_ids.length, 0);
  const percentage = totalKeywords > 0 ? (completedKeywords / totalKeywords) * 100 : 0;

  return (
    <div
      className="
        bg-white rounded-xl p-6 border-2 border-gray-200
        hover:border-blue-300 hover:shadow-xl
        transition-all duration-300
        animate-[slideInUp_400ms_ease-out]
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📊</div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              r/{subredditData.subreddit}
            </h3>
            <p className="text-sm text-gray-500">
              {completedKeywords}/{totalKeywords} keywords
            </p>
          </div>
        </div>
        <StatusBadge
          status={subredditData.status as Status}
          pulse={subredditData.status === 'ongoing'}
        />
      </div>

      {/* Progress Bar */}
      <ProgressBar percentage={percentage} height="md" animated className="mb-4" />

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-semibold">{totalPosts}</span>
          <span>posts found</span>
        </div>

        {ongoingKeyword && (
          <div className="flex items-center gap-2 text-blue-600 animate-pulse">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-medium">
              Searching "{ongoingKeyword.keyword}"
            </span>
          </div>
        )}

        {subredditData.status === 'pending' && (
          <span className="text-xs text-gray-400 italic">Waiting to start...</span>
        )}
      </div>
    </div>
  );
};

export const SubredditProgressCard = memo(SubredditProgressCardComponent);

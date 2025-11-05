'use client';

import { memo } from 'react';
import type { KeywordSearchObjective } from '@/types/scraper-cluster';

interface KeywordMatrixProps {
  keywords: string[];
  subreddits: string[];
  keywordSearchObjective: KeywordSearchObjective;
}

const KeywordMatrixComponent: React.FC<KeywordMatrixProps> = ({
  keywords,
  subreddits,
  keywordSearchObjective,
}) => {
  const getCellData = (subreddit: string, keyword: string) => {
    const subredditData = keywordSearchObjective.keyword_subreddit_searches[subreddit];
    if (!subredditData) return { status: 'pending', count: 0 };

    const keywordData = subredditData.keyword_searches[keyword];
    if (!keywordData) return { status: 'pending', count: 0 };

    return {
      status: keywordData.status,
      count: keywordData.found_post_ids.length,
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return '✅';
      case 'ongoing':
        return '⚡';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'ongoing':
        return 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse';
      default:
        return 'bg-gray-50 text-gray-400 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>🔑</span>
        Keyword Breakdown
        <span className="text-sm font-normal text-gray-500">
          ({keywords.length} keywords × {subreddits.length} subreddits)
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">
                Keyword
              </th>
              {subreddits.map((subreddit) => (
                <th
                  key={subreddit}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-200 min-w-[120px]"
                >
                  <div className="truncate">r/{subreddit}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keywords.map((keyword, keywordIndex) => (
              <tr
                key={keyword}
                className="hover:bg-gray-50 transition-colors"
                style={{
                  animationDelay: `${keywordIndex * 50}ms`,
                }}
              >
                <td className="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">"</span>
                    <span className="truncate max-w-[150px]">{keyword}</span>
                    <span className="text-gray-400">"</span>
                  </div>
                </td>
                {subreddits.map((subreddit) => {
                  const cellData = getCellData(subreddit, keyword);
                  return (
                    <td
                      key={`${subreddit}-${keyword}`}
                      className="px-4 py-3 text-center border-b border-gray-200"
                    >
                      <div
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5
                          rounded-lg border font-semibold text-xs
                          transition-all duration-300
                          ${getStatusColor(cellData.status)}
                        `}
                      >
                        <span>{getStatusIcon(cellData.status)}</span>
                        {cellData.status === 'done' ? (
                          <span>{cellData.count}</span>
                        ) : cellData.status === 'ongoing' ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const KeywordMatrix = memo(KeywordMatrixComponent);

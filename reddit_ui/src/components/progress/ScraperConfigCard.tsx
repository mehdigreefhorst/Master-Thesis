'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ScraperEntity } from '@/types/scraper-cluster';
import { scraperApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';

interface ScraperConfigCardProps {
  scraperData: ScraperEntity;
  scraperClusterId: string;
  onConfigUpdated: () => void;
}

const AGE_OPTIONS: Array<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'> = [
  'hour',
  'day',
  'week',
  'month',
  'year',
  'all'
];

const FILTER_OPTIONS: Array<'new' | 'hot' | 'top' | 'rising'> = [
  'new',
  'hot',
  'top',
  'rising'
];

const ScraperConfigCardComponent: React.FC<ScraperConfigCardProps> = ({
  scraperData,
  scraperClusterId,
  onConfigUpdated,
}) => {
  const authFetch = useAuthFetch();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [age, setAge] = useState(scraperData.age);
  const [filter, setFilter] = useState(scraperData.filter);
  const [postsPerKeyword, setPostsPerKeyword] = useState(scraperData.posts_per_keyword);

  const isInitialized = scraperData.status === 'initialized';

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await scraperApi.updateScraper(
        authFetch,
        scraperClusterId,
        age,
        postsPerKeyword,
        filter
      );

      setIsEditing(false);
      onConfigUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAge(scraperData.age);
    setFilter(scraperData.filter);
    setPostsPerKeyword(scraperData.posts_per_keyword);
    setIsEditing(false);
    setError(null);
  };

  const hasChanges =
    age !== scraperData.age ||
    filter !== scraperData.filter ||
    postsPerKeyword !== scraperData.posts_per_keyword;

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          Scraper Configuration
        </h2>
        {isInitialized && !isEditing && (
          <Button
            variant="secondary"
            onClick={() => setIsEditing(true)}
            className="text-sm"
          >
            Edit Configuration
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Age Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Age (posts to timeframe)
          </label>
          {isEditing ? (
            <select
              value={age}
              onChange={(e) => setAge(e.target.value as typeof age)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            >
              {AGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 font-medium">
              {age.charAt(0).toUpperCase() + age.slice(1)}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            How far back to search
          </p>
        </div>

        {/* Filter Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort Filter (reddit search bar toggle)
          </label>
          {isEditing ? (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 font-medium">
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Reddit sorting method
          </p>
        </div>

        {/* Posts Per Keyword Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Posts Per Keyword
          </label>
          {isEditing ? (
            <input
              type="number"
              min="1"
              max="100"
              value={postsPerKeyword}
              onChange={(e) => setPostsPerKeyword(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            />
          ) : (
            <div className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 font-medium">
              {postsPerKeyword}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Target posts per keyword
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      {/* Status indicator for non-initialized scrapers */}
      {!isInitialized && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ Configuration can only be edited when the scraper status is &quot;initialized&quot;
          </p>
        </div>
      )}
    </div>
  );
};

export const ScraperConfigCard = memo(ScraperConfigCardComponent);

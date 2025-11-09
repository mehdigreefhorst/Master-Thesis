'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { VirtualizedHorizontalGrid } from '@/components/sample/VirtualizedHorizontalGrid';
import { SelectionCounter } from '@/components/sample/SelectionCounter';
import { SubredditFilter } from '@/components/sample/SubredditFilter';
import { Button } from '@/components/ui/Button';
import { clusterApi, experimentApi } from '@/lib/api';
import { HeaderStep } from '@/components/layout/HeaderStep';

interface GetClusterUnitsResponse {
  cluster_unit_entities: ClusterUnitEntity[];
}

function SampleSelectorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const [posts, setPosts] = useState<ClusterUnitEntity[]>([]);
  const [sample, setSample] = useState<ClusterUnitEntity[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [sampleSize, setSampleSize] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const sampleId = searchParams.get('sample_id');
  const messageType = (searchParams.get('message_type') as 'post' | 'comment' | 'all') || 'all';

  // Extract unique subreddits from posts
  const uniqueSubreddits = useMemo(() => {
    const subreddits = new Set(posts.map(post => post.subreddit));
    return Array.from(subreddits).sort();
  }, [posts]);

  // Initialize selected subreddits when posts load (select all by default)
  useEffect(() => {
    if (posts.length > 0 && selectedSubreddits.size === 0) {
      setSelectedSubreddits(new Set(uniqueSubreddits));
    }
  }, [posts, uniqueSubreddits, selectedSubreddits.size]);

  // Filter posts by selected subreddits
  const filteredPosts = useMemo(() => {
    if (selectedSubreddits.size === 0 || selectedSubreddits.size === uniqueSubreddits.length) {
      return posts; // Show all if none selected or all selected
    }
    return posts.filter(post => selectedSubreddits.has(post.subreddit));
  }, [posts, selectedSubreddits, uniqueSubreddits.length]);

  // Fetch cluster units on mount
  useEffect(() => {
    async function fetchPosts() {
      if (!scraperClusterId) {
        setError('Missing scraper_cluster_id parameter');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await clusterApi.getClusterUnits(authFetch, scraperClusterId, "post")

        const data: GetClusterUnitsResponse = await response.json();
        setPosts(data.cluster_unit_entities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchSampleUnits() {
      if (!sampleId) {
        setError('Missing sample_id parameter');
        setIsLoading(false);
        return;
      }
      if (!scraperClusterId) {
        setError('Missing scraper_cluster_id parameter');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);

        const clusterUnitsEntities: ClusterUnitEntity[] = await experimentApi.getSampleUnits(authFetch, scraperClusterId)

        setSample(clusterUnitsEntities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setIsLoading(false);
      }
    
    }
    if (!sampleId) {
      fetchPosts();
    } else {
      fetchSampleUnits();

    }
    
  }, [scraperClusterId, messageType, authFetch]);

  // Toggle post selection
  const handleToggleSelect = useCallback((postId: string) => {
    setSelectedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  // Handle select sample button click - open modal
  const handleSelectSample = () => {
    if (selectedPosts.size === 0) {
      alert('Please select at least one post');
      return;
    }
    setShowSampleModal(true);
  };

  // Handle sample submission
  const handleSubmitSample = async () => {
    if (!scraperClusterId) {
      alert('Missing scraper cluster ID');
      return;
    }

    const sampleSizeNum = parseInt(sampleSize);
    if (isNaN(sampleSizeNum) || sampleSizeNum <= 0) {
      alert('Please enter a valid sample size');
      return;
    }

    if (sampleSizeNum > selectedPosts.size) {
      alert(`Sample size cannot be larger than the number of selected posts (${selectedPosts.size})`);
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedIds = Array.from(selectedPosts);

      await experimentApi.createSample(
        authFetch,
        scraperClusterId,
        selectedIds,
        sampleSizeNum
      );

      // Navigate to prompts page after successful submission
      router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create sample');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear all selections
  const handleClearSelection = useCallback(() => {
    setSelectedPosts(new Set());
  }, []);

  // Select all posts (optimized for large datasets)
  const handleSelectAll = useCallback(() => {
    // Use a single setState call with the complete Set
    setSelectedPosts(new Set(filteredPosts.map(post => post.id)));
  }, [filteredPosts]);

  // Subreddit filter handlers
  const handleToggleSubreddit = useCallback((subreddit: string) => {
    setSelectedSubreddits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subreddit)) {
        newSet.delete(subreddit);
      } else {
        newSet.add(subreddit);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllSubreddits = useCallback(() => {
    setSelectedSubreddits(new Set(uniqueSubreddits));
  }, [uniqueSubreddits]);

  const handleClearAllSubreddits = useCallback(() => {
    setSelectedSubreddits(new Set());
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading posts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Posts</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sample already exists - show sample view
  if (sample.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Fixed header with counter and action button */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1920px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between gap-6">
              {/* Left: Title and counter */}
              <div className="flex items-center gap-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Sample Size
                  </h1>
                  <p className="text-sm text-gray-600">
                    Viewing sample from cluster
                  </p>
                </div>
                <SelectionCounter
                  selectedCount={sample.length}
                  totalCount={sample.length}
                />
              </div>

              {/* Right: Next step button */}
              <div className="flex items-center gap-3">
                <Button onClick={() => router.push(`/dashboard?scraper_cluster_id=${scraperClusterId}`)} variant="secondary" size="lg">
                  ← Go Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`)}
                  className="animate-pulse"
                >
                  Go to Next Step
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content: Virtualized horizontal scroll grid - all posts pre-selected */}
        <div className="py-12">
          <VirtualizedHorizontalGrid
            posts={sample}
            selectedPosts={new Set(sample.map(post => post.id))}
            onToggleSelect={() => {}} // Disabled - all posts are in the sample
          />
        </div>

        {/* Help text */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Note:</span> All posts shown are part of your sample
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No Posts Found</h2>
          <p className="text-gray-600">
            No posts available for this cluster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed header with counter and action buttons */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Title and counter */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Select Sample Posts
                </h1>
                <p className="text-sm text-gray-600">
                  Choose posts to analyze from cluster
                  {filteredPosts.length < posts.length && (
                    <span className="ml-2 text-orange-600 font-medium">
                      (Showing {filteredPosts.length} of {posts.length})
                    </span>
                  )}
                </p>
              </div>
              <SelectionCounter
                selectedCount={selectedPosts.size}
                totalCount={filteredPosts.length}
              />
            </div>

            {/* Right: Filter and Action buttons */}
            <div className="flex items-center gap-3">
              <SubredditFilter
                subreddits={uniqueSubreddits}
                selectedSubreddits={selectedSubreddits}
                onToggleSubreddit={handleToggleSubreddit}
                onSelectAll={handleSelectAllSubreddits}
                onClearAll={handleClearAllSubreddits}
              />
              <div className="w-px h-8 bg-gray-300" />
              <Button
                variant="secondary"
                onClick={handleClearSelection}
                disabled={selectedPosts.size === 0}
              >
                Clear Selection
              </Button>
              <Button
                variant="secondary"
                onClick={handleSelectAll}
                disabled={selectedPosts.size === filteredPosts.length}
              >
                Select All
              </Button>
              <Button
                variant="primary"
                onClick={handleSelectSample}
                disabled={selectedPosts.size === 0}
                className={`
                  ${selectedPosts.size > 0 ? 'animate-pulse' : ''}
                `}
              >
                Select Sample ({selectedPosts.size})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: Virtualized horizontal scroll grid */}
      <div className="py-12">
        <VirtualizedHorizontalGrid
          posts={filteredPosts}
          selectedPosts={selectedPosts}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {/* Help text */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Tip:</span> Click on posts to select them, then click "Select Sample" to continue
          </p>
        </div>
      </div>

      {/* Sample Size Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Configure Sample Size
            </h2>
            <p className="text-gray-600 mb-6">
              You have selected <span className="font-semibold text-gray-900">{selectedPosts.size}</span> posts.
              Enter the sample size for your experiment.
            </p>

            <div className="mb-6">
              <label htmlFor="sampleSize" className="block text-sm font-medium text-gray-700 mb-2">
                Sample Size
              </label>
              <input
                id="sampleSize"
                type="number"
                min="1"
                max={selectedPosts.size}
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder={`Enter a number (max: ${selectedPosts.size})`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={isSubmitting}
              />
              <p className="mt-2 text-sm text-gray-500">
                The sample will be randomly selected from your chosen posts.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSampleModal(false);
                  setSampleSize('');
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitSample}
                disabled={isSubmitting || !sampleSize}
                className="flex-1"
              >
                {isSubmitting ? 'Creating Sample...' : 'Create Sample'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SampleSelectorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>

      <SampleSelectorPageContent />
    </Suspense>
  );
}

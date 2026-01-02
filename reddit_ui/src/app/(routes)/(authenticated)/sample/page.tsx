'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { VirtualizedHorizontalGrid } from '@/components/sample/VirtualizedHorizontalGrid';
import { SelectionCounter } from '@/components/sample/SelectionCounter';
import { SubredditFilter } from '@/components/sample/SubredditFilter';
import { KeywordFilter } from '@/components/sample/KeywordFilter';
import { Button } from '@/components/ui/Button';
import { clusterApi, experimentApi, scraperApi } from '@/lib/api';
import { HeaderStep } from '@/components/layout/HeaderStep';
import type { KeywordSearches } from '@/types/scraper-cluster';
import { SampleSizeModal } from '@/components/modals/SampleSizeModal';
import { useToast } from '@/components/ui/use-toast';

interface GetClusterUnitsResponse {
  cluster_unit_entities: ClusterUnitEntity[];
}

function SampleSelectorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const [posts, setPosts] = useState<ClusterUnitEntity[]>([]);
  const [sample, setSample] = useState<ClusterUnitEntity[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [maxSampleSize, setMaxSampleSize] = useState<number>(0);
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [keywordSearches, setKeywordSearches] = useState<KeywordSearches | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitializedSubreddits, setHasInitializedSubreddits] = useState(false);
  const [hasInitializedKeywords, setHasInitializedKeywords] = useState(false);

  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const sampleId = searchParams.get('sample_id');
  const messageType = (searchParams.get('message_type') as 'post' | 'comment' | 'all') || 'all';

  // Extract unique subreddits from posts
  const uniqueSubreddits = useMemo(() => {
    const subreddits = new Set(posts.map(post => post.subreddit));
    return Array.from(subreddits).sort();
  }, [posts]);

  // Extract unique keywords from keyword searches
  const uniqueKeywords = useMemo(() => {
    if (!keywordSearches) return [];
    return Object.keys(keywordSearches.keyword_search_post_ids).sort();
  }, [keywordSearches]);

  // Initialize selected subreddits when posts load (select all by default) - ONLY ONCE
  useEffect(() => {
    if (posts.length > 0 && !hasInitializedSubreddits && selectedSubreddits.size === 0) {
      setSelectedSubreddits(new Set(uniqueSubreddits));
      setHasInitializedSubreddits(true);
    }
  }, [posts, uniqueSubreddits, selectedSubreddits.size, hasInitializedSubreddits]);

  // Initialize selected keywords when keyword searches load (select all by default) - ONLY ONCE
  useEffect(() => {
    if (uniqueKeywords.length > 0 && !hasInitializedKeywords && selectedKeywords.size === 0) {
      setSelectedKeywords(new Set(uniqueKeywords));
      setHasInitializedKeywords(true);
    }
  }, [uniqueKeywords, selectedKeywords.size, hasInitializedKeywords]);

  // Filter posts by selected subreddits and keywords
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filter by subreddits - if none selected, show nothing
    if (selectedSubreddits.size === 0) {
      return [];
    } else if (selectedSubreddits.size < uniqueSubreddits.length) {
      filtered = filtered.filter(post => selectedSubreddits.has(post.subreddit));
    }

    // Filter by keywords - only show posts that match selected keyword searches
    // If none selected, show nothing
    if (keywordSearches) {
      if (selectedKeywords.size === 0) {
        return [];
      } else if (selectedKeywords.size < uniqueKeywords.length) {
        const allowedPostIds = new Set<string>();

        // Collect all post IDs from selected keywords
        selectedKeywords.forEach(keyword => {
          const postIds = keywordSearches.keyword_search_post_ids[keyword];
          if (postIds) {
            postIds.forEach(postId => allowedPostIds.add(postId));
          }
        });

        // Filter posts to only include those in allowed post IDs
        filtered = filtered.filter(post => allowedPostIds.has(post.post_id));
      }
    }

    return filtered;
  }, [posts, selectedSubreddits, uniqueSubreddits.length, selectedKeywords, uniqueKeywords.length, keywordSearches]);

  // Fetch keyword searches on mount
  useEffect(() => {
    async function fetchKeywordSearches() {
      if (!scraperClusterId) return;

      try {
        const data = await scraperApi.getKeywordSearches(authFetch, scraperClusterId);
        // The response is a single GetKeywordSearches object
        if (data?.keyword_search_post_ids) {
          setKeywordSearches(data);
          toast({
            title: "Success",
            description: "Keyword searches loaded successfully",
            variant: "success"
          });
        }
      } catch (err) {
        console.error('Failed to fetch keyword searches:', err);
        toast({
          title: "Error",
          description: `Failed to fetch keyword searches: ${err instanceof Error ? err.message : String(err)}`,
          variant: "destructive"
        });
      }
    }

    fetchKeywordSearches();
  }, [scraperClusterId, authFetch]);

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

        const cluster_unit_entities: ClusterUnitEntity[] = await clusterApi.getClusterUnits(authFetch, scraperClusterId, "post")
        setPosts(cluster_unit_entities);
        toast({
          title: "Success",
          description: "Posts loaded successfully",
          variant: "success"
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch posts';
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
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

        const clusterUnitsEntities: ClusterUnitEntity[] = await experimentApi.getSampleUnits(authFetch, scraperClusterId, "classify_cluster_units")

        setSample(clusterUnitsEntities);
        toast({
          title: "Success",
          description: "Sample units loaded successfully",
          variant: "success"
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch posts';
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
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

    // Calculate total number of comments across all selected posts
    let totalComments = 0;
    const selectedPostObjects = filteredPosts.filter(post => selectedPosts.has(post.id));

    selectedPostObjects.forEach(post => {
      // Add the number of comments for this post (default to 0 if null)
      totalComments += post.total_nested_replies || 0;
    });

    setMaxSampleSize(totalComments);
    setShowSampleModal(true);
  };

  // Handle sample submission
  const handleSubmitSample = async (sampleSize: number, smartSampling: boolean) => {
    if (!scraperClusterId) {
      toast({
        title: "Error",
        description: "Missing scraper cluster ID",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedIds = Array.from(selectedPosts);

      await experimentApi.createSample(
        authFetch,
        scraperClusterId,
        selectedIds,
        sampleSize,
        smartSampling
      );

      toast({
        title: "Success",
        description: "Sample created successfully",
        variant: "success"
      });

      // Close modal and navigate
      setShowSampleModal(false);
      router.push(`/experiments?scraper_cluster_id=${scraperClusterId}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create sample';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
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

  // Keyword filter handlers
  const handleToggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyword)) {
        newSet.delete(keyword);
      } else {
        newSet.add(keyword);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllKeywords = useCallback(() => {
    setSelectedKeywords(new Set(uniqueKeywords));
  }, [uniqueKeywords]);

  const handleClearAllKeywords = useCallback(() => {
    setSelectedKeywords(new Set());
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
                  nameTextSelected='cluster unit entities selected'
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
              {uniqueKeywords.length > 0 && (
                <KeywordFilter
                  keywords={uniqueKeywords}
                  selectedKeywords={selectedKeywords}
                  onToggleKeyword={handleToggleKeyword}
                  onSelectAll={handleSelectAllKeywords}
                  onClearAll={handleClearAllKeywords}
                />
              )}
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

      {/* Main content: Virtualized horizontal scroll grid or empty state */}
      {filteredPosts.length === 0 ? (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white border-2 border-orange-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No Posts Match Filters</h2>
            <p className="text-gray-600 mb-4">
              {selectedSubreddits.size === 0 && selectedKeywords.size === 0
                ? 'Please select at least one subreddit and one keyword to view posts.'
                : selectedSubreddits.size === 0
                ? 'Please select at least one subreddit to view posts.'
                : selectedKeywords.size === 0
                ? 'Please select at least one keyword to view posts.'
                : 'No posts match your current filter selection. Try adjusting your filters.'}
            </p>
            <div className="flex gap-2 justify-center">
              {selectedSubreddits.size === 0 && (
                <button
                  onClick={handleSelectAllSubreddits}
                  className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  Select All Subreddits
                </button>
              )}
              {selectedKeywords.size === 0 && uniqueKeywords.length > 0 && (
                <button
                  onClick={handleSelectAllKeywords}
                  className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  Select All Keywords
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12">
          <VirtualizedHorizontalGrid
            posts={filteredPosts}
            selectedPosts={selectedPosts}
            onToggleSelect={handleToggleSelect}
          />
        </div>
      )}

      {/* Help text */}
      {filteredPosts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Tip:</span> Click on posts to select them, then click "Select Sample" to continue
            </p>
          </div>
        </div>
      )}

      {/* Sample Size Modal */}
      <SampleSizeModal
        isOpen={showSampleModal}
        selectedPostsCount={selectedPosts.size}
        maxSampleSize={maxSampleSize}
        isSubmitting={isSubmitting}
        onClose={() => setShowSampleModal(false)}
        onSubmit={handleSubmitSample}
      />
      
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

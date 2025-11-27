'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { StatCard } from '@/components/progress/StatCard';
import { SubredditProgressCard } from '@/components/progress/SubredditProgressCard';
import { KeywordMatrix } from '@/components/progress/KeywordMatrix';
import { ScraperConfigCard } from '@/components/progress/ScraperConfigCard';
import { Button } from '@/components/ui/Button';
import type { ScraperEntity, ScrapingProgressStats } from '@/types/scraper-cluster';
import { HeaderStep } from '@/components/layout/HeaderStep';
import { clusterApi, scraperApi, scraperClusterApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { Modal } from '@/components/ui/Modal';
import { AsymptoticProgressBar } from '@/components/ui/AsymptoticProgressBar';

export default function ScrapingProgressPage() {
  const searchParams = useSearchParams();
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const router = useRouter()
  const authFetch = useAuthFetch();

  const [scraperData, setScraperData] = useState<ScraperEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(new Date(Date.now() - 600000)); // Started 10 min ago
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showPreparationModal, setShowPreparationModal] = useState(false);
  const [isPreparingCluster, setIsPreparingCluster] = useState(false);

  // Fetch scraper data
  const fetchScraperData = useCallback(async () => {
    if (!scraperClusterId) {
      setError('No scraper cluster ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data: ScraperEntity = await scraperApi.getScraperByScraperClusterId(authFetch, scraperClusterId);
      if (data?.error) {
        setError(data.error)
        return
      }
      setScraperData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scraper data');
    } finally {
      setLoading(false);
    }
  }, [scraperClusterId, authFetch]);

  // Initial fetch on mount
  useEffect(() => {
    fetchScraperData();
  }, [fetchScraperData]);

  // Polling for real-time updates when status is ongoing
  useEffect(() => {
    if (scraperData?.status === 'ongoing') {
      const interval = setInterval(fetchScraperData, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [scraperData?.status, fetchScraperData]);

  // Handle button actions
  const handleStartOrContinue = async () => {
    if (!scraperClusterId) return;

    try {
      setIsActionLoading(true);
      await scraperApi.startScraper(authFetch, scraperClusterId);
      // Small delay to allow backend to update status
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchScraperData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scraper');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!scraperClusterId) return;

    try {
      setIsActionLoading(true);
      await scraperApi.pauseScraper(authFetch, scraperClusterId);
      // Small delay to allow backend to update status
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchScraperData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause scraper');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleContinueToAnalysis = async () => {
    if (!scraperClusterId) return;

    try {
      setIsActionLoading(true);
      setShowPreparationModal(true);
      setIsPreparingCluster(true);

      // Start cluster preparation
      await clusterApi.prepareCluster(authFetch, scraperClusterId);

      // Poll for cluster preparation status
      const checkClusterStatus = async () => {
        try {
          const scraperCluster = await scraperClusterApi.getScraperClusterById(authFetch, scraperClusterId);

          // Check if cluster_prep stage is completed
          if (scraperCluster.stages?.cluster_prep === 'completed') {
            setIsPreparingCluster(false);
            setShowPreparationModal(false);
            router.push(`/sample?scraper_cluster_id=${scraperClusterId}`);
            return true;
          }
          return false;
        } catch (err) {
          console.error('Error checking cluster status:', err);
          return false;
        }
      };

      // Poll every 2 seconds
      const pollInterval = setInterval(async () => {
        const isComplete = await checkClusterStatus();
        if (isComplete) {
          clearInterval(pollInterval);
        }
      }, 2000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isPreparingCluster) {
          setError('Cluster preparation timed out. Please try again.');
          setShowPreparationModal(false);
          setIsPreparingCluster(false);
          setIsActionLoading(false);
        }
      }, 120000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare the cluster');
      setShowPreparationModal(false);
      setIsPreparingCluster(false);
      setIsActionLoading(false);
    }
  }

  // Loading state
  if (loading && !scraperData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading scraper data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !scraperData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }
  console.log("scraperData = ", scraperData)
  // No data state
  if (!scraperData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">No scraper data found</div>
        </div>
      </div>
    );
  }

  // Button configuration based on status
  const getButtonConfig = () => {
    switch (scraperData.status) {
      case 'initialized':
        return {
          text: '▶ Start Scraper',
          disabled: isActionLoading,
          variant: 'primary' as const,
          onClick: handleStartOrContinue
        };
      case 'ongoing':
        return {
          text: '⏸ Pause',
          disabled: isActionLoading,
          variant: 'secondary' as const,
          onClick: handlePause
        };
      case 'paused':
        return {
          text: '▶ Continue',
          disabled: isActionLoading,
          variant: 'primary' as const,
          onClick: handleStartOrContinue
        };
      case 'error':
        return {
          text: '❌ Error',
          disabled: true,
          variant: 'secondary' as const,
          onClick: () => {}
        };
      case 'completed':
        return {
          text: '✓ Completed',
          disabled: true,
          variant: 'secondary' as const,
          onClick: () => {}
        };
      default:
        return {
          text: 'Unknown',
          disabled: true,
          variant: 'secondary' as const,
          onClick: () => {}
        };
    }
  };

  const buttonConfig = getButtonConfig();

  // Calculate progress stats
  const stats: ScrapingProgressStats = (() => {
    const totalSubreddits = scraperData.subreddits.length;
    const totalKeywords = scraperData.keywords.length;
    const totalEstimatedPosts = totalSubreddits * totalKeywords * scraperData.posts_per_keyword;

    let completedSubreddits = 0;
    let completedKeywords = 0;
    let actualPostsScraped = 0;

    Object.values(scraperData.keyword_search_objective.keyword_subreddit_searches).forEach((subreddit) => {
      if (subreddit.status === 'done') completedSubreddits++;

      Object.values(subreddit.keyword_searches).forEach((keyword) => {
        if (keyword.status === 'done') completedKeywords++;
        actualPostsScraped += keyword.found_post_ids.length;
      });
    });

    const elapsedTime = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const progress = actualPostsScraped / totalEstimatedPosts;
    const estimatedTimeRemaining = progress > 0 ? Math.floor((elapsedTime / progress) - elapsedTime) : 0;

    return {
      totalSubreddits,
      completedSubreddits,
      totalKeywords,
      completedKeywords,
      totalEstimatedPosts,
      actualPostsScraped,
      elapsedTime,
      estimatedTimeRemaining,
    };
  })();

  const overallProgress = stats.totalEstimatedPosts > 0
    ? (stats.actualPostsScraped / stats.totalEstimatedPosts) * 100
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <HeaderStep
          title='Scraping Progress'
          subtitle='View, monitor, and control the scraper'
          children={
              <div className="flex justify-end">
                <Button
              variant={buttonConfig.variant}
              px='px-40'
              disabled={buttonConfig.disabled}
              onClick={buttonConfig.onClick}
            >
              {buttonConfig.text}
            </Button>
            {scraperData.status === 'completed' &&
              <Button
                variant="primary"
                className='ml-4'
                disabled={isActionLoading || scraperData.status !== 'completed'}
                onClick={handleContinueToAnalysis}
              >
                {isActionLoading ? 'Preparing...' : 'Continue to Analysis →'}
              </Button>
            }
          
          
            
            </div>
            }
          />
        {/* Action Button */}


        {/* Scraper Configuration */}
        <ScraperConfigCard
          scraperData={scraperData}
          scraperClusterId={scraperClusterId!}
          onConfigUpdated={fetchScraperData}
        />

        {/* Overall Progress Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg animate-[slideInDown_500ms_ease-out]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Progress</h2>
          <ProgressBar percentage={overallProgress} height="lg" showLabel animated />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <span className="text-gray-700">
                <strong className="text-2xl text-blue-600">{stats.actualPostsScraped}</strong>
                {' / '}
                <span className="text-lg">{stats.totalEstimatedPosts}</span>
                {' '}estimated posts scraped
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              <span className="text-gray-700">
                Elapsed: <strong>{formatTime(stats.elapsedTime)}</strong>
                {' • '}
                ETA: ~<strong>{formatTime(stats.estimatedTimeRemaining)}</strong> remaining
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            }
            label="Subreddits"
            value={`${stats.completedSubreddits}/${stats.totalSubreddits}`}
            subtext="completed"
            color="blue"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            }
            label="Keywords"
            value={`${stats.completedKeywords}/${stats.totalKeywords * stats.totalSubreddits}`}
            subtext="searches completed"
            color="purple"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            }
            label="Posts Found"
            value={stats.actualPostsScraped}
            subtext={`~${Math.round(overallProgress)}% of estimate`}
            color="green"
            trend="up"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            }
            label="Time Remaining"
            value={formatTime(stats.estimatedTimeRemaining)}
            subtext={`${formatTime(stats.elapsedTime)} elapsed`}
            color="orange"
          />
        </div>

        {/* Subreddit Progress */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Subreddit Progress ({stats.totalSubreddits} total)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(scraperData.keyword_search_objective.keyword_subreddit_searches).map((subreddit, index) => (
              <div
                key={subreddit.subreddit}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <SubredditProgressCard
                  subredditData={subreddit}
                  totalKeywords={scraperData.keywords.length}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Keyword Matrix */}
        <KeywordMatrix
          keywords={scraperData.keywords}
          subreddits={scraperData.subreddits}
          keywordSearchObjective={scraperData.keyword_search_objective}
        />
      </div>

      {/* Cluster Preparation Modal */}
      <Modal isOpen={showPreparationModal} showCloseButton={false} blurBackground={true}>
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 border-t-4 border-t-transparent"></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Preparing Cluster Data
          </h3>
          <p className="text-gray-600 mb-6">
            Analyzing and organizing your scraped data for analysis...
          </p>

          {/* Asymptotic Progress Bar */}
          <div className="mb-4">
            <AsymptoticProgressBar
              isActive={isPreparingCluster}
              duration={60000}
              maxProgress={95}
            />
          </div>

          <p className="text-sm text-gray-500">
            This may take a few moments. Please don't close this window.
          </p>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { StatCard } from '@/components/progress/StatCard';
import { SubredditProgressCard } from '@/components/progress/SubredditProgressCard';
import { KeywordMatrix } from '@/components/progress/KeywordMatrix';
import { ActivityLog, LogEntry } from '@/components/progress/ActivityLog';
import { Button } from '@/components/ui/Button';
import type { ScraperEntity, ScrapingProgressStats } from '@/types/scraper-cluster';
import { HeaderStep } from '@/components/layout/HeaderStep';

// Mock data for static demo
const mockScraperData: ScraperEntity = {
  id: '1',
  user_id: 'user1',
  keywords: ['pain points', 'frustration', 'struggling', 'need help', 'alternatives'],
  subreddits: ['productivity', 'SaaS', 'Entrepreneur', 'startups'],
  keyword_search_objective: {
    keyword_subreddit_searches: {
      productivity: {
        subreddit: 'productivity',
        keyword_searches: {
          'pain points': { keyword: 'pain points', found_post_ids: ['1', '2', '3', '4', '5', '6', '7', '8'], status: 'done' },
          'frustration': { keyword: 'frustration', found_post_ids: ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'], status: 'done' },
          'struggling': { keyword: 'struggling', found_post_ids: ['21', '22', '23', '24', '25', '26', '27'], status: 'done' },
          'need help': { keyword: 'need help', found_post_ids: ['28', '29', '30', '31', '32'], status: 'done' },
          'alternatives': { keyword: 'alternatives', found_post_ids: ['33', '34', '35'], status: 'done' },
        },
        status: 'done',
      },
      SaaS: {
        subreddit: 'SaaS',
        keyword_searches: {
          'pain points': { keyword: 'pain points', found_post_ids: [], status: 'ongoing' },
          'frustration': { keyword: 'frustration', found_post_ids: Array(15).fill('').map((_, i) => `saas-${i}`), status: 'done' },
          'struggling': { keyword: 'struggling', found_post_ids: Array(13).fill('').map((_, i) => `saas-strug-${i}`), status: 'done' },
          'need help': { keyword: 'need help', found_post_ids: Array(14).fill('').map((_, i) => `saas-help-${i}`), status: 'done' },
          'alternatives': { keyword: 'alternatives', found_post_ids: [], status: 'pending' },
        },
        status: 'ongoing',
      },
      Entrepreneur: {
        subreddit: 'Entrepreneur',
        keyword_searches: {
          'pain points': { keyword: 'pain points', found_post_ids: [], status: 'pending' },
          'frustration': { keyword: 'frustration', found_post_ids: [], status: 'pending' },
          'struggling': { keyword: 'struggling', found_post_ids: [], status: 'pending' },
          'need help': { keyword: 'need help', found_post_ids: [], status: 'pending' },
          'alternatives': { keyword: 'alternatives', found_post_ids: [], status: 'pending' },
        },
        status: 'pending',
      },
      startups: {
        subreddit: 'startups',
        keyword_searches: {
          'pain points': { keyword: 'pain points', found_post_ids: [], status: 'pending' },
          'frustration': { keyword: 'frustration', found_post_ids: [], status: 'pending' },
          'struggling': { keyword: 'struggling', found_post_ids: [], status: 'pending' },
          'need help': { keyword: 'need help', found_post_ids: [], status: 'pending' },
          'alternatives': { keyword: 'alternatives', found_post_ids: [], status: 'pending' },
        },
        status: 'pending',
      },
    },
  },
  status: 'ongoing',
  age: 'month',
  filter: 'top',
  posts_per_keyword: 30,
};

const mockLogs: LogEntry[] = [
  { id: '1', timestamp: new Date(Date.now() - 600000), type: 'info', message: 'Started scraping process for 4 subreddits and 5 keywords' },
  { id: '2', timestamp: new Date(Date.now() - 540000), type: 'info', message: 'Searching "pain points" in r/productivity...' },
  { id: '3', timestamp: new Date(Date.now() - 480000), type: 'success', message: 'Completed keyword "pain points" in r/productivity (8 posts)' },
  { id: '4', timestamp: new Date(Date.now() - 420000), type: 'info', message: 'Searching "frustration" in r/productivity...' },
  { id: '5', timestamp: new Date(Date.now() - 360000), type: 'success', message: 'Completed keyword "frustration" in r/productivity (12 posts)' },
  { id: '6', timestamp: new Date(Date.now() - 300000), type: 'success', message: 'Completed keyword "struggling" in r/productivity (7 posts)' },
  { id: '7', timestamp: new Date(Date.now() - 240000), type: 'success', message: 'Completed keyword "need help" in r/productivity (5 posts)' },
  { id: '8', timestamp: new Date(Date.now() - 180000), type: 'success', message: 'Completed keyword "alternatives" in r/productivity (3 posts)' },
  { id: '9', timestamp: new Date(Date.now() - 120000), type: 'success', message: 'Completed r/productivity (35 total posts)' },
  { id: '10', timestamp: new Date(Date.now() - 60000), type: 'info', message: 'Searching "frustration" in r/SaaS...' },
  { id: '11', timestamp: new Date(Date.now() - 30000), type: 'success', message: 'Completed keyword "frustration" in r/SaaS (15 posts)' },
  { id: '12', timestamp: new Date(Date.now() - 15000), type: 'success', message: 'Completed keyword "struggling" in r/SaaS (13 posts)' },
  { id: '13', timestamp: new Date(Date.now() - 5000), type: 'success', message: 'Completed keyword "need help" in r/SaaS (14 posts)' },
  { id: '14', timestamp: new Date(), type: 'info', message: 'Searching "pain points" in r/SaaS...' },
];

export default function ScrapingProgressPage() {
  const [scraperData] = useState<ScraperEntity>(mockScraperData);
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [startTime] = useState(new Date(Date.now() - 600000)); // Started 10 min ago

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
          title='Scraping in Progress' 
          subtitle='View, monitor, pause the scraper' 
          children={
            <Button variant="secondary" px='px-40' disabled>
              ⏸ Pause
            </Button>}
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

        {/* Activity Log */}
        <ActivityLog entries={logs} height="400px" />

        {/* Action Button */}
        <div className="flex justify-end">
          <Button variant="primary" disabled={scraperData.status !== 'completed'}>
            Continue to Analysis →
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Type definitions for Scraper Cluster entities
 */

export type StatusType = 'initialized' | 'ongoing' | 'paused' | 'completed' | 'error';

export interface StageStatus {
  initialized: StatusType;
  scraping: StatusType;
  cluster_prep: StatusType;
  cluster_filter: StatusType;
  cluster_enrich: StatusType;
  clustering: StatusType;
}

export interface ScraperClusterEntity {
  id: string;
  user_id: string;
  cluster_entity_id: string | null;
  scraper_entity_id: string | null;
  stages: StageStatus;
}

// API Response types
export interface GetScraperClustersResponse {
  scraper_clusters: ScraperClusterEntity[];
}

export interface CreateScraperClusterResponse {
  scraper_cluster_id: string;
}

// Scraper progress tracking types
export type KeywordSearchStatus = 'pending' | 'ongoing' | 'done';
export type SubredditStatus = 'pending' | 'ongoing' | 'done';

export interface KeywordSearch {
  keyword: string;
  found_post_ids: string[];
  status: KeywordSearchStatus;
}

export interface KeywordSearchSubreddit {
  subreddit: string;
  keyword_searches: Record<string, KeywordSearch>;
  status: SubredditStatus;
}

export interface KeywordSearchObjective {
  keyword_subreddit_searches: Record<string, KeywordSearchSubreddit>;
}

export interface ScraperEntity {
  id: string;
  user_id: string;
  keywords: string[];
  subreddits: string[];
  keyword_search_objective: KeywordSearchObjective;
  status: StatusType;
  age: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  filter: 'new' | 'hot' | 'top' | 'rising';
  posts_per_keyword: number;
}

export interface ScrapingProgressStats {
  totalSubreddits: number;
  completedSubreddits: number;
  totalKeywords: number;
  completedKeywords: number;
  totalEstimatedPosts: number;
  actualPostsScraped: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

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

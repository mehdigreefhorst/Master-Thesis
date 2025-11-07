/**
 * API utility for making authenticated requests to the Flask backend
 */

import { useAuthFetch } from "@/utils/fetch";
import type { ScraperClusterEntity, ScraperEntity } from "@/types/scraper-cluster";
import { ScraperClusterTable } from "@/components/scraper";
import { ClusterUnitEntity } from "@/types/cluster-unit";

const API_BASE_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5001';

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get JWT token from localStorage
 * TODO: Replace with your actual token storage mechanism
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add JWT token if authentication is required
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || errorData.message || `Request failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * API client for cluster-related operations
 */
export const clusterApi = {
  /**
   * Get all cluster units for a scraper cluster
   */
  async getClusterUnits(authFetch: ReturnType<typeof useAuthFetch>, scraperClusterId: string, reddit_message_type: "post" | "comment" | "all" = "all") {
    return await authFetch(`/clustering/get_cluster_units?scraper_cluster_id=${scraperClusterId}&reddit_message_type=${reddit_message_type}`)

    // return apiRequest<{ cluster_unit_entities: any[] }>(
    //   `/clustering/get_cluster_units?scraper_cluster_id=${scraperClusterId}`
    // );
  },
  async updateClusterUnitGroundTruth(
    authFetch: ReturnType<typeof useAuthFetch>,
    cluster_entity_id: string,
    groundTruthCategory: string,
    groundTruth: boolean
  ){
    return authFetch(`/clustering/update_ground_truth`,
      {method: "PUT",
        body: {
          "cluster_entity_id": cluster_entity_id,
          "ground_truth_category": groundTruthCategory,
          "ground_truth": groundTruth}})
  }
};

/**
 * API client for scraper cluster operations
 */
export const scraperClusterApi = {
  /**
   * Get all scraper clusters for the current user
   * @returns Array of scraper cluster entities
   */
  async getScraperClusters(
    authFetch: ReturnType<typeof useAuthFetch>
  ): Promise<ScraperClusterEntity[]> {
    const data =  await authFetch('/scraper_cluster/');
    return await data.json()
  },

  /**
   * Get a single scraper cluster by ID
   * @returns Single scraper cluster entity
   */
  async getScraperClusterById(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ): Promise<ScraperClusterEntity> {
    const data = await authFetch(`/scraper_cluster/${scraperClusterId}`);
    return data.json()
  },

  /**
   * Create a new scraper cluster with problem description and target audience
   * @returns Object with scraper_cluster_id
   */
  async createScraperCluster(
    authFetch: ReturnType<typeof useAuthFetch>,
    problemExplorationDescription: string,
    targetAudience: string
  ): Promise<{ scraper_cluster_id: string }> {
    const data =  await authFetch('/scraper_cluster/', {
      method: 'POST',
      body: {
        problem_exporation_description: problemExplorationDescription,
        target_audience: targetAudience
      }
    });
    return await data.json()
  }
};

/**
 * API client for scraper operations
 */
export const scraperApi = {
  /**
   * Get all scrapers for the current user
   * @returns Array of scraper entities
   */
  async getScrapers(
    authFetch: ReturnType<typeof useAuthFetch>
  ): Promise<ScraperEntity[]> {
    const data =  await authFetch('/scraper/');
    return await data.json()
  },

  /**
   * Get scraper by scraper cluster ID
   * @returns Single scraper entity
   */
  async getScraperByClusterId(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ): Promise<ScraperEntity> {
    const data = await authFetch(`/scraper?scraper_cluster_id=${scraperClusterId}`);
    return await data.json()
  },

  /**
   * Create a new scraper instance
   * @returns Object with scraper_id
   */
  async createScraper(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string,
    keywords: string[],
    subreddits: string[]
  ): Promise<{ scraper_id: string }> {
    const data = await authFetch('/scraper/', {
      method: 'POST',
      body: {
        scraper_cluster_id: scraperClusterId,
        keywords,
        subreddits
      }
    });
    return await data.json()
  },

  /**
   * Start scraping
   * @returns Success message
   */
  async startScraper(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ): Promise<{ message: string }> {
    const data = await authFetch('/scraper/start', {
      method: 'PUT',
      body: {
        scraper_cluster_id: scraperClusterId
      }
    });
    return await data.json()
  }
};

/**
 * API client for experiment operations
 */

export const experimentApi = {
  /**
   * Create a sample from selected posts
   */
  async createSample(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string,
    pickedPostsClusterUnitIds: string[],
    sampleSize: number
  ) {
    return await authFetch('/experiment/create_sample', {
      method: 'POST',
      body: {
        scraper_cluster_id: scraperClusterId,
        picked_posts_cluster_unit_ids: pickedPostsClusterUnitIds,
        sample_size: sampleSize
      }
    });
  },

  async parseRawPrompt(
    authFetch: ReturnType<typeof useAuthFetch>,
    clusterUnitId: string,
    prompt: string,
  ): Promise<string> {
    const data =  await authFetch('/experiment/parse_raw_prompt', {
      method: 'POST',
      body: {
        cluster_unit_id: clusterUnitId,
        prompt: prompt,
      }
    });
    return await data.json()

    
  },

  /**
   * Get all prompts
   */
  async getPrompts(authFetch: ReturnType<typeof useAuthFetch>) {
    return await authFetch('/experiment/get_prompts');
  },
  async getSampleUnits(authFetch: ReturnType<typeof useAuthFetch>, scraperClusterId: string): Promise<ClusterUnitEntity[]> {
    const data = await authFetch(`/experiment/get_sample_units?scraper_cluster_id=${scraperClusterId}`);
    return await data.json()
  },
  async createPrompt(
    authFetch: ReturnType<typeof useAuthFetch>,
    system_prompt: string,
    prompt: string,
    category: "classify_cluster_units" | "rewrite_cluster_unit_standalone" | "summarize_prediction_notes"
  ){
    const data =  await authFetch('/experiment/create_prompt', {
      method: 'POST',
      body: {
        system_prompt: system_prompt,
        prompt: prompt,
        category: category,
      }
    });
    return await data.json()
  },
  async createExperiment(
    authFetch: ReturnType<typeof useAuthFetch>,
    prompt_id: string,
    scraperClusterId: string,
    model: string,
    runs_per_unit: number,
    reasoning_effort: string | null,
  ){
    const data = await authFetch('/experiment', {
      method: 'POST',
      body: {
        prompt_id: prompt_id,
        scraper_cluster_id: scraperClusterId,
        model: model,
        runs_per_unit,
        reasoning_effort: reasoning_effort
      }
    })
    return await data.json()

  },

  /**
   * Get all experiments for a scraper cluster
   */
  async getExperiments(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ) {
    const data = await authFetch(`/experiment?scraper_cluster_id=${scraperClusterId}`);
    return await data.json();
  }
};


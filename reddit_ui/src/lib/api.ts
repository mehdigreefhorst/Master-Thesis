/**
 * API utility for making authenticated requests to the Flask backend
 */

import { useAuthFetch } from "@/utils/fetch";
import type { KeywordSearches, ScraperClusterEntity, ScraperEntity } from "@/types/scraper-cluster";
import { ScraperClusterTable } from "@/components/scraper";
import { ClusterUnitEntity, ClusterUnitEntityCategory } from "@/types/cluster-unit";
import { SampleEntity } from "@/types/sample";
import { UserProfile } from "@/types/user";

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
  async getClusterUnits(authFetch: ReturnType<typeof useAuthFetch>, scraperClusterId: string, reddit_message_type: "post" | "comment" | "all" = "all"): Promise<ClusterUnitEntity[]> {
    const data =  await authFetch(`/clustering/get_cluster_units?scraper_cluster_id=${scraperClusterId}&reddit_message_type=${reddit_message_type}`)
    return await data.json()

  },
  async updateClusterUnitGroundTruth(
    authFetch: ReturnType<typeof useAuthFetch>,
    cluster_entity_id: string,
    groundTruthCategory: keyof ClusterUnitEntityCategory,
    groundTruth: boolean
  ){
    return authFetch(`/clustering/update_ground_truth`,
      {method: "PUT",
        body: {
          "cluster_entity_id": cluster_entity_id,
          "ground_truth_category": groundTruthCategory,
          "ground_truth": groundTruth}})
  },
  async prepareCluster(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraper_cluster_id: string
  ): Promise<ScraperClusterEntity[]> {
    const data = await authFetch("/clustering/prepare_cluster",
      {method: "POST",
        body: {
          scraper_cluster_id: scraper_cluster_id
        }
      }
    );
    return await data.json()
  },

  /**
   * Filter cluster units based on various criteria
   */
  async filterClusterUnits(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string,
    filters: {
      reddit_message_type?: "post" | "comment" | "all";
      subreddits?: string[];
      authors?: string[];
      upvotes_min?: number;
      upvotes_max?: number;
      downvotes_min?: number;
      downvotes_max?: number;
      has_ground_truth?: boolean;
      has_predictions?: boolean;
      ground_truth_labels?: string[];
      predicted_labels?: string[];
      experiment_id?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
      limit?: number;
      skip?: number;
    }
  ): Promise<{
    cluster_units: ClusterUnitEntity[];
    total_count: number;
    returned_count: number;
    skip: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    params.append('scraper_cluster_id', scraperClusterId);

    if (filters.reddit_message_type) {
      params.append('reddit_message_type', filters.reddit_message_type);
    }
    if (filters.subreddits?.length) {
      filters.subreddits.forEach(s => params.append('subreddits', s));
    }
    if (filters.authors?.length) {
      filters.authors.forEach(a => params.append('authors', a));
    }
    if (filters.upvotes_min !== undefined) {
      params.append('upvotes_min', filters.upvotes_min.toString());
    }
    if (filters.upvotes_max !== undefined) {
      params.append('upvotes_max', filters.upvotes_max.toString());
    }
    if (filters.downvotes_min !== undefined) {
      params.append('downvotes_min', filters.downvotes_min.toString());
    }
    if (filters.downvotes_max !== undefined) {
      params.append('downvotes_max', filters.downvotes_max.toString());
    }
    if (filters.has_ground_truth !== undefined) {
      params.append('has_ground_truth', filters.has_ground_truth.toString());
    }
    if (filters.has_predictions !== undefined) {
      params.append('has_predictions', filters.has_predictions.toString());
    }
    if (filters.ground_truth_labels?.length) {
      filters.ground_truth_labels.forEach(l => params.append('ground_truth_labels', l));
    }
    if (filters.predicted_labels?.length) {
      filters.predicted_labels.forEach(l => params.append('predicted_labels', l));
    }
    if (filters.experiment_id) {
      params.append('experiment_id', filters.experiment_id);
    }
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }
    if (filters.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.skip !== undefined) {
      params.append('skip', filters.skip.toString());
    }

    const data = await authFetch(`/clustering/filter_cluster_units?${params.toString()}`);
    return await data.json();
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
  },
  async updateScraperCluster(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string,
    problemExplorationDescription: string,
    targetAudience: string,
    keywords: string[],
    subreddits: string[]

  ):Promise<{ scraper_cluster_id: string }> {
    const data =  await authFetch('/scraper_cluster/', {
      method: 'PUT',
      body: {
        scraper_cluster_id:scraperClusterId,
        problem_exporation_description: problemExplorationDescription,
        target_audience: targetAudience,
        keywords: keywords,
        subreddits: subreddits
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
  async getScraperByScraperClusterId(
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
  },

  /**
   * Pause scraping
   * @returns Success message
   */
  async pauseScraper(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ): Promise<{ message: string }> {
    const data = await authFetch('/scraper/pause', {
      method: 'PUT',
      body: {
        scraper_cluster_id: scraperClusterId
      }
    });
    return await data.json()
  },
  async getKeywordSearches(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraper_cluster_id: string
  ): Promise<KeywordSearches> {
    const data = await authFetch(`/scraper/get_keyword_searches?scraper_cluster_id=${scraper_cluster_id}`);
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
  async continueExperiment(
    authFetch: ReturnType<typeof useAuthFetch>,
    experiment_id: string
  ): Promise<Response> {
    const data = await authFetch(`/experiment/continue_experiment?experiment_id=${experiment_id}`, {
      method: 'POST'
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
  },

  /**
   * Get a single experiment by ID
   */
  async getExperiment(
    authFetch: ReturnType<typeof useAuthFetch>,
    experimentId: string
  ) {
    const data = await authFetch(`/experiment/${experimentId}`);
    return await data.json();
  },

  /**
   * Get a sample by ID
   */
  async getSampleEntity(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ): Promise<SampleEntity> {
    const data = await authFetch(`/experiment/sample?scraper_cluster_id=${scraperClusterId}`);
    return await data.json();
  },
  async completeSampleLabeledStatus(
    authFetch: ReturnType<typeof useAuthFetch>,
    scraperClusterId: string
  ): Promise<Response> {
    const data = await authFetch(`/experiment/complete_sample_labeled_status?scraper_cluster_id=${scraperClusterId}`, {
      method: 'PUT'
    })
    return await data.json()
  }
};


export const userApi = {
  async getUserProfile(authFetch: ReturnType<typeof useAuthFetch>): Promise<UserProfile> {
    const data = await authFetch("/user")
    return await data.json()
  },
  async updateUserProfile(
    authFetch: ReturnType<typeof useAuthFetch>,
    userProfile: UserProfile
  ): Promise<Response>{
    const data = await authFetch('/user', {
      method: 'PUT',
      body: userProfile
    })
    return await data.json()
  }
}
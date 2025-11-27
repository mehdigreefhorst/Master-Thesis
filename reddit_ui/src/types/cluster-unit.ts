/**
 * Type definitions matching the Python backend models
 */

export interface ClusterUnitEntityCategory {
  problem_description: boolean;
  frustration_expression: boolean;
  solution_seeking: boolean;
  solution_attempted: boolean;
  solution_proposing: boolean;
  agreement_empathy: boolean;
  none_of_the_above: boolean;
}

export interface PredictionCategory extends ClusterUnitEntityCategory {
  reason: string
  sentiment: "negative" | "neutral" | "positive"
}
export interface PredictionCategoryTokens extends PredictionCategory {
  tokens_used: Record<string, string>
}

export interface ClusterUnitEntityPredictedCategory {
  experiment_id: string;
  predicted_categories: PredictionCategoryTokens[]
}

export interface ClusterUnitEntity {
  id: string;
  cluster_entity_id: string;
  post_id: string;
  comment_post_id: string;
  type: 'post' | 'comment';
  reddit_id: string;
  permalink: string;
  author: string;
  usertag: string | null;
  upvotes: number;
  downvotes: number;
  created_utc: number;
  thread_path_text: string[] | null;
  thread_path_author: string[] | null;
  enriched_comment_thread_text: string | null;
  predicted_category: Record<string, ClusterUnitEntityPredictedCategory> // List of predictions from different prompts
  ground_truth: ClusterUnitEntityCategory | null;
  text: string;
  total_nested_replies: number | null;
  subreddit: string;
}

// API Response types
export interface GetClusterUnitsResponse {
  cluster_unit_entities: ClusterUnitEntity[];
}

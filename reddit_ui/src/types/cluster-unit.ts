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

export interface ClusterUnitEntityPredictedCategory extends ClusterUnitEntityCategory {
  prompt_id: string;
}

export interface ClusterUnitEntity {
  id: string;
  cluster_entity_id: string;
  post_id: string;
  comment_post_id: string;
  type: 'post' | 'comment';
  reddit_id: string;
  author: string;
  usertag: string | null;
  upvotes: number;
  downvotes: number;
  created_utc: number;
  thread_path_text: string[] | null;
  enriched_comment_thread_text: string | null;
  predicted_category: ClusterUnitEntityPredictedCategory[]; // List of predictions from different prompts
  ground_truth: ClusterUnitEntityCategory | null;
  text: string;
}

// API Response types
export interface GetClusterUnitsResponse {
  cluster_unit_entities: ClusterUnitEntity[];
}

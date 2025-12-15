/**
 * Type definitions matching the Python backend models
 */



export interface LabelValueField {
  label: string
  value: string | number | boolean// None if not yet set. Or when it is part of a label_template_entity
  type: "string" | "boolean" | "category" | "integer" | "float" // # type of what the possible label can be 

}

export interface LabelTemplateLLMProjection extends LabelValueField {
  per_label_details: LabelValueField[]

}

export type labelName = string

export interface LabelsGroundTruthInstance {
  label_template_id: string;
  values: Record<labelName, LabelTemplateLLMProjection>  // key is label_value.label name of a LabelTemplateLLMProjection

}

export interface LabelsPredictionInstance extends LabelsGroundTruthInstance {
  experiment_id: string;
}

export interface PredictionCategoryTokens {
  tokens_used: Record<string, string>
  labels_prediction: LabelsPredictionInstance
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
  predicted_category: Record<string, ClusterUnitEntityPredictedCategory> | null// key = experiment_id List of predictions from different prompts
  ground_truth: Record<string, LabelsGroundTruthInstance> | null; // key = label_tempalte_id
  text: string;
  total_nested_replies: number | null;
  subreddit: string;
  ground_truth_one_shot_example: Record<labelName, LabelTemplateLLMProjection> | null;
}

// API Response types
export interface GetClusterUnitsResponse {
  cluster_unit_entities: ClusterUnitEntity[];
}

/**
 * Type definitions matching the Python backend models
 */



export interface LabelValueField {
  label: string
  value: string | number | boolean | null// None if not yet set. Or when it is part of a label_template_entity
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
  errors?: string[]
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

export interface ExperimentModelInformation {
    experiment_id: string;
    prompt_id: string;
    prompt_name: string; 
    model_id: string; // # model_id from openrouter
    label_template_id: string;
    runs_per_unit: number;
    version: string;

}

export interface LabelResult{
    count_match_ground_truth: number; // How many runs matched groun (0-3)
    total_runs: number; // Total runs (default 3)
    values?: (string | boolean | number )[] 
    per_label_labels?: Record<string,(string | boolean | number)[]>
}

export interface SingleUnitOneLabelAllExperiments {
    //"""For a single cluster unit, for a single label, all the experiment predictions including the ground truth"""
    label_name: string;
    ground_truth: boolean | string | number;
    results: (LabelResult | null)[];
}

export interface UnitPredictionErrors {
  experiment_id: string
  errors: string[]
}

export interface ExperimentAllPredictedData {
  //"""all experiment data for one cluster unit entity, formatted for user interface"""
    cluster_unit_enity: ClusterUnitEntity
    label_name_predicted_data: SingleUnitOneLabelAllExperiments[]
    errors?: Record<string, UnitPredictionErrors>
}


export interface GetSampleUnitsLabelingFormatResponse{
    all_experiments_model_information: ExperimentModelInformation[]//# all with the same label_template_id
    completed_insert_model_information: boolean
    label_names: string[]
    per_label_labels: string[] | null
    experiment_unit_data: ExperimentAllPredictedData[] //# List of cluster_units with experiment data
    labels_possible_values: Record<string, string[] | boolean[]> | null
}
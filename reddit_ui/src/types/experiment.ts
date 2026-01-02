/**
 * Type definitions for experiments
 */

// Experiment filter type - used for filtering experiments by category
export type FilterExperimentType = 'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes' | null;

// Prompt category type
export type PromptCategory = 'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes';

// Status type for experiments and other entities
export enum StatusType {
  Initialized = "initialized",
  Ongoing = "ongoing",
  Paused = "paused",
  Completed = "completed",
  Error = "error"
}

// Reasoning effort levels
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "auto";

// Input type for experiments
export type ExperimentInputType = "sample" | "filtering" | "cluster";

// Experiment cost breakdown
export interface ExperimentCost {
  total: number;        // Total cost in dollars
  completion: number;   // Cost for completion tokens
  prompt: number;       // Cost for prompt tokens
  internal_reasoning: number;  // Cost for internal reasoning (if applicable)
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  internal_reasoning_tokens: number
  total_tokens: number
}
    

// Token statistics for experiments
export interface ExperimentTokenStatistics {
  total_successful_predictions: number
  total_failed_attempts: number
  total_tokens_used: TokenUsage// = Field(default_factory=TokenUsage)  # e.g., {"prompt_tokens": 1000, "completion_tokens": 500, "total_tokens": 1500}
  tokens_wasted_on_failures: TokenUsage //= Field(default_factory=TokenUsage)  # Tokens from failed attempts
  tokens_from_retries: TokenUsage //= Field(default_factory=TokenUsage)  # Tokens from retry attempts (even if they succeeded)
  
}



// Model pricing information
export interface Pricing {
  prompt: number;  // Cost per token for prompts
  completion: number;  // Cost per token for completions
}

// Prediction metrics for individual labels
export interface PredictionMetric {
  label: string;
  accuracy?: number;
  kappa?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
}

// Prediction result for a label
export interface PredictionResult {
  true_positive: number;
  false_positive: number;
  true_negative: number;
  false_negative: number;
  accuracy?: number;
  kappa?: number;
}

// Aggregate result for all labels
export interface AggregateResult {
  labels: Record<string, PredictionResult>;
  overall_accuracy?: number;
  overall_kappa?: number;
}

// Main experiment entity (matches backend ExperimentEntity)
export interface ExperimentEntity {
  id: string;
  user_id: string;
  scraper_cluster_id: string;
  prompt_id: string;
  input_id: string;
  input_type: ExperimentInputType;
  experiment_type: PromptCategory;
  label_template_id: string;
  model_id: string;
  model_pricing?: Pricing;
  experiment_cost?: ExperimentCost;
  reasoning_effort?: ReasoningEffort;
  aggregate_result?: AggregateResult;
  runs_per_unit: number;
  threshold_runs_true: number;
  status: StatusType;
  token_statistics: ExperimentTokenStatistics;
  created_at?: Date;
  updated_at?: Date;
}

export interface ExperimentInput {
  input_type: string;
  input_id: string;
}

// Response from GET /experiment endpoint (matches backend GetExperimentsResponse)
export interface GetExperimentsResponse {
  id: string;
  name: string;
  model: string;
  input_type: string;

  input: ExperimentInput;
  prompt_id: string;
  created: string | Date;  // Can be string from API or Date after parsing
  runs_per_unit: 1 | 2 | 3 | 4 | 5;
  label_template_id: string;
  threshold_runs_true?: 1 | 2 | 3 | 4 | 5;
  total_samples: number;
  combined_labels_accuracy?: number;
  combined_labels_kappa?: number;
  combined_labels_prediction_metrics?: PredictionMetric[];
  overall_accuracy?: number;
  overall_kappa?: number;
  prediction_metrics?: PredictionMetric[];
  reasoning_effort: ReasoningEffort;
  token_statistics?: ExperimentTokenStatistics;
  experiment_cost?: ExperimentCost;
  errors?: string[];
  status: StatusType;
  experiment_type: PromptCategory;

}

// Request to create an experiment
export interface CreateExperimentRequest {
  prompt_id: string;
  scraper_cluster_id: string;
  model_id: string;
  runs_per_unit: number;
  threshold_runs_true: number;
  label_template_id: string;
  reasoning_effort?: ReasoningEffort | null;
  input_id: string;
  input_type: ExperimentInputType;
}

// Request to update experiment threshold
export interface UpdateExperimentThresholdRequest {
  experiment_id: string;
  threshold_runs_true: number;
}

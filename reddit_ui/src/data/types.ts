// Label types from ClusterUnitEntityCategory
export type LabelType =
  | "problem_description"
  | "frustration_expression"
  | "solution_seeking"
  | "solution_attempted"
  | "solution_proposing"
  | "agreement_empathy";

export const ALL_LABELS: LabelType[] = [
  "problem_description",
  "frustration_expression",
  "solution_seeking",
  "solution_attempted",
  "solution_proposing",
  "agreement_empathy",
];

export const LABEL_DESCRIPTIONS: Record<LabelType, string> = {
  problem_description: "The user describes a problem that they face",
  frustration_expression: "The user expresses a frustration about something they face",
  solution_seeking: "The user is looking for a solution",
  solution_attempted: "The user explains an experience using a solution",
  solution_proposing: "The user suggests a solution to someone else",
  agreement_empathy: "The user is empathetic towards another user",
};

// Category structure matching ClusterUnitEntityCategory
export interface CategoryLabels {
  problem_description: boolean;
  frustration_expression: boolean;
  solution_seeking: boolean;
  solution_attempted: boolean;
  solution_proposing: boolean;
  agreement_empathy: boolean;
  none_of_the_above: boolean;
}

// Label prediction from a single model run with reasoning
export interface LabelPrediction {
  label: LabelType;
  value: boolean; // whether the label was detected
  reasoning: string; // LLM's explanation for this label
}

// Result from a single model run (1 of 3 runs)
export interface ModelRun {
  runNumber: number; // 1, 2, or 3
  labels: LabelPrediction[]; // predictions for all 6 labels
  timestamp: string;
}

// Configuration for a specific model + prompt combination
export interface ModelConfig {
  id: string;
  modelName: string; // e.g., "GPT-4", "Claude-3"
  promptVersion: string; // e.g., "v1.2", "v2.0"
  promptText: string; // full prompt text
  runs: ModelRun[]; // 3 runs
}

// Represents the ClusterUnitEntity structure
export interface ClusterUnit {
  id: string;
  cluster_entity_id: string;
  post_id: string;
  comment_post_id: string;
  type: "post" | "comment";
  reddit_id: string;
  author: string;
  usertag: string | null;
  upvotes: number;
  downvotes: number;
  created_utc: number;
  thread_path_text: string[] | null; // full prior thread up to current comment
  enriched_comment_thread_text: string | null; // LLM-generated problem description
  category: CategoryLabels | null; // human-labeled ground truth
  text: string; // the actual text being analyzed
  subreddit?: string;
}

// Sample for the UI - combines ClusterUnit with model predictions
export interface Sample {
  id: number;
  clusterUnit: ClusterUnit;
  modelConfigs: ModelConfig[]; // different model+prompt combinations
  aiInsight?: string; // AI-generated insight about the comparison
}

// Helper to get active labels from CategoryLabels
export function getActiveLabels(category: CategoryLabels): LabelType[] {
  return ALL_LABELS.filter((label) => category[label]);
}

// Calculate consensus across runs for a specific label
export interface LabelConsensus {
  label: LabelType;
  trueCount: number; // how many runs detected this label
  totalRuns: number; // should always be 3
  percentage: number; // trueCount / totalRuns * 100
  isConsistent: boolean; // all runs agree (0/3 or 3/3)
}

// Stats for a model config
export interface ModelStats {
  accuracy: number; // % of labels matching ground truth
  perfectRuns: number; // how many runs matched perfectly
  totalRuns: number; // should always be 3
  consistency: number; // % of labels that are consistent across runs
}

import { PredictionCategoryTokens } from "./cluster-unit";


export interface PromptEntity {
  id: string;
  name: string;
  system_prompt: string;
  prompt: string;
  category?: string;
}


export interface singlePredictionTestOutput {
    error?: string[];
    system_prompt: string;
    input_prompt: string;
    tokens_used: Record<string, any>;
    model_output_message?: string;
    parsed_categories: PredictionCategoryTokens | null;
    success: boolean

  }

export interface testPredictionsOutput {
  predictions: singlePredictionTestOutput[][] // they are grouped per cluster unit
}
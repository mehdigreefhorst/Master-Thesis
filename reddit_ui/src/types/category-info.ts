export type LLMLabelFieldType = "string" | "boolean" | "category" | "integer" | "float";

export interface LLMLabelField {
  label: string;
  explanation: string;
  possible_values: string[]; // e.g. [positive, neutral, negative] | leave empty if all values are acceptable
  type: LLMLabelFieldType; // type of what the possible label can be
}

export interface CreateLabelTemplateRequest {
  category_name: string;
  category_description: string;
  is_public: boolean;
  labels: LLMLabelField[];
  llm_prediction_fields_per_label: LLMLabelField[];
  multi_label_possible: boolean;
}

export interface LabelTemplate extends CreateLabelTemplateRequest {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

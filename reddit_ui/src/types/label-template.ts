export type LLMLabelFieldType = "string" | "boolean" | "category" | "integer" | "float";

export interface LLMLabelField {
  label: string;
  explanation: string;
  possible_values: any[]; // e.g. [positive, neutral, negative] | leave empty if all values are acceptable
  type: LLMLabelFieldType; // type of what the possible label can be
}

export interface CreateLabelTemplateRequest {
  label_template_name: string;
  label_template_description: string;
  is_public: boolean;
  labels: LLMLabelField[];
  llm_prediction_fields_per_label: LLMLabelField[];
  multi_label_possible: boolean;
}

export interface OneShotExampleData {
  [labelName: string]: {
    label: string;
    value: string | number | boolean;
    type: LLMLabelFieldType;
    per_label_details: {
      label: string;
      value: string | number | boolean;
      type: LLMLabelFieldType;
    }[];
  };
}

export interface LabelTemplateEntity extends CreateLabelTemplateRequest {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  ground_truth_one_shot_example: OneShotExampleData | null;
}

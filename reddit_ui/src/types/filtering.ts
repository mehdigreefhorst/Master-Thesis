import { ClusterUnitEntity } from "./cluster-unit"



export interface filteringResponseCount {
  after_filtering: number
  before_filtering: number
}

export interface FilteringResponseClusterUnits {
  filtered_cluster_units: ClusterUnitEntity[]
}

export interface LabelTemplateFilter {
    label_name: string
    allowed_values?: string[] | boolean[]
    label_type: "string" | "boolean" | "category" | "integer" | "float"
    min_label_value?: number
    max_label_value?: number
}

export interface FilterMisc {
    min_upvotes?: number	
    max_upvotes?: number	
    min_downvotes?: number	
    max_downvotes?: number
    min_depth?: number
    max_depth?: number
    min_total_nested_replies?: number	
    max_total_nested_replies?: number	
    min_date?: Date
    max_date?: Date
    reddit_message_type?: "post" | "comment" | "all"
}
export interface FilteringFields {
  label_template_id: string
  input_id: string // # Either an experiment_id, filtering_id or cluster_entity_id
  input_type: "experiment" | "filtering" | "cluster"
  label_template_filter_and?: Record<string, LabelTemplateFilter>
  label_template_filter_or?: Record<string, LabelTemplateFilter>
  filter_misc?: FilterMisc
}

export interface FilteringRequest extends FilteringFields {
  return_type: "count" | "cluster_units"
  limit: number
}

export interface FilteringCreateRequest {
  filtering_fields: FilteringFields
  scraper_cluster_id: string
}
export interface FilteringEntity extends FilteringFields {
  id: string;
  created_at: Date;
  scraper_cluster_id: string;
  user_id: string;
}
export interface FilteringEntityId {
  filtering_entity_id: string
}
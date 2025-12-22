/**
 * Types for input entities used in experiments
 */

import { FilteringEntity } from './filtering';
import { SampleEntity } from './sample';

export interface ClusterEntityInputCount {
  id: string;
  count_cluster_units: number;
  // Add other cluster entity fields as needed
}

export interface InputEntitiesResponse {
  filtering_entities: FilteringEntity[];
  sample_entity: SampleEntity[];
  cluster_entity?: ClusterEntityInputCount[];
}

// Common interface for displaying in the selector
export interface InputEntityDisplay {
  id: string;
  name: string;
  cluster_unit_count: number;
  created_at?: string;
  description?: string;
  type: 'sample' | 'filtering' | 'cluster';
}

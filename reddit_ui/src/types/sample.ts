/**
 * Type definitions for Sample entities
 */

import { StatusType } from './scraper-cluster';

export interface SampleEntity {
  id: string;
  user_id: string;
  picked_post_cluster_unit_ids: string[];
  sample_cluster_unit_ids: string[];
  sample_size: number;
  sample_labeled_status: StatusType;
  label_template_ids: string[];
}

export interface GetSampleResponse {
  sample: SampleEntity;
  total_posts_available: number;
  posts_used_in_sample: number;
  comments_used_in_sample: number;
}

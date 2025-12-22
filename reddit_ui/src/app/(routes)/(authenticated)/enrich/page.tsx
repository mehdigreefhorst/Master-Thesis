'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ExperimentCreator } from '@/components/experiments/ExperimentCreator';

export default function EnrichPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scraperClusterId = searchParams.get('scraper_cluster_id');

  if (!scraperClusterId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-medium">No scraper cluster ID provided</p>
        </div>
      </div>
    );
  }

  return (
    <ExperimentCreator
      scraperClusterId={scraperClusterId}
      experimentType="enrich"
      promptCategory="rewrite_cluster_unit_standalone"
      title="Create Enrichment Prompt"
      onBack={() => router.push(`/dashboard?scraper_cluster_id=${scraperClusterId}`)}
      helpText="💡 Tip: This prompt is for compressing conversation threads into summaries or standalone text. The expected output is a string (not a dictionary). Use variables like {conversation_thread} and {final_reddit_message} to enrich the final message with context from the thread."
    />
  );
}

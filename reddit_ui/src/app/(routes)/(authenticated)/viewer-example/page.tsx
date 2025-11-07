'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThreadBox } from '@/components/thread/ThreadBox';
import { ThreadPost } from '@/components/thread/ThreadPost';
import { ThreadComment } from '@/components/thread/ThreadComment';
import { ThreadTarget } from '@/components/thread/ThreadTarget';
import { Badge } from '@/components/ui/Badge';
import { LabelTable } from '@/components/label/LabelTable';
import { InsightBox } from '@/components/ui/InsightBox';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Home() {
  const [currentSample, setCurrentSample] = useState(47);
  const totalSamples = 250;

  // Mock data for the example
  const models = [
    { name: 'GPT-4', version: 'Prompt v1.2' },
    { name: 'GPT-4', version: 'Prompt v2.0' },
    { name: 'Claude-3', version: 'Prompt v1.2' }
  ];

  const labels = [
    {
      labelName: 'problem_description',
      groundTruth: false,
      results: [
        {
          count: 2,
          total: 3,
          reasoning: (
            <div>
              <div className="text-xs font-semibold mb-2">Reasoning across runs:</div>
              <div className="text-xs mb-1">
                <strong>Run 1 & 2:</strong> &quot;User describes the ongoing problem of blue screens.&quot;
              </div>
              <div className="text-xs">
                <strong>Run 3:</strong> &quot;This is solution_attempted, not problem_description.&quot;
              </div>
            </div>
          )
        },
        null,
        null
      ]
    },
    {
      labelName: 'frustration_expression',
      groundTruth: true,
      results: [
        { count: 3, total: 3 },
        { count: 3, total: 3 },
        { count: 3, total: 3 }
      ]
    },
    {
      labelName: 'solution_seeking',
      groundTruth: false,
      results: [
        { count: 1, total: 3 },
        null,
        null
      ]
    },
    {
      labelName: 'solution_attempted',
      groundTruth: true,
      results: [
        { count: 3, total: 3 },
        { count: 3, total: 3 },
        { count: 3, total: 3 }
      ]
    },
    {
      labelName: 'solution_proposing',
      groundTruth: false,
      results: [null, null, null]
    },
    {
      labelName: 'agreement_empathy',
      groundTruth: false,
      results: [null, null, { count: 1, total: 3 }]
    }
  ];

  const stats = [
    { accuracy: 72, consistency: 'Medium' },
    { accuracy: 100, consistency: 'Perfect', isHighlighted: true },
    { accuracy: 94, consistency: 'Good' }
  ];

  const handlePrevious = () => {
    setCurrentSample((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setCurrentSample((prev) => Math.min(totalSamples, prev + 1));
  };

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Label Accuracy Viewer"
          currentSample={currentSample}
          totalSamples={totalSamples}
          onPrevious={handlePrevious}
          onNext={handleNext}
          className="mb-6"
        />

        {/* Thread Context */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">r/techsupport Thread:</h2>
            <Button className="text-sm text-blue-600" variant='invisible'>
              View Full ▼
            </Button>
          </div>

          <ThreadBox>
            <ThreadPost
              username="u/techuser123"
              content="My laptop keeps crashing when I run Adobe Premiere. I've tried everything but nothing seems to work."
            />
            <ThreadComment
              username="u/helper42"
              content="Have you tried updating your graphics drivers? That usually fixes rendering crashes."
            />
            <ThreadTarget
              username="u/techuser123"
              content="Yes I updated them yesterday but still getting blue screens. So frustrated this keeps happening during renders..."
            />
          </ThreadBox>
        </div>

        {/* Label Comparison Table */}
        <div className="mb-6">

          <LabelTable models={models} labels={labels} stats={stats} cluster_unit_id='1'/>
          <div className="mt-3 text-sm text-gray-600">
            💬 = Click to view reasoning | ⚠️ = Inconsistent across runs | ✓ = All runs match
          </div>
        </div>

        {/* AI Insight Box */}
        <InsightBox className="mb-6">
          Prompt v2.0 fixes the core issue from v1.2: false positive labeling.
          v1.2 inconsistently adds &quot;problem_description&quot; and &quot;solution_seeking&quot;
          when the user is actually reporting a failed solution attempt.
          v2.0 achieves <strong>100% accuracy</strong> with perfect consistency across all runs.
        </InsightBox>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Link href={"/experiments"}>
              <Button variant="primary">View Prompts & Edit</Button>
          </Link>
          <Button variant="secondary">Export Data</Button>
          <Button variant="secondary">Flag Sample</Button>
          <Button variant="primary">Next Sample →</Button>
        </div>
      </div>
    </div>
  );
}

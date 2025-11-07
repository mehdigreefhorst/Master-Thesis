'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { PromptCard, PromptData } from '@/components/prompts/PromptCard';

// Mock data - replace with actual API calls
const mockPrompts: PromptData[] = [
  {
    id: '1',
    name: 'GPT-4 Prompt v2.0',
    model: 'GPT-4',
    created: '2024-01-15',
    totalSamples: 523,
    overallAccuracy: 89.4,
    overallConsistency: 86.2,
    labelMetrics: [
      {
        labelName: 'problem_description',
        prevalence: 93,
        prevalenceCount: 487,
        totalSamples: 523,
        accuracy: 96,
        certaintyDistribution: { certain: 450, uncertain: 37, split: 0 },
        confusionMatrix: { tp: 467, fp: 20, fn: 19, tn: 17 }
      },
      {
        labelName: 'solution_attempted',
        prevalence: 60,
        prevalenceCount: 312,
        totalSamples: 523,
        accuracy: 91,
        certaintyDistribution: { certain: 237, uncertain: 64, split: 11 },
        confusionMatrix: { tp: 284, fp: 28, fn: 24, tn: 187 }
      },
      {
        labelName: 'frustration_expression',
        prevalence: 36,
        prevalenceCount: 189,
        totalSamples: 523,
        accuracy: 98,
        certaintyDistribution: { certain: 178, uncertain: 10, split: 1 },
        confusionMatrix: { tp: 186, fp: 3, fn: 4, tn: 330 }
      },
      {
        labelName: 'solution_proposing',
        prevalence: 28,
        prevalenceCount: 145,
        totalSamples: 523,
        accuracy: 73,
        certaintyDistribution: { certain: 88, uncertain: 45, split: 12 },
        confusionMatrix: { tp: 106, fp: 39, fn: 103, tn: 275 }
      },
      {
        labelName: 'agreement_empathy',
        prevalence: 19,
        prevalenceCount: 98,
        totalSamples: 523,
        accuracy: 89,
        certaintyDistribution: { certain: 80, uncertain: 16, split: 2 },
        confusionMatrix: { tp: 87, fp: 11, fn: 47, tn: 378 }
      }
    ]
  },
  {
    id: '2',
    name: 'GPT-4 Prompt v1.2',
    model: 'GPT-4',
    created: '2024-01-10',
    totalSamples: 523,
    overallAccuracy: 78.2,
    overallConsistency: 73.4,
    labelMetrics: [
      {
        labelName: 'problem_description',
        prevalence: 98,
        prevalenceCount: 512,
        totalSamples: 523,
        accuracy: 72,
        certaintyDistribution: { certain: 374, uncertain: 128, split: 10 },
        confusionMatrix: { tp: 467, fp: 45, fn: 0, tn: 11 }
      },
      {
        labelName: 'solution_attempted',
        prevalence: 57,
        prevalenceCount: 298,
        totalSamples: 523,
        accuracy: 94,
        certaintyDistribution: { certain: 271, uncertain: 25, split: 2 },
        confusionMatrix: { tp: 281, fp: 17, fn: 14, tn: 211 }
      },
      {
        labelName: 'frustration_expression',
        prevalence: 38,
        prevalenceCount: 201,
        totalSamples: 523,
        accuracy: 88,
        certaintyDistribution: { certain: 159, uncertain: 38, split: 4 },
        confusionMatrix: { tp: 177, fp: 24, fn: 9, tn: 313 }
      },
      {
        labelName: 'solution_proposing',
        prevalence: 32,
        prevalenceCount: 167,
        totalSamples: 523,
        accuracy: 68,
        certaintyDistribution: { certain: 97, uncertain: 58, split: 12 },
        confusionMatrix: { tp: 98, fp: 69, fn: 111, tn: 245 }
      },
      {
        labelName: 'agreement_empathy',
        prevalence: 26,
        prevalenceCount: 134,
        totalSamples: 523,
        accuracy: 81,
        certaintyDistribution: { certain: 86, uncertain: 39, split: 9 },
        confusionMatrix: { tp: 89, fp: 45, fn: 45, tn: 344 }
      }
    ]
  },
  {
    id: '3',
    name: 'Claude-3 Prompt v1.2',
    model: 'Claude-3-Sonnet',
    created: '2024-01-12',
    totalSamples: 201,
    overallAccuracy: 84.7,
    overallConsistency: 80.1,
    labelMetrics: [
      {
        labelName: 'problem_description',
        prevalence: 91,
        prevalenceCount: 183,
        totalSamples: 201,
        accuracy: 92,
        certaintyDistribution: { certain: 167, uncertain: 15, split: 1 },
        confusionMatrix: { tp: 178, fp: 5, fn: 9, tn: 9 }
      },
      {
        labelName: 'solution_attempted',
        prevalence: 58,
        prevalenceCount: 117,
        totalSamples: 201,
        accuracy: 87,
        certaintyDistribution: { certain: 92, uncertain: 22, split: 3 },
        confusionMatrix: { tp: 108, fp: 9, fn: 8, tn: 76 }
      },
      {
        labelName: 'frustration_expression',
        prevalence: 34,
        prevalenceCount: 68,
        totalSamples: 201,
        accuracy: 94,
        certaintyDistribution: { certain: 64, uncertain: 3, split: 1 },
        confusionMatrix: { tp: 66, fp: 2, fn: 3, tn: 130 }
      },
      {
        labelName: 'solution_proposing',
        prevalence: 25,
        prevalenceCount: 50,
        totalSamples: 201,
        accuracy: 78,
        certaintyDistribution: { certain: 31, uncertain: 15, split: 4 },
        confusionMatrix: { tp: 41, fp: 9, fn: 35, tn: 116 }
      },
      {
        labelName: 'agreement_empathy',
        prevalence: 22,
        prevalenceCount: 44,
        totalSamples: 201,
        accuracy: 86,
        certaintyDistribution: { certain: 36, uncertain: 7, split: 1 },
        confusionMatrix: { tp: 39, fp: 5, fn: 23, tn: 134 }
      }
    ]
  }
];

export default function PromptsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');

  const handleView = (id: string) => {
    console.log('View prompt:', id);
    // TODO: Navigate to prompt detail view
  };

  const handleClone = (id: string) => {
    console.log('Clone prompt:', id);
    // TODO: Open clone prompt dialog
  };

  const handleNewPrompt = () => {
    console.log('Create new prompt');
    // TODO: Open new prompt dialog
  };

  const filteredPrompts = mockPrompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterModel === 'all' || prompt.model === filterModel;
    return matchesSearch && matchesFilter;
  });

  const uniqueModels = Array.from(new Set(mockPrompts.map(p => p.model)));

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-[95vw] mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Prompts & Analysis Dashboard"
          className="mb-6"
        />

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="flex gap-3 flex-1">
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-(--border) rounded-(--radius)
                       bg-background text-foreground text-sm
                       focus:outline-none focus:ring-2 focus:ring-(--ring) transition-shadow"
            />
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-3 py-2 border border-(--border) rounded-(--radius)
                       bg-background text-foreground text-sm
                       focus:outline-none focus:ring-2 focus:ring-(--ring) cursor-pointer"
            >
              <option value="all">All Models</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <Button variant="primary" onClick={handleNewPrompt}>
            + New Prompt
          </Button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-(--muted-foreground) mb-4">
          🔍 Showing {filteredPrompts.length} of {mockPrompts.length} prompts • Scroll horizontally to compare →
        </div>

        {/* Prompt Cards - Horizontal Scrolling */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-min">
            {filteredPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-[insightAppear_300ms_ease-out] shrink-0 w-[500px]"
              >
                <PromptCard
                  prompt={prompt}
                  onView={handleView}
                  onClone={handleClone}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredPrompts.length === 0 && (
          <div className="text-center py-12 text-(--muted-foreground)">
            <p className="text-lg mb-2">No prompts found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Textarea, KeywordTag } from '@/components/ui';
import { scraperClusterApi, scraperApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';

type Step = 'problem-definition' | 'keyword-generation';

export default function DefinePage() {
  const router = useRouter();
  const authFetch = useAuthFetch();

  const [currentStep, setCurrentStep] = useState<Step>('problem-definition');
  const [problemDescription, setProblemDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceedToKeywords = problemDescription.trim() && targetAudience.trim();

  const handleProceedToKeywords = () => {
    if (canProceedToKeywords) {
      setCurrentStep('keyword-generation');
    }
  };

  const handleBackToProblem = () => {
    setCurrentStep('problem-definition');
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleGenerateKeywords = async () => {
    setIsGeneratingKeywords(true);
    // TODO: Replace with actual API call to your keyword generation endpoint
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const generatedKeywords = [
      'problem solving',
      'user experience',
      'pain points',
      'workarounds',
      'frustration'
    ];

    const newKeywords = generatedKeywords.filter((k) => !keywords.includes(k));
    setKeywords([...keywords, ...newKeywords]);
    setIsGeneratingKeywords(false);
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleStartScraping = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Step 1: Create scraper cluster with problem description and target audience
      const clusterResponse = await scraperClusterApi.createScraperCluster(
        authFetch,
        problemDescription,
        targetAudience
      );
      const clusterData = await clusterResponse.json();
      const scraperClusterId = clusterData.scraper_cluster_id;

      // Step 2: Create scraper with keywords
      const subreddits = subreddit.trim() ? [subreddit.trim()] : ['all'];
      const scraperResponse = await scraperApi.createScraper(
        authFetch,
        scraperClusterId,
        keywords,
        subreddits
      );
      const scraperData = await scraperResponse.json();

      // Step 3: Start scraping (optional - you can do this on a separate page)
      // await scraperApi.startScraper(authFetch, scraperClusterId);

      // Navigate to the scraping progress page or next step
      router.push(`/scraping-progress?scraper_cluster_id=${scraperClusterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scraper');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-(--background) animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-4xl mx-auto">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-(--foreground) mb-2">
              Define Your Research
            </h1>
            <p className="text-(--muted-foreground)">
              {currentStep === 'problem-definition'
                ? 'Step 1 of 2: Describe the problem and target audience'
                : 'Step 2 of 2: Add keywords for Reddit search'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1 bg-(--secondary) rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full bg-(--primary) transition-all duration-500 ease-out ${
                currentStep === 'problem-definition' ? 'w-1/2' : 'w-full'
              }`}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 animate-[slideIn_300ms_ease-out]">
            {error}
          </div>
        )}

        {/* Step 1: Problem Definition */}
        {currentStep === 'problem-definition' && (
          <div className="space-y-6 animate-[slideIn_400ms_ease-out]">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-(--foreground) mb-3">
                    Problem Description
                  </label>
                  <Textarea
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="Describe the problem you want to investigate. What challenges or pain points are you exploring?"
                    rows={5}
                  />
                  <p className="mt-2 text-xs text-(--muted-foreground)">
                    Example: "Users struggling with setting up home networks, especially first-time buyers"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-(--foreground) mb-3">
                    Target Audience
                  </label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., first-time homeowners, freelance designers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-(--foreground) mb-3">
                    Subreddit <span className="text-(--muted-foreground) font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={subreddit}
                    onChange={(e) => setSubreddit(e.target.value)}
                    placeholder="r/homeowners, r/techsupport"
                  />
                  <p className="mt-2 text-xs text-(--muted-foreground)">
                    Focus your search on specific communities where your audience is active
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleProceedToKeywords}
                disabled={!canProceedToKeywords}
              >
                Continue to Keywords →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Keyword Generation */}
        {currentStep === 'keyword-generation' && (
          <div className="space-y-6 animate-[slideIn_400ms_ease-out]">
            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <div className="text-lg">💡</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-blue-900 mb-1">Pro Tip</h3>
                  <p className="text-sm text-blue-800">
                    Start by adding your own keywords. Once you've added a few, let AI suggest more to expand your search.
                  </p>
                </div>
              </div>
            </div>

            <Card className="p-6">
              <div className="space-y-6">
                {/* Keyword Input */}
                <div>
                  <label className="block text-sm font-semibold text-(--foreground) mb-3">
                    Search Keywords
                  </label>
                  <p className="text-xs text-(--muted-foreground) mb-3">
                    Add keywords to find relevant Reddit discussions. Press Enter or click Add.
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={handleKeywordKeyDown}
                      placeholder="Enter a keyword..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddKeyword} variant="secondary">
                      Add
                    </Button>
                  </div>

                  {/* Keywords Display */}
                  {keywords.length > 0 && (
                    <div className="p-4 bg-(--muted) rounded-lg border border-(--border)">
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <KeywordTag
                            key={index}
                            keyword={keyword}
                            onRemove={() => handleRemoveKeyword(keyword)}
                          />
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-(--muted-foreground)">
                        {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} added
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Generation */}
                <div className="border-t border-(--border) pt-6">
                  <h3 className="text-sm font-semibold text-(--foreground) mb-3">
                    AI Keyword Generator
                  </h3>
                  <p className="text-xs text-(--muted-foreground) mb-4">
                    Generate additional keywords based on your problem description and target audience.
                  </p>
                  <Button
                    onClick={handleGenerateKeywords}
                    disabled={isGeneratingKeywords || !canProceedToKeywords}
                    variant="secondary"
                  >
                    {isGeneratingKeywords ? 'Generating...' : 'Generate Keywords with AI'}
                  </Button>
                </div>

                {/* Summary */}
                <div className="bg-(--muted) p-4 rounded-lg border border-(--border)">
                  <h4 className="font-semibold text-sm text-(--foreground) mb-3">
                    Research Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-(--muted-foreground)">Problem:</span>{' '}
                      <span className="text-(--foreground)">{problemDescription}</span>
                    </div>
                    <div>
                      <span className="text-(--muted-foreground)">Audience:</span>{' '}
                      <span className="text-(--foreground)">{targetAudience}</span>
                    </div>
                    {subreddit && (
                      <div>
                        <span className="text-(--muted-foreground)">Subreddit:</span>{' '}
                        <span className="text-(--foreground)">{subreddit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button onClick={handleBackToProblem} variant="secondary">
                ← Back
              </Button>
              <Button
                onClick={handleStartScraping}
                disabled={keywords.length === 0 || isCreating}
              >
                {isCreating ? 'Creating...' : 'Start Scraping'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pageLoad {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

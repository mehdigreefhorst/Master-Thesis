'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input, Textarea, KeywordTag } from '@/components/ui';
import { scraperClusterApi, scraperApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import type { ScraperClusterEntity, ScraperEntity, StatusType } from '@/types/scraper-cluster';
import { HeaderStep } from '@/components/layout/HeaderStep';

type Step = 'problem-definition' | 'keyword-generation';

export default function DefinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const [currentStep, setCurrentStep] = useState<Step>('problem-definition');
  const [scraperClusterId, setScraperClusterId] = useState<string>("");
  const [problemExplorationDescription, setProblemExplorationDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [newSubreddit, setNewSubreddit] = useState('');

  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scraperCluster, setScraperCluster] = useState<ScraperClusterEntity | null>(null);
  const [scraper, setScraper] = useState<ScraperEntity | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<StatusType>('initialized');

  // Fetch existing data if scraper_cluster_id is provided
  useEffect(() => {
    const searchParamScraperClusterId = searchParams.get('scraper_cluster_id');
    if (!searchParamScraperClusterId) return;
    
    if (searchParamScraperClusterId) {
      setScraperClusterId(searchParamScraperClusterId)
    }


    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch scraper cluster data
        const scraperClusterData = await scraperClusterApi.getScraperClusterById(authFetch, searchParamScraperClusterId);
        console.log('Fetched cluster data:', scraperClusterData);
        console.log('Cluster stages:', scraperClusterData.stages);
        console.log('Scraping status:', scraperClusterData.stages?.scraping);

        setScraperCluster(scraperClusterData);
        setProblemExplorationDescription(scraperClusterData.problem_exporation_description || '');
        setTargetAudience(scraperClusterData.target_audience || '');

        if (scraperClusterData.stages && scraperClusterData.stages.scraping) {
          setScrapingStatus(scraperClusterData.stages.scraping);
        } else {
          console.error('stages or stages.scraping is undefined!', scraperClusterData);
        }

        // Fetch scraper data if it exists
        if (scraperClusterData.scraper_entity_id) {
          const scraperData = await scraperApi.getScraperByScraperClusterId(authFetch, searchParamScraperClusterId);
          console.log('Fetched scraper data:', scraperData);
          setScraper(scraperData);
          setKeywords(scraperData.keywords || []);
          setSubreddits(scraperData.subreddits || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams, authFetch]);

  const canProceedToKeywords = problemExplorationDescription.trim() && targetAudience.trim();
  const isLocked = scrapingStatus !== 'initialized'; // Lock fields if not in initialized state

  const handleProceedToKeywords = () => {
    if (canProceedToKeywords) {
      setCurrentStep('keyword-generation');
    }
  };

  const handleBackToProblem = () => {
    setCurrentStep('problem-definition');
  };

  const handleAddSubreddit = () => {
    const trimmed = newSubreddit.trim();
    if (trimmed && !subreddits.includes(trimmed)) {
      setSubreddits([...subreddits, trimmed]);
      setNewSubreddit('');
    }
  };

  const handleRemoveSubreddit = (subreddit: string) => {
    setSubreddits(subreddits.filter((k) => k !== subreddit));
  };

  const handleSubredditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubreddit();
    }
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

  const handleUpdateScraperCluster = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      // Step 1: Create scraper cluster with problem description and target audience
      
      const clusterData = await scraperClusterApi.updateScraperCluster(
        authFetch,
        scraperClusterId,
        problemExplorationDescription,
        targetAudience,
        keywords,
        subreddits
      );

      

      // Step 3: Start scraping (optional - you can do this on a separate page)
      // await scraperApi.startScraper(authFetch, scraperClusterId);

      // Navigate to the scraping progress page or next step
      router.push(`/scraping-progress?scraper_cluster_id=${scraperClusterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scraper');
      setIsCreating(false);
    }
  };

  const handlCreateScraperCluster = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      // Step 1: Create scraper cluster with problem description and target audience
      
      const clusterData = await scraperClusterApi.createScraperCluster(
        authFetch,
        problemExplorationDescription,
        targetAudience
      );
      const scraperClusterId = clusterData.scraper_cluster_id;

      // Step 2: Create scraper with keywords
      await scraperApi.createScraper(
        authFetch,
        scraperClusterId,
        keywords,
        subreddits
      );

      // Step 3: Start scraping (optional - you can do this on a separate page)
      // await scraperApi.startScraper(authFetch, scraperClusterId);

      // Navigate to the scraping progress page or next step
      router.push(`/scraping-progress?scraper_cluster_id=${scraperClusterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scraper');
      setIsCreating(false);
    }
  };

  // Read-only view for locked state
  if (isLocked && scraperCluster) {
    return (
      <div className="min-h-screen p-8 bg-background animate-[pageLoad_400ms_ease-out]">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <HeaderStep title='Research Definition' subtitle='View your research configuration'/>
          <div className="mb-8">
            

            {/* Status Badge and Back Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  scrapingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                  scrapingStatus === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                  scrapingStatus === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  scrapingStatus === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {scrapingStatus.charAt(0).toUpperCase() + scrapingStatus.slice(1)}
                </span>
              </div>
              
            </div>
          </div>

          {/* Read-only Content */}
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Problem Description
              </h3>
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-foreground whitespace-pre-wrap">
                  {problemExplorationDescription || 'Not provided'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Target Audience
              </h3>
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-foreground">
                  {targetAudience || 'Not provided'}
                </p>
              </div>
            </div>

            {subreddits && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Subreddit
                </h3>
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <div className="flex flex-wrap gap-2">
                    {subreddits.map((subreddit, index) => (
                      <span
                        key={index} className="px-3 py-1 border-2 border-red-500 text-red-700 rounded-full text-sm font-medium bg-white inline-block">
                      
                      r/{subreddit.replace(/^r\//, '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Search Keywords
                </h3>
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 border-2 border-blue-500 text-blue-700 rounded-full text-sm font-medium bg-white"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {keywords.length} keyword{keywords.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              This configuration is locked because scraping has started. You cannot edit these settings while scraping is {scrapingStatus}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen p-8 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-4xl mx-auto">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="mb-6">
            {scraperClusterId 
            ? <HeaderStep title='Research Definition' subtitle={currentStep === 'problem-definition'
                ? 'Step 1 of 2: Describe the problem and target audience'
                : 'Step 2 of 2: Add keywords for Reddit search'}/> 
            : <h1 className="text-3xl font-bold text-foreground mb-2">
                Define Your Research
              </h1>
            }

            
            <p className="text-muted-foreground">
              
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out ${
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
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Problem Description
                  </label>
                  <Textarea
                    value={problemExplorationDescription}
                    onChange={(e) => setProblemExplorationDescription(e.target.value)}
                    placeholder="Describe the problem you want to investigate. What challenges or pain points are you exploring?"
                    rows={5}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Example: "Users struggling with setting up home networks, especially first-time buyers"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Target Audience
                  </label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., first-time homeowners, freelance designers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Subreddit
                  </label>
                 
                  
                  <div className="flex gap-2">
                    <Input
                      value={newSubreddit}
                      onChange={(e) => setNewSubreddit(e.target.value)}
                      onKeyDown={handleSubredditKeyDown}
                      placeholder="Enter a subreddit..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddSubreddit} variant="secondary">
                      Add
                    </Button>
                    
                    
                  </div>
                  <p className="text-xs mb-4 text-muted-foreground">
                    Focus your search on specific communities where your audience is active
                  </p>
                  {subreddits.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <div className="flex flex-wrap gap-2">
                        {subreddits.map((subreddit, index) => (

                      
                          <KeywordTag
                            key={index}
                            keyword={`r/` + subreddit.replace(/^r\//, '')}
                            className='border-red-500 text-red-700 '
                            onRemove={() => handleRemoveSubreddit(subreddit)}
                          />
                          
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {subreddits.length} keyword{subreddits.length !== 1 ? 's' : ''} added
                      </div>
                    </div>
                  )}
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
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Search Keywords
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
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
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <KeywordTag
                            key={index}
                            keyword={keyword}
                            onRemove={() => handleRemoveKeyword(keyword)}
                          />
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} added
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Generation */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    AI Keyword Generator
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
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
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <h4 className="font-semibold text-sm text-foreground mb-3">
                    Research Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Problem:</span>{' '}
                      <span className="text-foreground">{problemExplorationDescription}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Audience:</span>{' '}
                      <span className="text-foreground">{targetAudience}</span>
                    </div>
                    {subreddits && (
                      <div>
                        <span className="text-muted-foreground">Subreddit:</span>{' '}
                        <span className="text-foreground">{subreddits}</span>
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
                onClick={scraperClusterId ? handleUpdateScraperCluster : handlCreateScraperCluster}
                disabled={keywords.length === 0 || isCreating}
              >
                {isCreating ? (scraperClusterId ? 'Updating...' : 'Creating...' ) : (scraperClusterId ? 'Update Scraper Cluster' : 'Create Scraper Cluster')}
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

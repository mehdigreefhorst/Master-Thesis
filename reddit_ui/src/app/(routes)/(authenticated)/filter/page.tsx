'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { clusterApi } from '@/lib/api';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { Button } from '@/components/ui/Button';

// Category labels for filtering
const CATEGORY_LABELS = [
  'problem_description',
  'frustration_expression',
  'solution_seeking',
  'solution_attempted',
  'solution_proposing',
  'agreement_empathy',
  'none_of_the_above'
] as const;

export default function FilterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const [allClusterUnits, setAllClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [upvotesMin, setUpvotesMin] = useState<number | null>(null);
  const [upvotesMax, setUpvotesMax] = useState<number | null>(null);
  const [hasGroundTruth, setHasGroundTruth] = useState<boolean | null>(null);
  const [hasPredictions, setHasPredictions] = useState<boolean | null>(null);
  const [selectedGroundTruthLabels, setSelectedGroundTruthLabels] = useState<Set<string>>(new Set());
  const [messageType, setMessageType] = useState<"post" | "comment" | "all">("all");

  // Fetch all cluster units on mount
  useEffect(() => {
    async function fetchClusterUnits() {
      if (!scraperClusterId) return;

      try {
        setIsLoading(true);
        const units = await clusterApi.getClusterUnits(
          authFetch,
          scraperClusterId,
          "all"
        );
        setAllClusterUnits(units);
      } catch (err) {
        console.error('Failed to fetch cluster units:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClusterUnits();
  }, [scraperClusterId, authFetch]);

  // Get unique subreddits from all units
  const uniqueSubreddits = useMemo(() => {
    const subreddits = new Set(allClusterUnits.map(unit => unit.subreddit));
    return Array.from(subreddits).sort();
  }, [allClusterUnits]);

  // Apply filters on the client side (funnel approach)
  const filteredUnits = useMemo(() => {
    let filtered = allClusterUnits;

    // Filter by message type
    if (messageType !== "all") {
      filtered = filtered.filter(unit => unit.type === messageType);
    }

    // Filter by subreddits
    if (selectedSubreddits.size > 0) {
      filtered = filtered.filter(unit =>
        selectedSubreddits.has(unit.subreddit)
      );
    }

    // Filter by upvotes
    if (upvotesMin !== null) {
      filtered = filtered.filter(unit => unit.upvotes >= upvotesMin);
    }
    if (upvotesMax !== null) {
      filtered = filtered.filter(unit => unit.upvotes <= upvotesMax);
    }

    // Filter by ground truth
    if (hasGroundTruth !== null) {
      if (hasGroundTruth) {
        filtered = filtered.filter(unit => unit.ground_truth !== null && unit.ground_truth !== undefined);
      } else {
        filtered = filtered.filter(unit => unit.ground_truth === null || unit.ground_truth === undefined);
      }
    }

    // Filter by specific ground truth labels
    if (selectedGroundTruthLabels.size > 0) {
      filtered = filtered.filter(unit => {
        if (!unit.ground_truth) return false;
        // Unit must have ALL selected labels set to true
        return Array.from(selectedGroundTruthLabels).every(label => {
          return unit.ground_truth[label as keyof typeof unit.ground_truth] === true;
        });
      });
    }

    // Filter by predictions
    if (hasPredictions !== null) {
      if (hasPredictions) {
        filtered = filtered.filter(unit =>
          unit.predicted_category &&
          Object.keys(unit.predicted_category).length > 0
        );
      } else {
        filtered = filtered.filter(unit =>
          !unit.predicted_category ||
          Object.keys(unit.predicted_category).length === 0
        );
      }
    }

    return filtered;
  }, [
    allClusterUnits,
    messageType,
    selectedSubreddits,
    upvotesMin,
    upvotesMax,
    hasGroundTruth,
    selectedGroundTruthLabels,
    hasPredictions
  ]);

  // Get selected unit IDs for actions
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());

  const handleToggleSubreddit = (subreddit: string) => {
    const newSet = new Set(selectedSubreddits);
    if (newSet.has(subreddit)) {
      newSet.delete(subreddit);
    } else {
      newSet.add(subreddit);
    }
    setSelectedSubreddits(newSet);
  };

  const handleToggleGroundTruthLabel = (label: string) => {
    const newSet = new Set(selectedGroundTruthLabels);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setSelectedGroundTruthLabels(newSet);
  };

  const clearFilters = () => {
    setSelectedSubreddits(new Set());
    setUpvotesMin(null);
    setUpvotesMax(null);
    setHasGroundTruth(null);
    setHasPredictions(null);
    setSelectedGroundTruthLabels(new Set());
    setMessageType("all");
  };

  const handleViewInViewer = () => {
    if (filteredUnits.length > 0) {
      router.push(`/viewer?scraper_cluster_id=${scraperClusterId}&cluster_unit_id=${filteredUnits[0].id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading cluster units...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Filter Cluster Units</h1>

      {/* Funnel Visualization */}
      <div className="mb-8 p-6 bg-gradient-to-b from-blue-50 to-white rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-center">Data Funnel</h2>
        <div className="flex flex-col items-center space-y-2">
          <div className="w-full max-w-2xl">
            <div className="bg-blue-100 rounded-t-lg p-4 text-center border-2 border-blue-300">
              <div className="text-2xl font-bold text-blue-900">{allClusterUnits.length}</div>
              <div className="text-sm text-blue-700">Total Cluster Units</div>
            </div>
          </div>
          <div className="text-2xl text-gray-400">↓</div>
          <div className="w-full max-w-xl">
            <div className="bg-blue-200 p-4 text-center border-2 border-blue-400">
              <div className="text-2xl font-bold text-blue-900">{filteredUnits.length}</div>
              <div className="text-sm text-blue-700">After Filters Applied</div>
              <div className="text-xs text-blue-600 mt-1">
                {allClusterUnits.length > 0
                  ? `(${((filteredUnits.length / allClusterUnits.length) * 100).toFixed(1)}% remaining)`
                  : '(0% remaining)'}
              </div>
            </div>
          </div>
          <div className="text-2xl text-gray-400">↓</div>
          <div className="w-full max-w-md">
            <div className="bg-blue-300 rounded-b-lg p-4 text-center border-2 border-blue-500">
              <div className="text-lg font-semibold text-blue-900">Choose Action</div>
              <div className="text-xs text-blue-700 mt-1">Process filtered units below</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Filter Options</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Message Type Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Message Type</label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as "post" | "comment" | "all")}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value="all">All Types</option>
              <option value="post">Posts Only</option>
              <option value="comment">Comments Only</option>
            </select>
          </div>

          {/* Upvotes Range Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Upvotes Range</label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Minimum"
                value={upvotesMin ?? ''}
                onChange={(e) => setUpvotesMin(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Maximum"
                value={upvotesMax ?? ''}
                onChange={(e) => setUpvotesMax(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Ground Truth Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Ground Truth</label>
            <select
              value={hasGroundTruth === null ? '' : hasGroundTruth ? 'yes' : 'no'}
              onChange={(e) => {
                if (e.target.value === '') setHasGroundTruth(null);
                else setHasGroundTruth(e.target.value === 'yes');
              }}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value="">All</option>
              <option value="yes">Has Ground Truth</option>
              <option value="no">No Ground Truth</option>
            </select>
          </div>

          {/* Predictions Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Predictions</label>
            <select
              value={hasPredictions === null ? '' : hasPredictions ? 'yes' : 'no'}
              onChange={(e) => {
                if (e.target.value === '') setHasPredictions(null);
                else setHasPredictions(e.target.value === 'yes');
              }}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value="">All</option>
              <option value="yes">Has Predictions</option>
              <option value="no">No Predictions</option>
            </select>
          </div>

          {/* Subreddit Filter */}
          <div className="col-span-full">
            <label className="block text-sm font-semibold mb-2">
              Subreddits ({selectedSubreddits.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {uniqueSubreddits.map(subreddit => (
                  <label key={subreddit} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubreddits.has(subreddit)}
                      onChange={() => handleToggleSubreddit(subreddit)}
                      className="rounded"
                    />
                    <span className="text-sm">{subreddit}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Ground Truth Labels Filter */}
          <div className="col-span-full">
            <label className="block text-sm font-semibold mb-2">
              Ground Truth Labels ({selectedGroundTruthLabels.size} selected)
            </label>
            <div className="border rounded-md p-3 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {CATEGORY_LABELS.map(label => (
                  <label key={label} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGroundTruthLabels.has(label)}
                      onChange={() => handleToggleGroundTruthLabel(label)}
                      className="rounded"
                    />
                    <span className="text-sm">{label.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={clearFilters} variant="secondary">
            Clear All Filters
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <div className="text-lg font-semibold text-blue-900">
          Showing {filteredUnits.length} of {allClusterUnits.length} cluster units
        </div>
        {filteredUnits.length > 0 && (
          <div className="text-sm text-blue-700 mt-1">
            Ready to perform actions on filtered results
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Actions on Filtered Units</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1: Create Standalone Statements */}
          <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Extract Standalone Statements</h3>
            <p className="text-sm text-gray-600 mb-4">
              Extract standalone problem/solution statements from filtered units and cluster them using BERTopic
            </p>
            <Button
              onClick={() => alert('Standalone statements extraction - Coming soon!')}
              disabled={filteredUnits.length === 0}
              className="w-full"
            >
              Create Statement Clusters
            </Button>
          </div>

          {/* Action 2: LLM Category Prediction */}
          <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-2">LLM Category Clustering</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use LLM-based category prediction to automatically cluster filtered units by predicted categories
            </p>
            <Button
              onClick={() => alert('LLM category clustering - Coming soon!')}
              disabled={filteredUnits.length === 0}
              className="w-full"
            >
              Run LLM Clustering
            </Button>
          </div>
        </div>
      </div>

      {/* Preview of Filtered Results */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-6 py-3 border-b">
          <h2 className="text-lg font-semibold">Filtered Results Preview</h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredUnits.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No cluster units match the current filters
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Subreddit</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Author</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Upvotes</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Ground Truth</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.slice(0, 50).map((unit) => (
                  <tr key={unit.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{unit.type}</td>
                    <td className="px-4 py-2 text-sm">{unit.subreddit}</td>
                    <td className="px-4 py-2 text-sm">{unit.author}</td>
                    <td className="px-4 py-2 text-sm">{unit.upvotes}</td>
                    <td className="px-4 py-2 text-sm">
                      {unit.ground_truth ? '✓' : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => router.push(`/viewer?scraper_cluster_id=${scraperClusterId}&cluster_unit_id=${unit.id}`)}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredUnits.length > 50 && (
            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t">
              Showing first 50 of {filteredUnits.length} results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

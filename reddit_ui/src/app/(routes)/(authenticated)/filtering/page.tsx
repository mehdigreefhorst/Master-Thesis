'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HeaderStep } from '@/components/layout/HeaderStep';
import { InputSelector } from '@/components/filtering/InputSelector';
import { MiscFilterForm } from '@/components/filtering/MiscFilterForm';
import { LabelFilterForm } from '@/components/filtering/LabelFilterForm';
import { FilterCountDisplay } from '@/components/filtering/FilterCountDisplay';
import { ClusterUnitsViewer } from '@/components/filtering/ClusterUnitsViewer';
import { useAuthFetch } from '@/utils/fetch';
import { filteringApi } from '@/lib/api';
import { FilteringRequest, FilterMisc, LabelTemplateFilter, FilteringResponseClusterUnits } from '@/types/filtering';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';

function FilteringPageContent() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get URL params
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const initialExperimentId = searchParams.get('experiment_id');

  // Input selection - always experiment for now
  const [inputType] = useState<"experiment" | "filtering" | "cluster">("experiment");
  const [inputId, setInputId] = useState<string>("");
  const [labelTemplateId, setLabelTemplateId] = useState<string>("");

  // Filter state
  const [filterMisc, setFilterMisc] = useState<FilterMisc>({});
  const [labelFilterAND, setLabelFilterAND] = useState<Record<string, LabelTemplateFilter>>({});
  const [labelFilterOR, setLabelFilterOR] = useState<Record<string, LabelTemplateFilter>>({});

  // Results state
  const [beforeCount, setBeforeCount] = useState<number | null>(null);
  const [afterCount, setAfterCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const [clusterUnits, setClusterUnits] = useState<FilteringResponseClusterUnits | null>(null);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [showUnits, setShowUnits] = useState(false);

  // Update URL when experiment changes
  const handleInputIdChange = (id: string) => {
    setInputId(id);
    if (scraperClusterId) {
      router.push(`/filtering?scraper_cluster_id=${scraperClusterId}&experiment_id=${id}`);
    }
  };

  // Build filtering request
  const buildFilteringRequest = (returnType: "count" | "cluster_units", limit: number = 1000): FilteringRequest => {
    return {
      label_template_id: labelTemplateId,
      input_id: inputId,
      input_type: inputType,
      filter_misc: Object.keys(filterMisc).length > 0 ? filterMisc : undefined,
      label_template_filter_and: Object.keys(labelFilterAND).length > 0 ? labelFilterAND : undefined,
      label_template_filter_or: Object.keys(labelFilterOR).length > 0 ? labelFilterOR : undefined,
      return_type: returnType,
      limit
    };
  };

  // Fetch count
  const handleGetCount = async () => {
    if (!inputId || !labelTemplateId) {
      alert("Please select an experiment");
      return;
    }

    setIsLoadingCount(true);
    try {
      const request = buildFilteringRequest("count");
      const result = await filteringApi.getFilteredCount(authFetch, request);
      setBeforeCount(result.before_filtering);
      setAfterCount(result.after_filtering);
    } catch (error) {
      console.error("Error fetching count:", error);
      alert("Failed to fetch count");
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Fetch cluster units
  const handleViewUnits = async () => {
    if (!inputId || !labelTemplateId) {
      alert("Please select an experiment");
      return;
    }

    setIsLoadingUnits(true);
    try {
      const request = buildFilteringRequest("cluster_units", 100);
      const result = await filteringApi.getFilteredClusterUnits(authFetch, request);
      setClusterUnits(result);
      setShowUnits(true);
    } catch (error) {
      console.error("Error fetching cluster units:", error);
      alert("Failed to fetch cluster units");
    } finally {
      setIsLoadingUnits(false);
    }
  };

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-[95vw] mx-auto">
        <HeaderStep
          title="Filter Cluster Units"
          subtitle="Apply filters to cluster units from experiments"
        />

        {/* Main Layout: Left Panel + Right Content */}
        <div className="flex gap-6">
          {/* Left Panel - Filters */}
          <div className="w-104 flex-shrink-0">
            <Card className="p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4">Filter Settings</h3>

              {/* Input Selection */}
              <div className="mb-6">
                <InputSelector
                  inputType={inputType}
                  inputId={inputId}
                  scraperClusterId={scraperClusterId || undefined}
                  onInputIdChange={handleInputIdChange}
                  onLabelTemplateIdChange={setLabelTemplateId}
                  initialExperimentId={initialExperimentId || undefined}
                />
              </div>

              {/* Metadata Filters */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Metadata Filters</h4>
                <MiscFilterForm
                  filterMisc={filterMisc}
                  onChange={setFilterMisc}
                />
              </div>

              {/* Label Filters */}
              {labelTemplateId && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3 text-gray-700">Label Filters</h4>
                  <LabelFilterForm
                    labelTemplateId={labelTemplateId}
                    labelFilterAND={labelFilterAND}
                    labelFilterOR={labelFilterOR}
                    onFilterANDChange={setLabelFilterAND}
                    onFilterORChange={setLabelFilterOR}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleGetCount}
                  disabled={!inputId || !labelTemplateId || isLoadingCount}
                  variant="primary"
                  className="w-full"
                >
                  {isLoadingCount ? "Loading..." : "Get Count"}
                </Button>

                <Button
                  onClick={handleViewUnits}
                  disabled={!inputId || !labelTemplateId || isLoadingUnits}
                  variant="secondary"
                  className="w-full"
                >
                  {isLoadingUnits ? "Loading..." : "View Units"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Content - Results */}
          <div className="flex-1">
            {/* Count Display */}
            {(beforeCount !== null || afterCount !== null) && (
              <div className="mb-6">
                <FilterCountDisplay
                  beforeCount={beforeCount ?? 0}
                  afterCount={afterCount ?? 0}
                />
              </div>
            )}

            {/* Cluster Units Viewer */}
            {showUnits && clusterUnits && (
              <ClusterUnitsViewer
                clusterUnits={clusterUnits.filtered_cluster_units}
                onClose={() => setShowUnits(false)}
                experimentId={inputId}
              />
            )}

            {/* Empty State */}
            {!showUnits && beforeCount === null && (
              <Card className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No filters applied yet</h3>
                <p className="text-gray-600">
                  Select an experiment and configure your filters, then click "Get Count" to see results.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FilteringPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-[95vw] mx-auto">
          <HeaderStep title="Filter Cluster Units" subtitle="" />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <FilteringPageContent />
    </Suspense>
  );
}

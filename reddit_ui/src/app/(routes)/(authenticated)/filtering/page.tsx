'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HeaderStep } from '@/components/layout/HeaderStep';
import { ExperimentSelector } from '@/components/filtering/ExperimentSelector';
import { FilteringSelector } from '@/components/filtering/FilteringSelector';
import { MiscFilterForm } from '@/components/filtering/MiscFilterForm';
import { LabelFilterForm } from '@/components/filtering/LabelFilterForm';
import { FilterCountDisplay } from '@/components/filtering/FilterCountDisplay';
import { ClusterUnitsViewer } from '@/components/filtering/ClusterUnitsViewer';
import { useAuthFetch } from '@/utils/fetch';
import { filteringApi } from '@/lib/api';
import { FilteringRequest, FilterMisc, LabelTemplateFilter, FilteringResponseClusterUnits, FilteringEntity, FilteringCreateRequest } from '@/types/filtering';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/use-toast';

function FilteringPageContent() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Get URL params
  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const initialExperimentId = searchParams.get('experiment_id');

  // Key to force FilteringSelector to refresh
  const [filteringSelectorKey, setFilteringSelectorKey] = useState(0);

  // Input selection state
  const [inputType, setInputType] = useState<"experiment" | "filtering" | "cluster">("experiment");
  const [inputId, setInputId] = useState<string>("");
  const [labelTemplateId, setLabelTemplateId] = useState<string>("");

  // Filtering entity state
  const [filteringId, setFilteringId] = useState<string | null>(null);
  const [selectedFilteringEntity, setSelectedFilteringEntity] = useState<FilteringEntity | null>(null);

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

  // Derived state: are we using a filtering entity?
  const isUsingFilteringEntity = filteringId !== null && selectedFilteringEntity !== null;

  // Handle experiment selection
  const handleExperimentSelect = (experimentId: string, experimentLabelTemplateId: string | null) => {
    setInputId(experimentId);
    setInputType("experiment");
    if (experimentLabelTemplateId) {
      setLabelTemplateId(experimentLabelTemplateId);
    }

    // Update URL
    if (scraperClusterId) {
      router.push(`/filtering?scraper_cluster_id=${scraperClusterId}&experiment_id=${experimentId}`);
    }
  };

  // Handle experiment clear
  const handleExperimentClear = () => {
    setInputId("");
    setLabelTemplateId("");
    setInputType("experiment");
  };

  // Handle filtering entity selection
  const handleFilteringSelect = async (filteringEntity: FilteringEntity) => {
    console.log("Filtering entity selected:", filteringEntity);

    // Set filtering entity state
    setFilteringId(filteringEntity.id);
    setSelectedFilteringEntity(filteringEntity);

    // Update input type and IDs based on filtering entity
    setInputType(filteringEntity.input_type);
    setInputId(filteringEntity.input_id);
    setLabelTemplateId(filteringEntity.label_template_id);

    // Load filtering entity's filter settings
    if (filteringEntity.filter_misc) {
      setFilterMisc(filteringEntity.filter_misc);
    }
    if (filteringEntity.label_template_filter_and) {
      setLabelFilterAND(filteringEntity.label_template_filter_and);
    }
    if (filteringEntity.label_template_filter_or) {
      setLabelFilterOR(filteringEntity.label_template_filter_or);
    }

    // Auto-fetch count and cluster units with limit 10
    toast({
      title: "Loading",
      description: "Fetching results for filtering entity...",
    });

    await Promise.all([
      fetchCountForEntity(filteringEntity),
      fetchUnitsForEntity(filteringEntity)
    ]);
  };

  // Helper function to fetch count for a filtering entity
  const fetchCountForEntity = async (entity: FilteringEntity) => {
    try {
      const request = buildFilteringRequestFromEntity(entity, "count");
      const result = await filteringApi.getFilteredCount(authFetch, request);
      setBeforeCount(result.before_filtering);
      setAfterCount(result.after_filtering);
      toast({
        title: "Success",
        description: "Count fetched successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error fetching count:", error);
      toast({
        title: "Error",
        description: "Failed to fetch count",
        variant: "destructive",
      });
    }
  };

  // Helper function to fetch cluster units for a filtering entity
  const fetchUnitsForEntity = async (entity: FilteringEntity) => {
    try {
      const request = buildFilteringRequestFromEntity(entity, "cluster_units", 10);
      const result = await filteringApi.getFilteredClusterUnits(authFetch, request);
      setClusterUnits(result);
      setShowUnits(true);
      toast({
        title: "Success",
        description: "Cluster units fetched successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error fetching cluster units:", error);
      toast({
        title: "Error",
        description: "Failed to fetch cluster units",
        variant: "destructive",
      });
    }
  };

  // Build filtering request from entity
  const buildFilteringRequestFromEntity = (
    entity: FilteringEntity,
    returnType: "count" | "cluster_units",
    limit: number = 1000
  ): FilteringRequest => {
    return {
      label_template_id: entity.label_template_id,
      input_id: entity.input_id,
      input_type: entity.input_type,
      filter_misc: entity.filter_misc,
      label_template_filter_and: entity.label_template_filter_and,
      label_template_filter_or: entity.label_template_filter_or,
      return_type: returnType,
      limit
    };
  };

  // Handle filtering entity clear
  const handleFilteringClear = () => {
    console.log("Filtering entity cleared");

    // Clear filtering entity state
    setFilteringId(null);
    setSelectedFilteringEntity(null);

    // Reset to experiment mode
    setInputType("experiment");

    // Clear filters
    setFilterMisc({});
    setLabelFilterAND({});
    setLabelFilterOR({});
  };

  // Handle create filtering entity
  const handleCreateFiltering = async () => {
    if (!scraperClusterId) {
      toast({
        title: "Error",
        description: "No scraper cluster ID available",
        variant: "destructive",
      });
      return;
    }

    if (!inputId || !labelTemplateId) {
      toast({
        title: "Error",
        description: "Please select an experiment first",
        variant: "destructive",
      });
      return;
    }

    try {
      const filteringCreateRequest: FilteringCreateRequest = {
        scraper_cluster_id: scraperClusterId,
        filtering_fields: {
          label_template_id: labelTemplateId,
          input_id: inputId,
          input_type: inputType,
          filter_misc: Object.keys(filterMisc).length > 0 ? filterMisc : undefined,
          label_template_filter_and: Object.keys(labelFilterAND).length > 0 ? labelFilterAND : undefined,
          label_template_filter_or: Object.keys(labelFilterOR).length > 0 ? labelFilterOR : undefined,
        }
      };

      const result = await filteringApi.createFilteringEntity(authFetch, filteringCreateRequest);
      console.log("Created filtering entity:", result);

      toast({
        title: "Success",
        description: `Filtering entity created! ID: ${result.filtering_entity_id.slice(0, 12)}...`,
        variant: "success",
      });

      // Fetch the created entity and auto-select it
      const createdEntity = await filteringApi.getFilteringEntity(authFetch, { filtering_entity_id: result.filtering_entity_id });

      // Refresh the FilteringSelector dropdown by incrementing key
      setFilteringSelectorKey(prev => prev + 1);

      // Auto-select the created entity after a brief delay to allow the selector to refresh
      setTimeout(() => {
        handleFilteringSelect(createdEntity);
      }, 300);

    } catch (error) {
      console.error("Error creating filtering entity:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create filtering entity",
        variant: "destructive",
      });
    }
  }

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
      toast({
        title: "Error",
        description: "Please select an experiment or filtering entity",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingCount(true);
    try {
      const request = buildFilteringRequest("count");
      const result = await filteringApi.getFilteredCount(authFetch, request);
      setBeforeCount(result.before_filtering);
      setAfterCount(result.after_filtering);
      toast({
        title: "Success",
        description: `Found ${result.after_filtering} units after filtering`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error fetching count:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch count",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Fetch cluster units
  const handleViewUnits = async () => {
    if (!inputId || !labelTemplateId) {
      toast({
        title: "Error",
        description: "Please select an experiment or filtering entity",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingUnits(true);
    try {
      const request = buildFilteringRequest("cluster_units", 100);
      const result = await filteringApi.getFilteredClusterUnits(authFetch, request);
      setClusterUnits(result);
      setShowUnits(true);
      toast({
        title: "Success",
        description: `Loaded ${result.filtered_cluster_units.length} cluster units`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error fetching cluster units:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch cluster units",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUnits(false);
    }
  };

  // Check if scraper cluster is available
  if (!scraperClusterId) {
    return (
      <div className="p-8">
        <div className="max-w-[95vw] mx-auto">
          <Card className="p-8 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-yellow-900">No Scraper Cluster Selected</h3>
                <p className="text-yellow-800 mt-1">
                  Please navigate from the experiments page with a scraper cluster ID in the URL:
                  <code className="ml-2 px-2 py-1 bg-yellow-100 rounded">?scraper_cluster_id=XXX</code>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-[pageLoad_400ms_ease-out]">
      <div className="max-w-[95vw] mx-auto">
        <HeaderStep
          title="Filter Cluster Units"
          subtitle="Apply filters to cluster units from experiments or use saved filtering entities"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Experiment Selector */}
            <ExperimentSelector
              scraperClusterId={scraperClusterId}
              selectedExperimentId={inputId}
              onExperimentSelect={handleExperimentSelect}
              onExperimentClear={handleExperimentClear}
              disabled={isUsingFilteringEntity}
              initialExperimentId={initialExperimentId}
            />

            {/* Filtering Entity Selector */}
            <FilteringSelector
              key={filteringSelectorKey}
              scraperClusterId={scraperClusterId}
              selectedFilteringId={filteringId}
              onFilteringSelect={handleFilteringSelect}
              onFilteringClear={handleFilteringClear}
            />
          </div>

          {/* Create Filtering Button */}
          {!isUsingFilteringEntity && (
            <div className="py-2">
              <Button
                onClick={handleCreateFiltering}
                disabled={!inputId || !labelTemplateId}
                variant="primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Save Current Filters as Filtering Entity
              </Button>
            </div>
          )}

          {/* Filtering Entity Info */}
          {isUsingFilteringEntity && (
            <div className="py-2">
              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm w-sm text-purple-900">
                    Using saved filtering entity. Experiment selector and filter settings are disabled.
                    Clear the filtering entity to modify filters.
                  </p>
                </div>
              </Card>
            </div>
          )}
        </HeaderStep>

        {/* Main Layout: Left Panel + Right Content */}
        <div className="flex gap-6">
          {/* Left Panel - Filters */}
          <div className="w-104 flex-shrink-0">
            <Card className={`p-6 sticky top-6 transition-opacity ${isUsingFilteringEntity ? 'opacity-60' : ''}`}>
              <h3 className="text-lg font-semibold mb-4">Filter Settings</h3>

              {/* Metadata Filters */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Metadata Filters</h4>
                <MiscFilterForm
                  filterMisc={filterMisc}
                  onChange={setFilterMisc}
                  disabled={isUsingFilteringEntity}
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
                    disabled={isUsingFilteringEntity}
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

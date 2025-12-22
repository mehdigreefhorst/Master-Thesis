import React, { useState, useEffect } from 'react';
import { Database, Filter, Grid } from 'lucide-react';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi } from '@/lib/api';
import { useToast } from '../ui/use-toast';
import { ComplexSelector, ComplexSelectorTab, Card } from '../ui';
import { InputEntitiesResponse, InputEntityDisplay } from '@/types/input-entity';

interface InputEntitySelectorProps {
  scraperClusterId: string;
  selectedEntity?: InputEntityDisplay;
  onEntityChange: (entity: InputEntityDisplay, type: 'sample' | 'filtering' | 'cluster') => void;
  className?: string;
  // Query params for auto-selection
  sampleId?: string;
  filteringId?: string;
  clusterId?: string;
  sampleOnly?: boolean;
}

export const InputEntitySelector: React.FC<InputEntitySelectorProps> = ({
  scraperClusterId,
  selectedEntity,
  onEntityChange,
  className = '',
  sampleId,
  filteringId,
  clusterId,
  sampleOnly = true,
}) => {
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const [entities, setEntities] = useState<{
    samples: InputEntityDisplay[];
    filterings: InputEntityDisplay[];
    clusters: InputEntityDisplay[];
  }>({
    samples: [],
    filterings: [],
    clusters: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch input entities on mount
  useEffect(() => {
    async function fetchEntities() {
      if (!scraperClusterId) return;

      try {
        setIsLoading(true);
        const data: InputEntitiesResponse = await experimentApi.getInputEntities(
          authFetch,
          scraperClusterId,
          sampleOnly
        );

        // Convert to display entities
        const sampleDisplays: InputEntityDisplay[] = (data.sample_entity || []).map((sample, index) => ({
          id: sample.id,
          name: `Sample ${index + 1}`,
          cluster_unit_count: sample.sample_size,
          created_at: undefined,
          description: `Sample with ${sample.sample_size} cluster units`,
          type: 'sample' as const,
        }));

        const filteringDisplays: InputEntityDisplay[] = (data.filtering_entities || []).map((filtering, index) => ({
          id: filtering.id,
          name: `Filtering ${index + 1}`,
          cluster_unit_count: 0, // Will be updated if we have the data
          created_at: filtering.created_at ? new Date(filtering.created_at).toISOString() : undefined,
          description: `Filtering rule for ${filtering.label_template_id}`,
          type: 'filtering' as const,
        }));

        const clusterDisplays: InputEntityDisplay[] = (data.cluster_entity || []).map((cluster, index) => ({
          id: cluster.id,
          name: `Cluster ${index + 1}`,
          cluster_unit_count: cluster.count_cluster_units,
          created_at: undefined,
          description: `Cluster with ${cluster.count_cluster_units} cluster units`,
          type: 'cluster' as const,
        }));

        setEntities({
          samples: sampleDisplays,
          filterings: filteringDisplays,
          clusters: clusterDisplays,
        });

        // Auto-select entity based on query params
        if (sampleId) {
          const sample = sampleDisplays.find((s) => s.id === sampleId);
          if (sample) {
            onEntityChange(sample, 'sample');
          }
        } else if (filteringId) {
          const filtering = filteringDisplays.find((f) => f.id === filteringId);
          if (filtering) {
            onEntityChange(filtering, 'filtering');
          }
        } else if (clusterId) {
          const cluster = clusterDisplays.find((c) => c.id === clusterId);
          if (cluster) {
            onEntityChange(cluster, 'cluster');
          }
        }
      } catch (err) {
        console.error('Failed to fetch input entities:', err);
        toast({
          title: 'Error',
          description: 'Failed to load input entities',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntities();
  }, [scraperClusterId, sampleId, filteringId, clusterId, sampleOnly, authFetch]);

  // Combine all entities for the selector
  const allEntities: InputEntityDisplay[] = [
    ...entities.samples,
    ...entities.filterings,
    ...entities.clusters,
  ];

  // Define tabs
  const tabs: ComplexSelectorTab<InputEntityDisplay>[] = [
    {
      id: 'sample',
      label: 'Samples',
      badge: entities.samples.length,
      icon: <Database className="w-4 h-4" />,
      filter: (entity) => entity.type === 'sample',
    },
    {
      id: 'filtering',
      label: 'Filtering',
      badge: entities.filterings.length,
      icon: <Filter className="w-4 h-4" />,
      filter: (entity) => entity.type === 'filtering',
    },
    {
      id: 'cluster',
      label: 'Clusters',
      badge: entities.clusters.length,
      icon: <Grid className="w-4 h-4" />,
      filter: (entity) => entity.type === 'cluster',
    },
  ];

  // Search filter
  const searchFilter = (entity: InputEntityDisplay, query: string) => {
    const lowerQuery = query.toLowerCase();
    return (
      entity.name.toLowerCase().includes(lowerQuery) ||
      entity.id.toLowerCase().includes(lowerQuery) ||
      entity.description?.toLowerCase().includes(lowerQuery) ||
      false
    );
  };

  // Render selected item
  const renderSelectedItem = (entity: InputEntityDisplay) => (
    <div className="flex items-center gap-2">
      {entity.type === 'sample' && <Database className="w-4 h-4 text-blue-600" />}
      {entity.type === 'filtering' && <Filter className="w-4 h-4 text-green-600" />}
      {entity.type === 'cluster' && <Grid className="w-4 h-4 text-purple-600" />}
      <span className="font-medium">{entity.name}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">{entity.cluster_unit_count} units</span>
    </div>
  );

  // Render item
  const renderItem = (entity: InputEntityDisplay, isSelected: boolean) => (
    <Card
      className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
      }`}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {entity.type === 'sample' && <Database className="w-5 h-5 text-blue-600" />}
            {entity.type === 'filtering' && <Filter className="w-5 h-5 text-green-600" />}
            {entity.type === 'cluster' && <Grid className="w-5 h-5 text-purple-600" />}
            <h3 className="font-semibold text-gray-900">{entity.name}</h3>
          </div>
          {isSelected && (
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Description */}
        {entity.description && (
          <p className="text-xs text-gray-600">{entity.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">Cluster Units</span>
          <span className="text-sm font-semibold text-gray-900">
            {entity.cluster_unit_count}
          </span>
        </div>

        {/* Created At */}
        {entity.created_at && (
          <div className="text-xs text-gray-400">
            Created: {new Date(entity.created_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </Card>
  );

  // Empty tab text
  const emptyTabText = (tabId: string) => {
    const tabNames = {
      sample: 'samples',
      filtering: 'filtering rules',
      cluster: 'clusters',
    };
    return `No ${tabNames[tabId as keyof typeof tabNames] || 'entities'} available`;
  };

  // Handle selection
  const handleSelect = (entity: InputEntityDisplay) => {
    onEntityChange(entity, entity.type);
  };

  // Get default tab based on auto-selected entity
  const getDefaultTab = () => {
    if (sampleId) return 'sample';
    if (filteringId) return 'filtering';
    if (clusterId) return 'cluster';
    return 'sample';
  };

  return (
    <ComplexSelector
      items={allEntities}
      selectedItem={selectedEntity || null}
      onSelect={handleSelect}
      tabs={tabs}
      defaultTab={getDefaultTab()}
      label="Input Source"
      placeholder="Select input source"
      renderSelectedItem={renderSelectedItem}
      renderItem={renderItem}
      enableSearch={true}
      searchPlaceholder="Search entities..."
      searchFilter={searchFilter}
      isLoading={isLoading}
      className={className}
      dropdownWidth="md:w-[700px]"
      gridColumns={1}
      emptyTabText={emptyTabText}
    />
  );
};

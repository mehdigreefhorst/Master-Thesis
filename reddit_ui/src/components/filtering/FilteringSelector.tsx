'use client';

import { useState, useEffect } from 'react';
import { BaseSelector, BaseSelectorItem } from '@/components/ui/BaseSelector';
import { useAuthFetch } from '@/utils/fetch';
import { filteringApi } from '@/lib/api';
import { FilteringEntity } from '@/types/filtering';

interface FilteringItem extends BaseSelectorItem {
  id: string;
  label: string;
  label_template_id: string;
  input_type: "experiment" | "filtering" | "cluster" | "sample";
  created_at: Date;
}

interface FilteringSelectorProps {
  scraperClusterId: string;
  selectedFilteringId: string | null;
  onFilteringSelect: (filteringEntity: FilteringEntity) => void;
  onFilteringClear: () => void;
  disabled?: boolean;
  className?: string;
}

export const FilteringSelector: React.FC<FilteringSelectorProps> = ({
  scraperClusterId,
  selectedFilteringId,
  onFilteringSelect,
  onFilteringClear,
  disabled = false,
  className = ''
}) => {
  const authFetch = useAuthFetch();
  const [filteringEntities, setFilteringEntities] = useState<FilteringItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rawEntities, setRawEntities] = useState<FilteringEntity[]>([]);

  // Fetch filtering entities when scraper cluster is available
  useEffect(() => {
    if (scraperClusterId) {
      fetchFilteringEntities();
    }
  }, [scraperClusterId]);

  const fetchFilteringEntities = async () => {
    setIsLoading(true);
    try {
      const entities = await filteringApi.getFilteringEntities(authFetch, scraperClusterId);
      console.log("Fetched filtering entities:", entities);

      // Store raw entities for later use
      setRawEntities(entities);

      // Transform to FilteringItem format
      const transformedEntities: FilteringItem[] = entities.map((entity, index) => ({
        id: entity.id,
        label: `Filter #${index + 1} (${entity.input_type})`,
        label_template_id: entity.label_template_id,
        input_type: entity.input_type,
        created_at: entity.created_at,
      }));

      setFilteringEntities(transformedEntities);
    } catch (error) {
      console.error("Error fetching filtering entities:", error);
      setFilteringEntities([]);
      setRawEntities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (filteringItem: FilteringItem) => {
    console.log("Selected filtering entity:", filteringItem);

    // Find the full entity and pass it to parent
    const fullEntity = rawEntities.find(e => e.id === filteringItem.id);
    if (fullEntity) {
      onFilteringSelect(fullEntity);
    }
  };

  const handleClear = () => {
    onFilteringClear();
  };

  // Custom renderer to show filtering entity details
  const renderFilteringItem = (filteringItem: FilteringItem, isSelected: boolean) => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className={`${isSelected ? 'font-semibold text-purple-600' : 'font-medium'}`}>
          {filteringItem.label}
        </span>
        {isSelected && (
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="flex gap-3 mt-1">
        <span className="text-xs text-gray-500">ID: {filteringItem.id.slice(0, 12)}...</span>
        <span className="text-xs text-gray-500">
          Created: {new Date(filteringItem.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  const renderSelectedFiltering = (filteringItem: FilteringItem) => (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
          clipRule="evenodd"
        />
      </svg>
      <span>{filteringItem.label}</span>
    </div>
  );

  const selectedFiltering = filteringEntities.find(f => f.id === selectedFilteringId) || null;

  return (
    <BaseSelector<FilteringItem>
      items={filteringEntities}
      selectedItem={selectedFiltering}
      onSelect={handleSelect}
      onClear={handleClear}
      placeholder="Select a filtering entity"
      title="Filtering Entity"
      renderItem={renderFilteringItem}
      renderSelectedItem={renderSelectedFiltering}
      isLoading={isLoading}
      disabled={disabled}
      enableSearch={true}
      searchPlaceholder="Search filtering entities..."
      className={className}
      emptyText="No filtering entities available for this cluster"
    />
  );
};

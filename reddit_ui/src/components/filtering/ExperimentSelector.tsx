'use client';

import { useState, useEffect } from 'react';
import { BaseSelector, BaseSelectorItem } from '@/components/ui/BaseSelector';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi } from '@/lib/api';

interface ExperimentItem extends BaseSelectorItem {
  id: string;
  label: string;
  name: string;
  label_template_id?: string;
  created_at?: Date;
}

interface ExperimentSelectorProps {
  scraperClusterId: string;
  selectedExperimentId: string | null;
  onExperimentSelect: (experimentId: string, labelTemplateId: string | null) => void;
  onExperimentClear: () => void;
  disabled?: boolean;
  className?: string;
  initialExperimentId?: string | null;
}

export const ExperimentSelector: React.FC<ExperimentSelectorProps> = ({
  scraperClusterId,
  selectedExperimentId,
  onExperimentSelect,
  onExperimentClear,
  disabled = false,
  className = '',
  initialExperimentId
}) => {
  const authFetch = useAuthFetch();
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch experiments when scraper cluster is available
  useEffect(() => {
    if (scraperClusterId) {
      fetchExperiments();
    }
  }, [scraperClusterId]);

  // Auto-select experiment if provided in URL
  useEffect(() => {
    if (initialExperimentId && experiments.length > 0 && !selectedExperimentId) {
      const experiment = experiments.find(exp => exp.id === initialExperimentId);
      if (experiment) {
        handleSelect(experiment);
      }
    }
  }, [initialExperimentId, experiments, selectedExperimentId]);

  const fetchExperiments = async () => {
    setIsLoading(true);
    try {
      const response = await experimentApi.getExperiments(authFetch, scraperClusterId, undefined, null);
      console.log("Fetched experiments response:", response);

      // Handle different response structures
      const experimentsList = response.experiments || response || [];
      console.log("Experiments list:", experimentsList);

      // Transform to ExperimentItem format
      const transformedExperiments: ExperimentItem[] = (Array.isArray(experimentsList) ? experimentsList : []).map(exp => ({
        ...exp,
        label: exp.name || `Exp ${exp.id.slice(0, 8)}`
      }));

      setExperiments(transformedExperiments);
    } catch (error) {
      console.error("Error fetching experiments:", error);
      setExperiments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (experiment: ExperimentItem) => {
    console.log("Selected experiment:", experiment);
    onExperimentSelect(experiment.id, experiment.label_template_id || null);
  };

  const handleClear = () => {
    onExperimentClear();
  };

  // Custom renderer to show experiment details
  const renderExperimentItem = (experiment: ExperimentItem, isSelected: boolean) => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className={`${isSelected ? 'font-semibold text-blue-600' : 'font-medium'}`}>
          {experiment.label}
        </span>
        {isSelected && (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className="text-xs text-gray-500 mt-1">ID: {experiment.id.slice(0, 12)}...</span>
    </div>
  );

  const renderSelectedExperiment = (experiment: ExperimentItem) => (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path
          fillRule="evenodd"
          d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
          clipRule="evenodd"
        />
      </svg>
      <span>{experiment.label}</span>
    </div>
  );

  const selectedExperiment = experiments.find(exp => exp.id === selectedExperimentId) || null;

  return (
    <BaseSelector<ExperimentItem>
      items={experiments}
      selectedItem={selectedExperiment}
      onSelect={handleSelect}
      onClear={handleClear}
      placeholder="Select an experiment"
      title="Experiment"
      renderItem={renderExperimentItem}
      renderSelectedItem={renderSelectedExperiment}
      isLoading={isLoading}
      disabled={disabled}
      enableSearch={true}
      searchPlaceholder="Search experiments..."
      className={className}
      emptyText="No experiments available for this cluster"
    />
  );
};

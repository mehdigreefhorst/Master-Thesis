'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/utils/fetch';
import { experimentApi } from '@/lib/api';

interface InputSelectorProps {
  inputType: "experiment" | "filtering" | "cluster";
  inputId: string;
  scraperClusterId?: string;
  onInputIdChange: (id: string) => void;
  onLabelTemplateIdChange: (id: string) => void;
  initialExperimentId?: string;
}

export const InputSelector: React.FC<InputSelectorProps> = ({
  inputType,
  inputId,
  scraperClusterId,
  onInputIdChange,
  onLabelTemplateIdChange,
  initialExperimentId
}) => {
  const authFetch = useAuthFetch();

  const [experiments, setExperiments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch experiments when scraper cluster is available
  useEffect(() => {
    if (scraperClusterId && inputType === "experiment") {
      fetchExperiments();
    }
  }, [scraperClusterId, inputType]);

  // Auto-select experiment if provided in URL
  useEffect(() => {
    if (initialExperimentId && experiments.length > 0) {
      // Only auto-select if not already selected
      if (inputId !== initialExperimentId) {
        handleExperimentSelection(initialExperimentId);
      }
    }
  }, [initialExperimentId, experiments, inputId]);

  const fetchExperiments = async () => {
    if (!scraperClusterId) return;

    setIsLoading(true);
    try {
      const response = await experimentApi.getExperiments(authFetch, scraperClusterId, undefined, null);
      console.log("Fetched experiments response:", response);

      // Handle different response structures (same pattern as experimentsSearchBarResults.tsx)
      const experimentsList = response.experiments || response || [];
      console.log("Experiments list:", experimentsList);

      setExperiments(Array.isArray(experimentsList) ? experimentsList : []);
    } catch (error) {
      console.error("Error fetching experiments:", error);
      setExperiments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExperimentSelection = (selectedId: string) => {
    onInputIdChange(selectedId);

    // Extract and set label_template_id
    const selectedExperiment = experiments.find(exp => exp.id === selectedId);
    console.log("Selected experiment:", selectedExperiment);
    if (selectedExperiment && selectedExperiment.label_template_id) {
      onLabelTemplateIdChange(selectedExperiment.label_template_id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      handleExperimentSelection(selectedId);
    }
  };

  if (!scraperClusterId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          No scraper cluster ID provided. Please navigate from the experiments page with ?scraper_cluster_id=XXX
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Experiment
      </label>
      <select
        value={inputId}
        onChange={handleInputChange}
        disabled={isLoading}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      >
        <option value="">
          {isLoading ? "Loading..." : experiments.length === 0 ? "No experiments found" : "Select an experiment"}
        </option>
        {experiments.map((exp) => (
          <option key={exp.id} value={exp.id}>
            {exp.name || `Exp ${exp.id.slice(0, 8)}`}
          </option>
        ))}
      </select>
      {experiments.length > 0 && (
        <p className="text-xs text-gray-500">
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
};
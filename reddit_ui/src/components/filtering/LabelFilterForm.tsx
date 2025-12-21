'use client';

import { useState, useEffect } from 'react';
import { useAuthFetch } from '@/utils/fetch';
import { labelTemplateApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { LabelTemplateFilter } from '@/types/filtering';
import { LabelTemplateEntity } from '@/types/label-template';

interface LabelFilterFormProps {
  labelTemplateId: string;
  labelFilterAND: Record<string, LabelTemplateFilter>;
  labelFilterOR: Record<string, LabelTemplateFilter>;
  onFilterANDChange: (filter: Record<string, LabelTemplateFilter>) => void;
  onFilterORChange: (filter: Record<string, LabelTemplateFilter>) => void;
  disabled?: boolean;
}

export const LabelFilterForm: React.FC<LabelFilterFormProps> = ({
  labelTemplateId,
  labelFilterAND,
  labelFilterOR,
  onFilterANDChange,
  onFilterORChange,
  disabled = false
}) => {
  const authFetch = useAuthFetch();
  const [labelTemplate, setLabelTemplate] = useState<LabelTemplateEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<"AND" | "OR">("AND");

  useEffect(() => {
    if (labelTemplateId) {
      fetchLabelTemplate();
    }
  }, [labelTemplateId]);

  const fetchLabelTemplate = async () => {
    setIsLoading(true);
    try {
      const template = await labelTemplateApi.getLabelTemplateById(authFetch, labelTemplateId);
      setLabelTemplate(template);
    } catch (error) {
      console.error("Error fetching label template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addLabelFilter = (labelName: string) => {
    const label = labelTemplate?.labels.find(l => l.label === labelName);
    if (!label) return;

    const newFilter: LabelTemplateFilter = {
      label_name: labelName,
      label_type: label.type as any,
      allowed_values: label.type === "boolean" ? [true] :
                     label.type === "category" ? [] : undefined,
      min_label_value: label.type === "integer" || label.type === "float" ? 0 : undefined,
      max_label_value: label.type === "integer" || label.type === "float" ? 100 : undefined
    };

    if (activeMode === "AND") {
      onFilterANDChange({
        ...labelFilterAND,
        [labelName]: newFilter
      });
    } else {
      onFilterORChange({
        ...labelFilterOR,
        [labelName]: newFilter
      });
    }
  };

  const removeLabelFilter = (labelName: string) => {
    if (activeMode === "AND") {
      const { [labelName]: _, ...rest } = labelFilterAND;
      onFilterANDChange(rest);
    } else {
      const { [labelName]: _, ...rest } = labelFilterOR;
      onFilterORChange(rest);
    }
  };

  const updateLabelFilter = (labelName: string, updates: Partial<LabelTemplateFilter>) => {
    const currentFilters = activeMode === "AND" ? labelFilterAND : labelFilterOR;
    const currentFilter = currentFilters[labelName];

    if (!currentFilter) return;

    const updatedFilter = {
      ...currentFilter,
      ...updates
    };

    if (activeMode === "AND") {
      onFilterANDChange({
        ...labelFilterAND,
        [labelName]: updatedFilter
      });
    } else {
      onFilterORChange({
        ...labelFilterOR,
        [labelName]: updatedFilter
      });
    }
  };

  const activeFilters = activeMode === "AND" ? labelFilterAND : labelFilterOR;

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Loading label template...</p>
      </Card>
    );
  }

  if (!labelTemplate) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">No label template loaded</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* AND/OR Mode Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => !disabled && setActiveMode("AND")}
          disabled={disabled}
          className={`px-4 py-2 rounded-md ${
            activeMode === "AND"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          AND Filters ({Object.keys(labelFilterAND).length})
        </button>
        <button
          onClick={() => !disabled && setActiveMode("OR")}
          disabled={disabled}
          className={`px-4 py-2 rounded-md ${
            activeMode === "OR"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          OR Filters ({Object.keys(labelFilterOR).length})
        </button>
      </div>

      {/* Add Label Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Add Label Filter</label>
        <select
          onChange={(e) => {
            if (e.target.value && !disabled) {
              addLabelFilter(e.target.value);
              e.target.value = "";
            }
          }}
          disabled={disabled}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select a label...</option>
          {labelTemplate.labels
            .filter(label => !activeFilters[label.label])
            .map(label => (
              <option key={label.label} value={label.label}>
                {label.label} ({label.type})
              </option>
            ))
          }
        </select>
      </div>

      {/* Active Filters */}
      <div className="space-y-4">
        {Object.entries(activeFilters).map(([labelName, filter]) => (
          <div key={labelName} className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{labelName}</h4>
              <button
                onClick={() => !disabled && removeLabelFilter(labelName)}
                disabled={disabled}
                className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>

            {/* Boolean / Category - Allowed Values */}
            {(filter.label_type === "boolean" || filter.label_type === "category" || filter.label_type === "string") && (
              <div>
                <label className="block text-sm mb-1">Allowed Values</label>
                <input
                  type="text"
                  placeholder="Enter comma-separated values"
                  value={filter.allowed_values?.join(", ") ?? ""}
                  onChange={(e) => {
                    if (!disabled) {
                      const values = e.target.value.split(",").map(v => v.trim()).filter(Boolean);
                      updateLabelFilter(labelName, { allowed_values: values as any });
                    }
                  }}
                  disabled={disabled}
                  className="w-full p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* Integer / Float - Min/Max */}
            {(filter.label_type === "integer" || filter.label_type === "float") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Min Value</label>
                  <input
                    type="number"
                    value={filter.min_label_value ?? ''}
                    onChange={(e) => !disabled && updateLabelFilter(labelName, {
                      min_label_value: e.target.value ? Number(e.target.value) : undefined
                    })}
                    disabled={disabled}
                    className="w-full p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Max Value</label>
                  <input
                    type="number"
                    value={filter.max_label_value ?? ''}
                    onChange={(e) => !disabled && updateLabelFilter(labelName, {
                      max_label_value: e.target.value ? Number(e.target.value) : undefined
                    })}
                    disabled={disabled}
                    className="w-full p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(activeFilters).length === 0 && (
        <p className="text-sm text-gray-600 mt-4">No label filters added yet</p>
      )}
    </Card>
  );
};

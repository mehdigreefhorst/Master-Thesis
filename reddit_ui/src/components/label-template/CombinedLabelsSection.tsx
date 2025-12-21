'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { LabelTemplateEntity, LabelDefinition } from '@/types/label-template';

interface CombinedLabelsSectionProps {
  labelTemplate: LabelTemplateEntity;
  onSave: (combinedLabels: Record<string, string[]>) => void;
  isLoading?: boolean;
}

export const CombinedLabelsSection: React.FC<CombinedLabelsSectionProps> = ({
  labelTemplate,
  onSave,
  isLoading = false
}) => {
  // State for combined labels (format: { "combined_name": ["label1", "label2"] })
  const [combinedLabels, setCombinedLabels] = useState<Record<string, string[]>>(
    labelTemplate.combined_labels || {}
  );

  // State for creating new combined label
  const [isCreating, setIsCreating] = useState(false);
  const [newCombinedName, setNewCombinedName] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  // Get only boolean type labels
  const booleanLabels = labelTemplate.labels.filter(label => label.type === 'boolean');

  // Reset form when template changes
  useEffect(() => {
    setCombinedLabels(labelTemplate.combined_labels || {});
  }, [labelTemplate.combined_labels]);

  // Handle checkbox toggle for label selection
  const handleToggleLabel = (labelName: string) => {
    setSelectedLabels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(labelName)) {
        newSet.delete(labelName);
      } else {
        newSet.add(labelName);
      }
      return newSet;
    });
  };

  // Handle creating new combined label
  const handleCreate = () => {
    if (!newCombinedName.trim() || selectedLabels.size === 0) {
      return;
    }

    const newCombined = {
      ...combinedLabels,
      [newCombinedName.trim()]: Array.from(selectedLabels)
    };

    setCombinedLabels(newCombined);
    setNewCombinedName('');
    setSelectedLabels(new Set());
    setIsCreating(false);
  };

  // Handle removing a combined label
  const handleRemove = (combinedName: string) => {
    const newCombined = { ...combinedLabels };
    delete newCombined[combinedName];
    setCombinedLabels(newCombined);
  };

  // Handle save
  const handleSave = () => {
    onSave(combinedLabels);
  };

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(combinedLabels) !== JSON.stringify(labelTemplate.combined_labels || {});

  if (booleanLabels.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Combined Labels</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No boolean labels available to combine.</p>
          <p className="text-sm mt-1">Only boolean type labels can be combined into OR groups.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Combined Labels</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create OR groups from boolean labels. Any label in the group being true means the combined label is true.
          </p>
        </div>
        {hasChanges && (
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Existing Combined Labels */}
      {Object.keys(combinedLabels).length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase">Existing Combined Labels</h3>
          {Object.entries(combinedLabels).map(([combinedName, labelNames]) => (
            <div key={combinedName} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-gray-900">{combinedName}</h4>
                </div>
                <button
                  onClick={() => handleRemove(combinedName)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-sm text-gray-600">OR Group:</span>
                {labelNames.map((labelName, idx) => (
                  <React.Fragment key={labelName}>
                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {labelName}
                    </span>
                    {idx < labelNames.length - 1 && (
                      <span className="text-sm text-gray-400 self-center">OR</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Combined Label */}
      {!isCreating ? (
        <div>
          <Button
            variant="secondary"
            onClick={() => setIsCreating(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {Object.keys(combinedLabels).length > 0 ? 'Add Another Combined Label' : 'Create New Combined Label'}
          </Button>
          {Object.keys(combinedLabels).length > 0 && (
            <p className="text-xs text-gray-500 mt-2">You can create multiple combined labels</p>
          )}
        </div>
      ) : (
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Combined Label</h3>

          {/* Combined Label Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Combined Label Name
            </label>
            <Input
              value={newCombinedName}
              onChange={(e) => setNewCombinedName(e.target.value)}
              placeholder="e.g., has_any_solution"
              className="w-full"
            />
          </div>

          {/* Select Labels */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Boolean Labels to Combine (OR Group)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Any of the selected labels being true will make the combined label true
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
              {booleanLabels.map((label) => (
                <label
                  key={label.label}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLabels.has(label.label)}
                    onChange={() => handleToggleLabel(label.label)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{label.label}</div>
                    <div className="text-xs text-gray-500">{label.explanation}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Selected Labels Preview */}
          {selectedLabels.size > 0 && (
            <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Preview:</div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-purple-700">{newCombinedName || '(name)'}</span>
                <span className="text-sm text-gray-500">=</span>
                {Array.from(selectedLabels).map((labelName, idx) => (
                  <React.Fragment key={labelName}>
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {labelName}
                    </span>
                    {idx < selectedLabels.size - 1 && (
                      <span className="text-sm font-bold text-orange-600">OR</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!newCombinedName.trim() || selectedLabels.size === 0}
            >
              Create
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreating(false);
                setNewCombinedName('');
                setSelectedLabels(new Set());
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">How Combined Labels Work:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Only <strong>boolean</strong> type labels can be combined</li>
              <li>Combined labels use <strong>OR logic</strong>: if ANY selected label is true, the combined label is true</li>
              <li><strong>You can create multiple combined labels</strong> - each groups different sets of boolean labels</li>
              <li>Useful for grouping related concepts (e.g., "has_any_solution" = solution_seeking OR solution_proposing OR solution_attempted)</li>
              <li>Don't forget to click "Save Changes" after creating or removing combined labels</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};

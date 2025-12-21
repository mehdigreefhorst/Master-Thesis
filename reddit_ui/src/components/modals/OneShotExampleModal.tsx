'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LabelTemplateEntity } from '@/types/label-template';
import { LabelTemplateLLMProjection, LabelValueField } from '@/types/cluster-unit';

interface OneShotExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (oneShotExample: Record<string, LabelTemplateLLMProjection>) => void;
  labelTemplate: LabelTemplateEntity;
  existingData: Record<string, LabelTemplateLLMProjection> | null | undefined;
}

export const OneShotExampleModal: React.FC<OneShotExampleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  labelTemplate,
  existingData,
}) => {
  const [formData, setFormData] = useState<Record<string, LabelTemplateLLMProjection>>({});

  // Initialize form data when modal opens or existing data changes
  useEffect(() => {
    if (isOpen) {
      if (existingData) {
        // Load existing data
        setFormData(existingData);
      } else {
        // Initialize with empty data structure
        const initialData: Record<string, LabelTemplateLLMProjection> = {};
        labelTemplate.labels.forEach((label) => {
          initialData[label.label] = {
            label: label.label,
            value: false,
            type: label.type,
            per_label_details: labelTemplate.llm_prediction_fields_per_label.map((field) => ({
              label: field.label,
              value: '',
              type: field.type,
            })),
          };
        });
        setFormData(initialData);
      }
    }
  }, [isOpen, existingData, labelTemplate]);

  const handleLabelValueChange = (labelKey: string, newValue: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [labelKey]: {
        ...prev[labelKey],
        value: newValue,
      },
    }));
  };

  const handlePerLabelFieldChange = (
    labelKey: string,
    fieldIndex: number,
    newValue: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [labelKey]: {
        ...prev[labelKey],
        per_label_details: prev[labelKey].per_label_details.map((field, idx) =>
          idx === fieldIndex ? { ...field, value: newValue } : field
        ),
      },
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const renderInputForType = (
    type: string,
    value: string | number | boolean,
    onChange: (value: string | number | boolean) => void
  ) => {
    switch (type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        );
      case 'integer':
        return (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="w-full"
          />
        );
      case 'float':
        return (
          <Input
            type="number"
            step="0.01"
            value={value as number}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-full"
          />
        );
      case 'string':
      default:
        return (
          <Input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
          />
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={true} blurBackground={true} maxWidth="max-w-4xl">
      <div className="max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Edit One-Shot Example
        </h2>
        <p className="text-gray-600 mb-6">
          Configure the one-shot example for label template: <strong>{labelTemplate.label_template_name}</strong>
        </p>

        <div className="space-y-6">
          {labelTemplate.labels.map((label) => (
            <div key={label.label} className="border rounded-lg p-4 bg-gray-50">
              {/* Label Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <label className="font-semibold text-gray-900 text-lg">
                    {label.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Value:</span>
                    <input
                      type="checkbox"
                      checked={formData[label.label]?.value as boolean}
                      onChange={(e) => handleLabelValueChange(label.label, e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">{label.explanation}</p>
              </div>

              {/* Per-Label Details */}
              {labelTemplate.llm_prediction_fields_per_label.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium text-gray-800 text-sm uppercase tracking-wide">
                    Per-Label Fields
                  </h4>
                  {labelTemplate.llm_prediction_fields_per_label.map((field, fieldIndex) => (
                    <div key={field.label} className="grid grid-cols-12 gap-3 items-center">
                      <label className="col-span-4 text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <div className="col-span-8">
                        {renderInputForType(
                          field.type,
                          formData[label.label]?.per_label_details[fieldIndex]?.value || '',
                          (newValue) => handlePerLabelFieldChange(label.label, fieldIndex, newValue)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save One-Shot Example
          </Button>
        </div>
      </div>
    </Modal>
  );
};

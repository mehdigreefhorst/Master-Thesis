'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { labelTemplateApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import type { LabelTemplateEntity } from '@/types/label-template';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OneShotExampleModal } from '@/components/modals/OneShotExampleModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/use-toast';
import { LabelTemplateLLMProjection } from '@/types/cluster-unit';
import { CombinedLabelsSection } from '@/components/label-template/CombinedLabelsSection';

export default function LabelTemplateViewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get('id');
  const authFetch = useAuthFetch();

  const [labelTemplate, setLabelTemplate] = useState<LabelTemplateEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // One-shot example modal state
  const [oneShotModalOpen, setOneShotModalOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [pendingOneShotData, setPendingOneShotData] = useState<Record<string, LabelTemplateLLMProjection> | null>(null);

  // Combined labels loading state
  const [isSavingCombinedLabels, setIsSavingCombinedLabels] = useState(false);

  useEffect(() => {
    if (!categoryId) {
      setLabelTemplate(null);
      return;
    }

    const fetchLabelTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await labelTemplateApi.getLabelTemplateById(authFetch, categoryId);
        setLabelTemplate(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch category info');
      } finally {
        setLoading(false);
      }
    };

    fetchLabelTemplate();
  }, [categoryId, authFetch]);

  // Handler to save one-shot example (with confirmation)
  const handleSaveOneShotExample = (oneShotData: Record<string, LabelTemplateLLMProjection>) => {
    setPendingOneShotData(oneShotData);
    setOneShotModalOpen(false);
    setConfirmationDialogOpen(true);
  };

  // Handler to confirm and submit one-shot example to API
  const handleConfirmOneShotExample = async () => {
    if (!labelTemplate || !pendingOneShotData) {
      return;
    }

    try {
      setLoading(true);
      await labelTemplateApi.UpdateOneShotExample(
        authFetch,
        labelTemplate.id,
        pendingOneShotData
      );

      // Update local state to reflect the change
      setLabelTemplate(prev => prev ? { ...prev, ground_truth_one_shot_example: pendingOneShotData } : null);

      toast({
        title: "Success",
        description: "One-shot example has been saved successfully",
      });
    } catch (error) {
      console.error('Error saving one-shot example:', error);
      toast({
        title: "Error",
        description: "Failed to save one-shot example",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setConfirmationDialogOpen(false);
      setPendingOneShotData(null);
    }
  };

  // Handler to save combined labels
  const handleSaveCombinedLabels = async (combinedLabels: Record<string, string[]>) => {
    if (!labelTemplate) {
      return;
    }

    try {
      setIsSavingCombinedLabels(true);

      // API expects Record<string, string[]> where key is the combined label name
      await labelTemplateApi.UpdateCombinedLabels(
        authFetch,
        labelTemplate.id,
        combinedLabels
      );

      // Update local state to reflect the change
      setLabelTemplate(prev => prev ? { ...prev, combined_labels: combinedLabels } : null);

      toast({
        title: "Success",
        description: "Combined labels have been saved successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Error saving combined labels:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save combined labels",
        variant: "destructive"
      });
    } finally {
      setIsSavingCombinedLabels(false);
    }
  };

  if (!categoryId) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              Select a category to view
            </h3>
            <p className="mt-2 text-gray-600">
              Choose a category from the sidebar or create a new one
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading category info...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!labelTemplate) {
    return null;
  }
  
  console.log("labelTemplate = ", labelTemplate)

  console.log("possible values = ", labelTemplate.labels[0].possible_values)

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{labelTemplate.label_template_name}</h1>
            <Button
              variant="primary"
              onClick={() => router.push(`/label-template/create?copyFrom=${categoryId}`)}
            >
              Edit / Copy
            </Button>
          </div>
          <p className="mt-2 text-gray-600">{labelTemplate.label_template_description}</p>
          <div className="mt-4 flex gap-3">
            {labelTemplate.is_public && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                Public
              </span>
            )}
            {labelTemplate.multi_label_possible && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                Multi-label
              </span>
            )}
          </div>
        </div>
        {/* One-Shot Example Section */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">One-Shot Example</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure an example that demonstrates the expected labeling format
              </p>
            </div>
            <Button
              variant={labelTemplate.ground_truth_one_shot_example ? "secondary" : "primary"}
              onClick={() => setOneShotModalOpen(true)}
              size="md"
            >
              {labelTemplate.ground_truth_one_shot_example ? "Edit Example" : "Add Example"}
            </Button>
          </div>

          {labelTemplate.ground_truth_one_shot_example ? (
            <div className="space-y-4">
              {Object.entries(labelTemplate.ground_truth_one_shot_example).map(([labelKey, labelData]) => (
                <div key={labelKey} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{labelData.label}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      labelData.value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {labelData.value ? 'True' : 'False'}
                    </span>
                  </div>

                  {labelData.per_label_details.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Per-Label Details:</h4>
                      {labelData.per_label_details.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <span className="font-medium text-gray-600">{detail.label}:</span>
                          <span className="text-gray-900">{String(detail.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No one-shot example configured yet.</p>
              <p className="text-sm mt-1">Click "Add Example" to create one.</p>
            </div>
          )}
        </Card>

        {/* One-Shot Example Modal */}
        {labelTemplate && (
          <OneShotExampleModal
            isOpen={oneShotModalOpen}
            onClose={() => setOneShotModalOpen(false)}
            onSave={handleSaveOneShotExample}
            labelTemplate={labelTemplate}
            existingData={labelTemplate.ground_truth_one_shot_example}
          />
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmationDialogOpen}
          onClose={() => {
            setConfirmationDialogOpen(false);
            setPendingOneShotData(null);
          }}
          onConfirm={handleConfirmOneShotExample}
          title={labelTemplate?.ground_truth_one_shot_example ? "Update One-Shot Example?" : "Add One-Shot Example?"}
          message={
            labelTemplate?.ground_truth_one_shot_example
              ? "This will update the one-shot example for this label template. Are you sure?"
              : "This will add a one-shot example to this label template. Are you sure?"
          }
          confirmText="Yes, Continue"
          cancelText="Cancel"
          variant="info"
        />

        {/* Labels Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Labels</h2>
          <div className="space-y-4">
            {labelTemplate.labels.map((label, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{label.label}</h3>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                    {label.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{label.explanation}</p>
                {label.possible_values.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Possible Values:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {label.possible_values.map((value, i) => (
                        <span
                          key={i}
                          className="inline-flex px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                        >
                          {JSON.stringify(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Combined Labels Section */}
        <CombinedLabelsSection
          labelTemplate={labelTemplate}
          onSave={handleSaveCombinedLabels}
          isLoading={isSavingCombinedLabels}
        />

        {/* Per-Label Fields Section */}
        {labelTemplate.llm_prediction_fields_per_label.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Per-Label Fields</h2>
            <div className="space-y-4">
              {labelTemplate.llm_prediction_fields_per_label.map((field, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{field.label}</h3>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                      {field.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{field.explanation}</p>
                  {field.possible_values.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        Possible Values:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {field.possible_values.map((value, i) => (
                          <span
                            key={i}
                            className="inline-flex px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        
      </div>
    </div>
  );
}

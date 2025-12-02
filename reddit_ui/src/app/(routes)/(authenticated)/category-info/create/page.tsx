'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { categoryInfoApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { LabelFieldCard } from '@/components/category-info/LabelFieldCard';
import type { LLMLabelField, CreateCategoryInfoRequest } from '@/types/category-info';

export default function CreateCategoryInfoPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [multiLabelPossible, setMultiLabelPossible] = useState(false);
  const [labels, setLabels] = useState<LLMLabelField[]>([]);
  const [perLabelFields, setPerLabelFields] = useState<LLMLabelField[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Track if user has started editing
  const [hasStartedEditing, setHasStartedEditing] = useState(false);

  // Track changes
  useEffect(() => {
    if (
      categoryName.trim() ||
      categoryDescription.trim() ||
      labels.length > 0 ||
      perLabelFields.length > 0
    ) {
      setHasStartedEditing(true);
    }
  }, [categoryName, categoryDescription, labels, perLabelFields]);

  // Navigation prevention
  useEffect(() => {
    if (!hasStartedEditing || success) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasStartedEditing, success]);

  // Add new label
  const addLabel = () => {
    setLabels([...labels, {
      label: '',
      explanation: '',
      possible_values: [],
      type: 'string'
    }]);
  };

  // Add new per-label field
  const addPerLabelField = () => {
    setPerLabelFields([...perLabelFields, {
      label: '',
      explanation: '',
      possible_values: [],
      type: 'string'
    }]);
  };

  // Update label
  const updateLabel = (index: number, field: keyof LLMLabelField, value: any) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], [field]: value };
    setLabels(newLabels);
  };

  // Update per-label field
  const updatePerLabelField = (index: number, field: keyof LLMLabelField, value: any) => {
    const newFields = [...perLabelFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setPerLabelFields(newFields);
  };

  // Remove label
  const removeLabel = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  // Remove per-label field
  const removePerLabelField = (index: number) => {
    setPerLabelFields(perLabelFields.filter((_, i) => i !== index));
  };

  // Handle navigation with confirmation
  const handleNavigationAttempt = (path: string) => {
    if (hasStartedEditing && !success) {
      setPendingNavigation(path);
      setShowNavigationModal(true);
    } else {
      router.push(path);
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) {
      setHasStartedEditing(false);
      router.push(pendingNavigation);
    }
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
    setShowNavigationModal(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }
    if (!categoryDescription.trim()) {
      setError('Category description is required');
      return;
    }
    if (labels.length === 0) {
      setError('At least one label is required');
      return;
    }

    // Validate all labels
    for (let i = 0; i < labels.length; i++) {
      if (!labels[i].label.trim()) {
        setError(`Label ${i + 1}: Label name is required`);
        return;
      }
      if (!labels[i].explanation.trim()) {
        setError(`Label ${i + 1}: Explanation is required`);
        return;
      }
      if (labels[i].type === 'category' && labels[i].possible_values.length === 0) {
        setError(`Label ${i + 1}: Category type requires possible values`);
        return;
      }
    }

    // Validate all per-label fields
    for (let i = 0; i < perLabelFields.length; i++) {
      if (!perLabelFields[i].label.trim()) {
        setError(`Per-Label Field ${i + 1}: Label name is required`);
        return;
      }
      if (!perLabelFields[i].explanation.trim()) {
        setError(`Per-Label Field ${i + 1}: Explanation is required`);
        return;
      }
      if (perLabelFields[i].type === 'category' && perLabelFields[i].possible_values.length === 0) {
        setError(`Per-Label Field ${i + 1}: Category type requires possible values`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const request: CreateCategoryInfoRequest = {
        category_name: categoryName,
        category_description: categoryDescription,
        is_public: isPublic,
        labels: labels,
        llm_prediction_fields_per_label: perLabelFields,
        multi_label_possible: multiLabelPossible
      };

      await categoryInfoApi.createCategoryInfo(authFetch, request);
      setSuccess('Category info created successfully!');
      setHasStartedEditing(false);

      // Redirect after 1.5 seconds
      setTimeout(() => {
        router.push('/category-info');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category info');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Category Info</h1>
            <p className="mt-2 text-gray-600">
              Define labels and classification categories for your cluster units
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => handleNavigationAttempt('/category-info')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || labels.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-[slideInDown_300ms_ease-out]">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-[slideInDown_300ms_ease-out]">
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>

          <div className="space-y-4">
            <Input
              label="Category Name *"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g., Problem Classification"
            />

            <Textarea
              label="Category Description *"
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this category is used for..."
            />

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">Public</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={multiLabelPossible}
                  onChange={(e) => setMultiLabelPossible(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">Multi-label Possible</span>
              </label>
            </div>
          </div>
        </div>

        {/* Labels Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Labels *</h2>
            <button
              type="button"
              onClick={addLabel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <span className="text-xl">+</span>
              Add Label
            </button>
          </div>

          {labels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No labels yet. Click "Add Label" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {labels.map((label, index) => (
                <LabelFieldCard
                  key={index}
                  label={label}
                  index={index}
                  onUpdate={(field, value) => updateLabel(index, field, value)}
                  onRemove={() => removeLabel(index)}
                  title={`Label ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Per-Label Fields Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Per-Label Fields</h2>
              <p className="text-sm text-gray-600 mt-1">
                Optional: Additional fields to capture for each label (e.g., reasoning, confidence)
              </p>
            </div>
            <button
              type="button"
              onClick={addPerLabelField}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <span className="text-xl">+</span>
              Add Field
            </button>
          </div>

          {perLabelFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No per-label fields yet. These are optional.
            </div>
          ) : (
            <div className="space-y-4">
              {perLabelFields.map((field, index) => (
                <LabelFieldCard
                  key={index}
                  label={field}
                  index={index}
                  onUpdate={(field, value) => updatePerLabelField(index, field, value)}
                  onRemove={() => removePerLabelField(index)}
                  title={`Per-Label Field ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Warning Modal */}
        <Modal isOpen={showNavigationModal} onClose={cancelNavigation} showCloseButton={false} blurBackground={true}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Discard Changes?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to leave? All your work will be lost.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={cancelNavigation}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmNavigation}>
                Discard Changes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

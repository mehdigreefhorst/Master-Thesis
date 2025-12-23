'use client'
import { labelTemplateApi } from '@/lib/api';
import { LabelTemplateEntity } from '@/types/label-template';
import { SampleEntity } from '@/types/sample';
import { useAuthFetch } from '@/utils/fetch';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/use-toast';

interface MultiLabelTemplateSelectorProps {
  sampleEntity: SampleEntity;
  onSampleUpdate: (updatedSample: SampleEntity) => void;
  className?: string;
}

export const MultiLabelTemplateSelector: React.FC<MultiLabelTemplateSelectorProps> = ({
  sampleEntity,
  onSampleUpdate,
  className = '',
}) => {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplateEntity[]>([]);
  const [isLoadingLabelTemplate, setIsLoadingLabelTemplate] = useState(false);
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(null);

  // Fetch label templates on mount
  useEffect(() => {
    async function fetchLabelTemplates() {
      try {
        setIsLoadingLabelTemplate(true);
        const labelTemplates = await labelTemplateApi.getAllLabelTemplates(authFetch);
        setLabelTemplates(labelTemplates);
      } catch (err) {
        console.error('Failed to fetch label templates:', err);
        toast({
          title: "Error",
          description: "Failed to fetch label templates",
          variant: "destructive"
        });
      } finally {
        setIsLoadingLabelTemplate(false);
      }
    }

    fetchLabelTemplates();
  }, [authFetch, toast]);

  // Handle label template toggle (add/remove)
  const handleLabelTemplateToggle = async (labelTemplateId: string) => {
    if (labelTemplateId === '__create_new__') {
      setIsModalOpen(true);
      return;
    }

    const isCurrentlySelected = labelTemplateId in sampleEntity.sample_label_template_labeled_status;
    const action: "add" | "remove" = isCurrentlySelected ? "remove" : "add";

    try {
      setUpdatingTemplateId(labelTemplateId);

      const updatedSample = await labelTemplateApi.AddLabelTemplateToSampleEntity(
        authFetch,
        labelTemplateId,
        sampleEntity.id,
        action
      );

      // Update parent component with new sample data
      onSampleUpdate(updatedSample);

      toast({
        title: "Success",
        description: `Label template ${action === "add" ? "added to" : "removed from"} sample`,
        variant: "default"
      });
    } catch (err) {
      console.error(`Failed to ${action} label template:`, err);
      toast({
        title: "Error",
        description: `Failed to ${action} label template`,
        variant: "destructive"
      });
    } finally {
      setUpdatingTemplateId(null);
    }
  };

  const handleCreateNew = () => {
    setIsModalOpen(false);
    router.push('/label-template/create');
  };

  const handleCancelCreate = () => {
    setIsModalOpen(false);
  };

  const isTemplateSelected = (templateId: string) => {
    return templateId in sampleEntity.sample_label_template_labeled_status
  };

  return (
    <>
      <div className={className}>
        <label className="block text-sm font-bold text-[var(--foreground)] mb-3">
          Manage Label Templates
        </label>

        {isLoadingLabelTemplate ? (
          <div className="text-sm text-[var(--muted-foreground)]">
            Loading label templates...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Label Template List */}
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto border-2 border-[var(--border)] rounded-lg p-3 bg-[var(--card)]">
              {labelTemplates.map((template) => {
                const isSelected = isTemplateSelected(template.id);
                const isUpdating = updatingTemplateId === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleLabelTemplateToggle(template.id)}
                    disabled={isUpdating}
                    className={`
                      text-left px-4 py-3 rounded-lg border-2 transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                          : 'bg-white border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                      }
                      ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-[var(--foreground)]">
                          {template.label_template_name || `Label Template ${template.id.substring(0, 8)}...`}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">
                          {template.labels.length} label{template.labels.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <div className="ml-3">
                        {isUpdating ? (
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : isSelected ? (
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Create New Button */}
              <button
                onClick={() => handleLabelTemplateToggle('__create_new__')}
                className="text-left px-4 py-3 rounded-lg border-2 border-dashed border-[var(--primary)]
                         bg-[var(--card)] hover:bg-[var(--accent)] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-semibold text-sm text-[var(--primary)]">
                    Create New Label Template
                  </span>
                </div>
              </button>
            </div>

            {/* Selected count */}
            <div className="text-xs text-(--muted-foreground) px-1">
              {Object.keys(sampleEntity.sample_label_template_labeled_status).length} label template{Object.keys(sampleEntity.sample_label_template_labeled_status).length !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Create New */}
      <Modal isOpen={isModalOpen} onClose={handleCancelCreate} blurBackground maxWidth="max-w-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Create New Label Template?
          </h2>
          <p className="text-(--muted-foreground) mb-6">
            You will be redirected to the label template creation page. Any unsaved changes on this page will be lost.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" onClick={handleCancelCreate}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateNew}>
              Yes, Create New
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

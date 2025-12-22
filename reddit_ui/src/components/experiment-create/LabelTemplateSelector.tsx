'use client'
import { labelTemplateApi } from '@/lib/api';
import { LabelTemplateEntity } from '@/types/label-template';
import { useAuthFetch } from '@/utils/fetch';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { InfoTooltip } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';

interface LabelTemplateSelectorProps {
  selectedLabelTemplateId: string;
  setSelectedLabelTemplateId: React.Dispatch<React.SetStateAction<string>>
  className?: string;
}

export const LabelTemplateSelector: React.FC<LabelTemplateSelectorProps> = ({
  selectedLabelTemplateId,
  setSelectedLabelTemplateId,
  className = '',
}) => {

  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle label Template selection from dropdown
  const handleLabelTemplateSelect = (labelTemplateId: string) => {
    if (labelTemplateId === '__create_new__') {
      // Show confirmation modal
      setIsModalOpen(true);
      return;
    }
    setSelectedLabelTemplateId(labelTemplateId);

  };

  const handleCreateNew = () => {
    setIsModalOpen(false);
    router.push('/label-template/create');
  };

  const handleCancelCreate = () => {
    setIsModalOpen(false);
    // Reset dropdown to previous selection
    setSelectedLabelTemplateId(selectedLabelTemplateId);
  };

  const authFetch = useAuthFetch();

  const [labelTemplates, setLabelTemplates] = useState<LabelTemplateEntity[]>([])
  const [isLoadingLabelTemplate, setIsLoadingLabelTemplate] = useState(false);
    // Fetch prompts on mount
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
            description: err instanceof Error ? err.message : 'Failed to fetch label templates',
            variant: "destructive"
          });
        } finally {
          setIsLoadingLabelTemplate(false);
        }
      }
  
      fetchLabelTemplates();
    }, [authFetch]);
  return (
    <>
      <div className={className}>
        <label htmlFor="labelTemplateSelector" className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] mb-2">
          Load Label Template
          <InfoTooltip text="Select a label template that defines the categories/labels used to classify the conversation data. This determines what aspects of the data will be analyzed." />
        </label>
        <select
          id="labelTemplateSelector"
          value={selectedLabelTemplateId}
          onChange={(e) => handleLabelTemplateSelect(e.target.value)}
          disabled={isLoadingLabelTemplate}
          className="w-full h-12 px-2 py-2 border-2 border-[var(--border)] rounded-lg
                   bg-[var(--card)] text-[var(--foreground)] text-sm
                   focus:outline-none focus:ring-2 focus:border-[var(--primary)] focus:shadow-[var(--shadow)]
                   cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {isLoadingLabelTemplate ? 'Loading label templates...' : 'Select label template'}
          </option>
          {labelTemplates.map((labelTemplate) => (
            <option key={labelTemplate.id} value={labelTemplate.id}>
              {labelTemplate.label_template_name || `Label Template ${labelTemplate.id.substring(0, 4)}...`}
            </option>
          ))}
          <option value="__create_new__" className="font-bold text-[var(--primary)]">
            + Create new label template
          </option>
        </select>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCancelCreate} blurBackground maxWidth="max-w-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
            Create New Label Template?
          </h2>
          <p className="text-[var(--muted-foreground)] mb-6">
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

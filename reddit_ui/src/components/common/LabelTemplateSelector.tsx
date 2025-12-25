'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuthFetch } from '@/utils/fetch';
import { labelTemplateApi } from '@/lib/api';
import { LabelTemplateEntity } from '@/types/label-template';
import { SimpleSelector, SimpleSelectorItem } from './SimpleSelector';
import { useToast } from '@/hooks/use-toast';

export interface LabelTemplateSelectorProps {
  /** Array of label template IDs to fetch and display */
  labelTemplateIds: string[];

  /** Currently selected label template ID */
  selectedLabelTemplateId?: string | null;

  /** Callback when a label template is selected */
  onSelect: (labelTemplateEntity: LabelTemplateEntity | null) => void;

  /** Auto-select first template if only one is available and none is selected */
  autoSelectFirst?: boolean;

  /** Placeholder text for the selector */
  placeholder?: string;

  /** Title for the selector */
  title?: string;

  /** Additional CSS classes */
  className?: string;

  /** Enable search functionality */
  enableSearch?: boolean;

  /** Callback when loading state changes (optional) */
  onLoadingChange?: (isLoading: boolean) => void;
}

export function LabelTemplateSelector({
  labelTemplateIds,
  selectedLabelTemplateId,
  onSelect,
  autoSelectFirst = false,
  placeholder = 'Select Label Template',
  title,
  className = '',
  enableSearch = false,
  onLoadingChange,
}: LabelTemplateSelectorProps) {
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const [labelTemplateEntities, setLabelTemplateEntities] = useState<LabelTemplateEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Use refs for callbacks to avoid re-running effect when they change
  const onSelectRef = useRef(onSelect);
  const onLoadingChangeRef = useRef(onLoadingChange);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onLoadingChangeRef.current = onLoadingChange;
  }, [onSelect, onLoadingChange]);

  // Fetch label template entities when IDs change
  useEffect(() => {
    async function fetchLabelTemplates() {
      if (labelTemplateIds.length === 0) {
        setLabelTemplateEntities([]);
        setIsLoading(false);
        onLoadingChangeRef.current?.(false);
        return;
      }

      try {
        setIsLoading(true);
        onLoadingChangeRef.current?.(true);

        // Fetch all label templates for the provided IDs
        const fetchedTemplates = await Promise.all(
          labelTemplateIds.map(id => labelTemplateApi.getLabelTemplateById(authFetch, id))
        );

        setLabelTemplateEntities(fetchedTemplates);

        // Auto-select first template if enabled and conditions are met
        if (autoSelectFirst && !selectedLabelTemplateId && fetchedTemplates.length === 1) {
          onSelectRef.current(fetchedTemplates[0]);
        }
      } catch (error) {
        console.error('Error fetching label templates:', error);
        toast({
          title: 'Error',
          description: `Failed to load label templates: ${error}`,
          variant: 'destructive',
        });
        setLabelTemplateEntities([]);
      } finally {
        setIsLoading(false);
        onLoadingChangeRef.current?.(false);
      }
    }

    fetchLabelTemplates();
  }, [labelTemplateIds, authFetch, toast, autoSelectFirst, selectedLabelTemplateId]); // Re-fetch when these critical dependencies change

  // Convert label template entities to SimpleSelectorItems
  const labelTemplateSelectorItems: SimpleSelectorItem[] = useMemo(() => {
    return labelTemplateEntities.map(template => ({
      id: template.id,
      name: template.label_template_name,
      value: template,
    }));
  }, [labelTemplateEntities]);

  // Handle selection
  const handleSelect = (item: SimpleSelectorItem) => {
    const selectedTemplate = labelTemplateEntities.find(t => t.id === item.id);
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  // Handle clear
  const handleClear = () => {
    onSelect(null);
  };

  return (
    <SimpleSelector
      items={labelTemplateSelectorItems}
      selectedItemId={selectedLabelTemplateId}
      onSelect={handleSelect}
      onClear={handleClear}
      placeholder={placeholder}
      title={title}
      className={className}
      enableSearch={enableSearch}
      disabled={isLoading || labelTemplateEntities.length === 0}
    />
  );
}

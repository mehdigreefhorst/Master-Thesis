import React from 'react';
import { Button } from '../ui/Button';

interface ActionBarProps {
  onParse: () => void;
  onSave: () => void;
  onCreateExperiment: () => void;
  isParsing?: boolean;
  isSaving?: boolean;
  canParse?: boolean;
  canSave?: boolean;
  canCreate?: boolean;
  className?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onParse,
  onSave,
  onCreateExperiment,
  isParsing = false,
  isSaving = false,
  canParse = true,
  canSave = true,
  canCreate = true,
  className = '',
}) => {
  return (
    <div className={`flex gap-3 ${className}`}>
      <Button
        className="w-40"
        variant="primary"
        onClick={onParse}
        disabled={isParsing || !canParse}
      >
        {isParsing ? 'Parsing...' : 'Parse Prompt'}
      </Button>

      <Button
        variant="primary"
        onClick={onSave}
        disabled={isSaving || !canSave}
      >
        {isSaving ? 'Saving...' : 'Save Prompt'}
      </Button>

      <Button
        variant="secondary"
        onClick={onCreateExperiment}
        disabled={!canCreate || isParsing || isSaving}
      >
        Create Experiment
      </Button>
    </div>
  );
};

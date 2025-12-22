import { useState, useEffect } from 'react';
import { Modal, Button, InfoTooltip } from '@/components/ui';

interface PromptSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, systemPrompt: string, prompt: string, category: 'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes') => Promise<void>;
  initialSystemPrompt?: string;
  initialPrompt?: string;
  initialCategory?: 'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes';
  isSaving?: boolean;
}

// Helper function to get default prompt name (format: 21-nov 15:50)
const getDefaultPromptName = () => {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}-${month} ${hours}:${minutes}`;
};

export const PromptSaveModal: React.FC<PromptSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSystemPrompt = '',
  initialPrompt = '',
  initialCategory = 'classify_cluster_units',
  isSaving = false,
}) => {
  const [promptName, setPromptName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [category, setCategory] = useState<'classify_cluster_units' | 'rewrite_cluster_unit_standalone' | 'summarize_prediction_notes'>(initialCategory);

  // Update local state when props change
  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(initialSystemPrompt);
      setPrompt(initialPrompt);
      setCategory(initialCategory);
      setPromptName(getDefaultPromptName());
    }
  }, [isOpen, initialSystemPrompt, initialPrompt, initialCategory]);

  const handleSave = async () => {
    if (!promptName.trim()) {
      return;
    }
    await onSave(promptName, systemPrompt, prompt, category);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      blurBackground={true}
      maxWidth="max-w-6xl"
    >
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Save Prompt</h2>

          {/* Prompt Name Input */}
          <div className="mb-4">
            <label htmlFor="promptName" className="block text-sm font-bold text-gray-900 mb-2">
              Prompt Name
            </label>
            <input
              id="promptName"
              type="text"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-all"
              placeholder="Enter prompt name"
            />
          </div>

          {/* Prompt Category Selector */}
          <div>
            <label htmlFor="promptCategory" className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
              Prompt Category
              <InfoTooltip text="Select the category that best describes what this prompt does. This helps organize and classify prompts for different tasks." />
            </label>
            <select
              id="promptCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full h-12 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 cursor-pointer transition-all"
            >
              <option value="classify_cluster_units">Classify Cluster Units</option>
              <option value="rewrite_cluster_unit_standalone">Rewrite Cluster Unit Standalone</option>
              <option value="summarize_prediction_notes">Summarize Prediction Notes</option>
            </select>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="space-y-6">
          {/* System Prompt */}
          <div>
            <label htmlFor="modalSystemPrompt" className="block text-sm font-bold text-gray-900 mb-2">
              System Prompt
            </label>
            <textarea
              id="modalSystemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-32 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-all font-mono text-sm resize-none"
              placeholder="Enter system prompt"
            />
          </div>

          {/* Main Prompt */}
          <div>
            <label htmlFor="modalPrompt" className="block text-sm font-bold text-gray-900 mb-2">
              Prompt
            </label>
            <textarea
              id="modalPrompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-96 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-all font-mono text-sm resize-none"
              placeholder="Enter your prompt"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="secondary"
            size="lg"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            size="lg"
            disabled={isSaving || !promptName.trim()}
          >
            {isSaving ? 'Saving...' : 'Save Prompt'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

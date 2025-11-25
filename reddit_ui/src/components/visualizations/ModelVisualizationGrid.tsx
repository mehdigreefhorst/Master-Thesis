// components/ModelVisualizationGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import { modelsApi, userApi, visualizationApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import ModelVisualization from './ModelVisualization';
import { X } from 'lucide-react';
import { Button } from '../ui';
import { useToast } from '../ui/use-toast';

interface ModelSelectData {
  modelId: string;
  modelName: string;
  provider: string;
}

interface ModelVisualizationGridProps {
  className?: string;
}

const ModelVisualizationGrid: React.FC<ModelVisualizationGridProps> = ({ className = "" }) => {
  const authFetch = useAuthFetch();
  const { toast } = useToast()
  const [htmlContents, setHtmlContents] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelSelectData | null>(null);

  // Fetch all visualizations
  useEffect(() => {
    const loadVisualizations = async () => {
      try {
        setLoading(true);
        setError(null);
        const htmlList = await visualizationApi.getVisualization(authFetch);
        setHtmlContents(htmlList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load visualizations');
      } finally {
        setLoading(false);
      }
    };

    loadVisualizations();
  }, []);

  const handleModelSelect = (model: ModelSelectData) => {
    setSelectedModel(model);
  };

  const handleExpand = (index: number) => {
    setExpandedIndex(index);
  };

  const handleClose = () => {
    setExpandedIndex(null);
  };

  const handleAddToFavorite = async () => {
    if (selectedModel){
      const response = await modelsApi.addFavoriteModel(authFetch, selectedModel.modelId )
      if (response.inserted === 0){
        toast({
          title: "Already added the model ID to favorites",
          description: "Model Id already inserted",
          variant: "info"
        })
      } else {
        toast({
          title: "success",
          description: "Model ID has been added to favorites",
          variant: "success"
        })
      }
      
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-lg text-gray-600">Loading visualizations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-red-500">
          <p className="font-semibold">Error loading visualizations</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Expanded view
  if (expandedIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-opacity-90 flex flex-col">
        {/* Header with close button and selected model info */}
        <div className="flex items-center justify-between p-2 bg-gray-900 text-white">
          <div className="flex-1">
            {selectedModel && (
              <div className="text-sm">
                <span className="font-semibold">Selected Model:</span>{' '}
                <span className="text-blue-400">{selectedModel.modelName}</span>
                {' '}
                <span className="text-gray-400">({selectedModel.provider})</span>
                {' '}
                <span className="text-xs text-gray-500">{selectedModel.modelId}</span>
                <Button className='ml-2' onClick={handleAddToFavorite}>
                  Add to favorites
                </Button>
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close expanded view"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Expanded visualization */}
        <div className="flex-1 overflow-auto p-4">
          <ModelVisualization
            htmlContent={htmlContents[expandedIndex]}
            heightPixels={1300}
            onModelSelect={handleModelSelect}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className={`w-full ${className}`}>
      {/* Selected model info bar */}
      {selectedModel && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm">
            <span className="font-semibold text-blue-900">Selected Model:</span>{' '}
            <span className="text-blue-700">{selectedModel.modelName}</span>
            {' '}
            <span className="text-gray-600">({selectedModel.provider})</span>
            {' '}
            <span className="text-xs text-gray-500">{selectedModel.modelId}</span>
          </div>
        </div>
      )}

      {/* Grid of visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {htmlContents.map((html, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white"
            onClick={() => handleExpand(index)}
          >
            <ModelVisualization
              htmlContent={html}
              onModelSelect={handleModelSelect}
              className="pointer-events-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelVisualizationGrid;

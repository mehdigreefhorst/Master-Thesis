'use client'
// pages/Dashboard.tsx
import { useState } from 'react';
import ModelVisualization from '@/components/visualizations/ModelVisualization';

interface SelectedModel {
  modelId: string;
  modelName: string;
  provider: string;
}

const ModelsDashboard: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);

  const handleModelSelect = (model: SelectedModel) => {
    console.log('Single model selected:', model);
    setSelectedModel(model);
    
    // You can fetch additional details using the modelId
    // fetchModelDetails(model.modelId);
  };

  const handleMultipleModelsSelect = (models: SelectedModel[]) => {
    console.log('Multiple models selected:', models);
    setSelectedModels(models);
    
    // Perform bulk operations or comparisons
  };

  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-4">Model Performance Dashboard</h1>
      
      <ModelVisualization 
        onModelSelect={handleModelSelect}
        onMultipleModelsSelect={handleMultipleModelsSelect}
        height="900px"
        className="mb-6"
      />
      
      {selectedModel && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Selected Model</h2>
          <div className="space-y-1">
            <p><span className="font-medium">ID:</span> {selectedModel.modelId}</p>
            <p><span className="font-medium">Name:</span> {selectedModel.modelName}</p>
            <p><span className="font-medium">Provider:</span> {selectedModel.provider}</p>
          </div>
        </div>
      )}
      
      {selectedModels.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">
            Selected Models ({selectedModels.length})
          </h2>
          <ul className="space-y-1">
            {selectedModels.map((model) => (
              <li key={model.modelId}>
                {model.modelName} ({model.provider})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ModelsDashboard;
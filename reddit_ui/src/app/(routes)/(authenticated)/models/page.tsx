'use client'
// pages/Dashboard.tsx
import ModelVisualizationGrid from '@/components/visualizations/ModelVisualizationGrid';

const ModelsDashboard: React.FC = () => {
  return (
    <div className="dashboard-container p-6">
      <h1 className="text-2xl font-bold mb-6">Model Performance Dashboard</h1>

      <ModelVisualizationGrid className="w-full" />
    </div>
  );
};

export default ModelsDashboard;
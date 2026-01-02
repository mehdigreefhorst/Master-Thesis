'use client';

import React, { useState } from 'react';
import { LabelRow } from './LabelRow';
import { ExperimentAllPredictedData, ExperimentModelInformation, LabelResult } from '@/types/cluster-unit';

export interface ModelColumn {
  name: string;
  modelId: string;
  version: string;
}

export interface LabelData {
  labelName: string;
  groundTruth: boolean | null;
  results: (LabelResult | null)[];
}


interface LabelTableProps {
  allExperimentsModelInformation: ExperimentModelInformation[]
  clusterUnitEntityExperimentData: ExperimentAllPredictedData
  labelTemplateId: string;
  handleClusterUnitGroundTruthUpdate: (category: string, newValue: boolean | string | number) => void;
  labelsPossibleValues?: Record<string, string[] | boolean[]> | null

  className?: string;
}

export const LabelTable: React.FC<LabelTableProps> = ({
  allExperimentsModelInformation,
  clusterUnitEntityExperimentData,
  labelTemplateId,
  handleClusterUnitGroundTruthUpdate,
  labelsPossibleValues,
  className = ''
}) => {
  const [isScrollMode, setIsScrollMode] = useState(false);

  console.log(clusterUnitEntityExperimentData)

  return (
    <div className={`${className}`}>
      {/* Toggle Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsScrollMode(!isScrollMode)}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors
                     bg-blue-500 hover:bg-blue-600 text-white
                     border border-blue-600"
        >
          {isScrollMode ? '📊 Normal View' : '↔️ Scroll View'}
        </button>
      </div>

      {/* Table Container */}
      <div className={`${isScrollMode ? 'overflow-x-auto' : 'overflow-visible'} rounded-lg border border-gray-200`}>
        <table className={`w-full border-separate border-spacing-0 bg-white ${isScrollMode ? 'table-auto' : 'table-fixed'}`}
               style={isScrollMode ? { minWidth: '100%' } : {}}>
          <thead>
            <tr>
              <th className="bg-gray-100 p-3 text-left font-semibold text-sm text-gray-700 border-b-2 border-gray-300 sticky left-0 z-10"
                  style={isScrollMode ? { minWidth: '200px', width: '200px' } : { width: '15%' }}>
                Category
              </th>
              <th className="bg-gray-100 p-3 text-center font-semibold text-sm text-gray-700 border-b-2 border-gray-300"
                  style={isScrollMode ? { minWidth: '100px', width: '100px' } : { width: '10%' }}>
                Truth
              </th>
              {allExperimentsModelInformation.map((model, index) => {
                // Check if errors exist for this experiment
                const experimentErrors = clusterUnitEntityExperimentData?.errors?.[model.experiment_id];
                const hasErrors = experimentErrors && experimentErrors.errors.length > 0;

                return (
                  <th
                    key={index}
                    className="bg-gray-100 p-3 text-center font-semibold text-sm text-gray-700 border-b-2 border-gray-300"
                    style={isScrollMode ? { minWidth: '300px', width: '25%' } : {}}
                  >
                    <div className="font-bold">
                      <div className="truncate" title={`${model.prompt_name} ${model.model_id} ${model.version}`}>
                        {model.prompt_name}
                      </div>
                      <div className="text-xs font-normal text-gray-600 truncate" title={`${model.model_id} ${model.version}`}>
                        {model.model_id} {model.version}
                      </div>

                      {/* Error Toggle */}
                      {hasErrors && (
                        <details className="mt-2 text-left">
                          <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800 list-none flex items-center gap-1 justify-center">
                            <span>▶</span>
                            Errors ({experimentErrors.errors.length})
                          </summary>
                          <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto">
                            {experimentErrors.errors.map((error: string, errorIdx: number) => (
                              <div key={errorIdx} className="text-xs text-red-700 mb-1 pb-1 border-b border-red-200 last:border-b-0">
                                {error}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {clusterUnitEntityExperimentData && (clusterUnitEntityExperimentData.label_name_predicted_data.map((label, index) => (
              <LabelRow
                key={index}
                labelName={label.label_name}
                labelTemplateId={labelTemplateId}
                groundTruth={label.ground_truth}
                groundTruthValues={labelsPossibleValues ? labelsPossibleValues[label.label_name] : null}
                results={label.results}
                handleClusterUnitGroundTruthUpdate={handleClusterUnitGroundTruthUpdate}
                clusterUnitEntityId={clusterUnitEntityExperimentData.cluster_unit_enity.id}
                isScrollMode={isScrollMode}
              />
            )))}
            
          </tbody>
        </table>
      </div>
    </div>
  );
};

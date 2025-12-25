'use client';

import React from 'react';
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
  handleClusterUnitGroundTruthUpdate: (category: string, newValue: boolean) => void;
  className?: string;
}

export const LabelTable: React.FC<LabelTableProps> = ({
  allExperimentsModelInformation,
  clusterUnitEntityExperimentData,
  labelTemplateId,
  handleClusterUnitGroundTruthUpdate,
  className = ''
}) => {
  // console.log("models = ")
  // console.log(JSON.stringify(models))
  // console.log("labels = ")
  // console.log(JSON.stringify(labels))
  // console.log("stats = ")
  // console.log(JSON.stringify(stats))
  // console.log("cluster_unit_id = ")
  // console.log(cluster_unit_id)
  return (
    <div className={`${className}`}>
      <table className="w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg shadow-(--shadow-sm)">
        <thead>
          <tr>
            <th className="bg-(--secondary) p-3 text-left font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border) w-1/4">
              Category
            </th>
            <th className="bg-(--secondary) p-3 text-center font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border) w-[10%]">
              Truth
            </th>
            {allExperimentsModelInformation.map((model, index) => (
              <th
                key={index}
                className="bg-(--secondary) text-center font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border)"
              >
                <div className="font-bold">
                  <span>{model.prompt_name}</span> <span className="text-xs font-normal text-gray-600">{model.model_id} {model.version}</span>
                </div>

              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clusterUnitEntityExperimentData && (clusterUnitEntityExperimentData.label_name_predicted_data.map((label, index) => (
            <LabelRow
              key={index}
              labelName={label.label_name}
              labelTemplateId={labelTemplateId}
              groundTruth={label.ground_truth}
              results={label.results}
              handleClusterUnitGroundTruthUpdate={handleClusterUnitGroundTruthUpdate}
            />
          )))}
        </tbody>
      </table>
    </div>
  );
};

'use client';

import React from 'react';
import { LabelRow } from './LabelRow';
import { ExperimentAllPredictedData, ExperimentModelInformation, LabelResult } from '@/types/cluster-unit';
import { LabelRowTextLabels } from './LabelRowTextLabels';

export interface ModelColumn {
  name: string;
  modelId: string;
  version: string;
}

export interface LabelDataText {
  labelName: string;
  results: (LabelResult | null)[];
}


interface LabelTableProps {
  allExperimentsModelInformation: ExperimentModelInformation[]
  clusterUnitEntityExperimentData: ExperimentAllPredictedData
  labelTemplateId: string;

  className?: string;
}

export const LabelTableTextLabels: React.FC<LabelTableProps> = ({
  allExperimentsModelInformation,
  clusterUnitEntityExperimentData,
  labelTemplateId,
  className = ''
}) => {


  return (
    <div className={`${className}`}>
      <table className="w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg shadow-(--shadow-sm)">
        <thead>
          <tr>
            <th className="bg-(--secondary) p-3 text-left font-semibold text-sm text-(--secondary-foreground) border-b-2 border-(--border) w-1/10">
              Category
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
            
            <LabelRowTextLabels
              key={index}
              labelName={label.label_name}
              labelTemplateId={labelTemplateId}
              results={label.results}
              clusterUnitEntityId={clusterUnitEntityExperimentData.cluster_unit_enity.id}
            />
          )))}
        </tbody>
      </table>
    </div>
  );
};

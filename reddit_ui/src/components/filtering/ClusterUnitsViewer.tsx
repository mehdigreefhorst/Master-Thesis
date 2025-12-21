'use client';

import { Card } from '@/components/ui/Card';
import { ClusterUnitEntity } from '@/types/cluster-unit';
import { Button } from '@/components/ui';

interface ClusterUnitsViewerProps {
  clusterUnits: ClusterUnitEntity[];
  onClose: () => void;
  experimentId?: string; // Only show predictions for this experiment
}

export const ClusterUnitsViewer: React.FC<ClusterUnitsViewerProps> = ({
  clusterUnits,
  onClose,
  experimentId
}) => {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Filtered Cluster Units</h3>
        <Button onClick={onClose} variant="secondary" size="sm">
          Close
        </Button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          Showing {clusterUnits.length} cluster unit{clusterUnits.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Cluster Units List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {clusterUnits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No cluster units match the filters</p>
          </div>
        ) : (
          clusterUnits.map((unit, index) => (
            <div
              key={unit.id || index}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded">
                      {unit.type}
                    </span>
                    <span className="text-xs text-gray-600">
                      u/{unit.author}
                    </span>
                    {unit.subreddit && (
                      <span className="text-xs text-gray-600">
                        r/{unit.subreddit}
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://reddit.com${unit.permalink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on Reddit →
                  </a>
                </div>

                <div className="text-right text-sm">
                  <div className="text-gray-600">
                    ↑ {unit.upvotes} ↓ {unit.downvotes}
                  </div>
                  {unit.total_nested_replies !== undefined && (
                    <div className="text-xs text-gray-500">
                      {unit.total_nested_replies} replies
                    </div>
                  )}
                </div>
              </div>

              {/* Text Content */}
              <div className="mb-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">
                  {unit.text}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>
                  Posted: {new Date(unit.created_utc * 1000).toLocaleDateString()}
                </span>
                {unit.thread_path_text && (
                  <span>
                    Thread depth: {unit.thread_path_text.length}
                  </span>
                )}
              </div>

              {/* Ground Truth Labels (if available) */}
              {unit.ground_truth && Object.keys(unit.ground_truth).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Ground Truth:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(unit.ground_truth).map(([templateId, truth]) => (
                      <div key={templateId} className="text-xs">
                        {Object.entries(truth.values || {})
                          .filter(([_, labelData]) => labelData.value === true)
                          .map(([labelName]) => (
                            <span
                              key={labelName}
                              className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded mr-1"
                            >
                              {labelName}
                            </span>
                          ))
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predicted Categories (if available) - Only for selected experiment */}
              {unit.predicted_category && experimentId && unit.predicted_category[experimentId] && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-small text-gray-700 mb-2">Predictions:</div>
                  <div className="space-y-2">
                    {unit.predicted_category[experimentId].predicted_categories?.map((prediction, runIndex) => (
                      <div key={runIndex} className="flex flex-wrap gap-1 mb-1">
                        <span className="text-gray-500 text-xs mt-1 mr-1">Run {runIndex + 1}:</span>
                        {prediction.labels_prediction?.values && Object.entries(prediction.labels_prediction.values)
                          .filter(([_, labelData]: [string, any]) => labelData.value === true)
                          .map(([labelName]: [string, any]) => (
                            <span
                              key={labelName}
                              className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                            >
                              {labelName}
                            </span>
                          ))
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

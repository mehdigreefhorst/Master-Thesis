import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { experimentApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { useToast } from '@/components/ui/use-toast';
import { testPredictionsOutput } from '@/types/prompt';

interface TestPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  experimentId: string;
  autoRun?: boolean;
  onProceed?: () => void;
}

export const TestPredictionModal: React.FC<TestPredictionModalProps> = ({
  isOpen,
  onClose,
  experimentId,
  autoRun = false,
  onProceed
}) => {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<testPredictionsOutput | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [nrToPredict, setNrToPredict] = useState<number>(1);

  const handleRunTest = async () => {
    if (!experimentId) return;

    setIsTestRunning(true);
    setTestResult(null);

    try {
      const result = await experimentApi.testPrediction(
        authFetch,
        experimentId,
        undefined,
        nrToPredict
      );
      setTestResult(result);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Test failed',
        variant: "destructive"
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  // Auto-run test when modal opens
  useEffect(() => {
    if (isOpen && experimentId && autoRun && !testResult && !isTestRunning) {
      handleRunTest();
    }
  }, [isOpen]);

  // Reset test result when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTestResult(null);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      maxWidth="max-w-7xl"
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Test Prediction</h2>

        {/* Number of Units Selector - Always visible */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label htmlFor="nrToPredict" className="block text-sm font-bold text-gray-900 mb-2">
            Number of units to predict
          </label>
          <input
            id="nrToPredict"
            type="number"
            min="1"
            value={nrToPredict}
            onChange={(e) => setNrToPredict(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-32 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500"
            disabled={isTestRunning}
          />
        </div>

        {/* Run Test Button - Always visible when not running */}
        {!isTestRunning && (
          <div className="flex gap-4">
            <Button onClick={handleRunTest} variant="primary" size="lg">
              {testResult ? 'Rerun Test Sample' : 'Run Test Sample'}
            </Button>
            {onProceed && (
              <Button onClick={onProceed} variant="secondary" size="lg">
                Continue to Full Experiments
              </Button>
            )}
          </div>
        )}

        {isTestRunning && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Running test prediction...</p>
          </div>
        )}
        {testResult && testResult.predictions && testResult.predictions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900">
                Test Results ({testResult.predictions.length} {testResult.predictions.length === 1 ? 'prediction' : 'predictions'})
              </h3>
            </div>

            {/* Horizontally Scrollable Predictions Container */}
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {testResult.predictions.map((prediction, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-[600px] border-2 rounded-lg p-6 space-y-4"
                    style={{
                      borderColor: prediction.success ? '#10b981' : '#ef4444',
                      backgroundColor: prediction.success ? '#f0fdf4' : '#fef2f2'
                    }}
                  >
                    {/* Prediction Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-300">
                      <h4 className="font-bold text-gray-900">Prediction #{index + 1}</h4>
                      <div className="flex items-center gap-2">
                        {prediction.success ? (
                          <>
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-semibold text-green-900">Success</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm font-semibold text-red-900">Failed</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Error Message */}
                    {prediction.error && (
                      <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-sm text-red-900 font-medium">Error:</p>
                        <p className="text-xs text-red-800 mt-1">{prediction.error}</p>
                      </div>
                    )}

                    {/* System Prompt */}
                    {prediction.system_prompt && (
                      <div>
                        <h5 className="font-semibold text-xs text-gray-700 mb-1">System Prompt</h5>
                        <pre className="bg-white p-3 rounded-lg text-xs overflow-x-auto border border-gray-300 max-h-32">
                          {prediction.system_prompt}
                        </pre>
                      </div>
                    )}

                    {/* Input Prompt */}
                    {prediction.input_prompt && (
                      <div>
                        <h5 className="font-semibold text-xs text-gray-700 mb-1">Input Prompt</h5>
                        <pre className="bg-white p-3 rounded-lg text-xs overflow-x-auto border border-gray-300 max-h-32">
                          {prediction.input_prompt}
                        </pre>
                      </div>
                    )}

                    {/* Model Output */}
                    {prediction.model_output_message && (
                      <div>
                        <h5 className="font-semibold text-xs text-gray-700 mb-1">Model Output</h5>
                        <pre className="bg-white p-3 rounded-lg text-xs overflow-x-auto border border-gray-300 max-h-32">
                          {prediction.model_output_message}
                        </pre>
                      </div>
                    )}

                    {/* Parsed Categories */}
                    <div>
                      <h5 className="font-semibold text-xs text-gray-700 mb-2">Parsed Categories</h5>
                      {prediction.parsed_categories && prediction.parsed_categories.labels_prediction?.values ? (
                        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                          <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Category</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-300 w-20">Value</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(prediction.parsed_categories.labels_prediction.values).map(([categoryKey, categoryData]: [string, any]) => {
                                  const reason = categoryData.per_label_details?.find((detail: any) => detail.label === 'reason')?.value || 'N/A';
                                  return (
                                    <tr key={categoryKey} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-3 py-3 text-gray-900 font-medium">{categoryData.label || categoryKey}</td>
                                      <td className="px-3 py-3 text-center">
                                        {categoryData.value ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                            ✓ True
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                            ✗ False
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-gray-700 text-xs leading-relaxed">{reason}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                          <p className="text-sm text-red-900 font-medium">Failed to parse categories</p>
                        </div>
                      )}
                    </div>

                    {/* Tokens Used */}
                    {prediction.tokens_used && Object.keys(prediction.tokens_used).length > 0 && (
                      <div>
                        <h5 className="font-semibold text-xs text-gray-700 mb-1">Tokens Used</h5>
                        <div className="bg-white p-3 rounded-lg border border-gray-300">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(prediction.tokens_used).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-mono font-semibold">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

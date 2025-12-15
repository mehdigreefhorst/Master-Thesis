import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { experimentApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { useToast } from '@/components/ui/use-toast';

interface TestPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  experimentId: string;
  autoRun?: boolean;
}

export const TestPredictionModal: React.FC<TestPredictionModalProps> = ({
  isOpen,
  onClose,
  experimentId,
  autoRun = true
}) => {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const handleRunTest = async () => {
    if (!experimentId) return;

    setIsTestRunning(true);
    setTestResult(null);

    try {
      const result = await experimentApi.testPrediction(
        authFetch,
        experimentId,
        undefined,
        1
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
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Test Prediction</h2>

        {!testResult && !isTestRunning && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Run a test to validate your experiment configuration</p>
            <Button onClick={handleRunTest} variant="primary" size="lg">
              Run Test Sample
            </Button>
          </div>
        )}

        {isTestRunning && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Running test prediction...</p>
          </div>
        )}

        {testResult && (
          <div className="space-y-4">
            {/* System Prompt */}
            {testResult.system_prompt && (
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">System Message</h3>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200">
                  {testResult.system_prompt}
                </pre>
              </div>
            )}

            {/* Parsed Prompt */}
            {testResult.parsed_prompt && (
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">User Prompt</h3>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200">
                  {testResult.parsed_prompt}
                </pre>
              </div>
            )}

            {/* LLM Output */}
            {testResult.output_llm && (
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">LLM Response</h3>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200">
                  {testResult.output_llm}
                </pre>
              </div>
            )}

            {/* Parse Status */}
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold text-green-900">Output is parsable</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="font-semibold text-red-900">Parsing failed</span>
                  </>
                )}
              </div>
              {testResult.error && (
                <p className="text-sm text-red-700 mt-2">{testResult.error}</p>
              )}
            </div>

            {/* Predicted Categories */}
            {testResult.predicted_categories && (
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Predicted Categories</h3>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200">
                  {JSON.stringify(testResult.predicted_categories, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleRunTest}
                variant="secondary"
                size="lg"
                disabled={isTestRunning}
              >
                Run Again
              </Button>
              <Button
                onClick={onClose}
                variant="primary"
                size="lg"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

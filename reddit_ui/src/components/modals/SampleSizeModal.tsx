import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';

interface SampleSizeModalProps {
  isOpen: boolean;
  selectedPostsCount: number;
  maxSampleSize: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (sampleSize: number, smartSampling: boolean) => void;
}

export const SampleSizeModal: React.FC<SampleSizeModalProps> = ({
  isOpen,
  selectedPostsCount,
  maxSampleSize,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const { toast } = useToast();
  const [sampleSize, setSampleSize] = useState<string>('');
  const [smartSampling, setSmartSampling] = useState<boolean | null>(null);

  const handleSubmit = () => {
    const sampleSizeNum = parseInt(sampleSize);
    if (isNaN(sampleSizeNum) || sampleSizeNum <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid sample size",
        variant: "destructive"
      });
      return;
    }

    if (sampleSizeNum > maxSampleSize) {
      toast({
        title: "Sample Size Too Large",
        description: `Sample size cannot be larger than the total number of comments (${maxSampleSize})`,
        variant: "destructive"
      });
      return;
    }

    if (smartSampling === null) {
      toast({
        title: "Selection Required",
        description: "Please choose whether to enable smart sampling",
        variant: "destructive"
      });
      return;
    }

    onSubmit(sampleSizeNum, smartSampling);
  };

  const handleClose = () => {
    setSampleSize('');
    setSmartSampling(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} showCloseButton={false} blurBackground={true}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Configure Sample Size
        </h2>
        <p className="text-gray-600 mb-6">
          You have selected <span className="font-semibold text-gray-900">{selectedPostsCount}</span> {selectedPostsCount === 1 ? 'post' : 'posts'} with a total of <span className="font-semibold text-gray-900">{maxSampleSize}</span> {maxSampleSize === 1 ? 'comment' : 'comments'}.
          Enter the sample size for your experiment.
        </p>

        <div className="mb-6">
          <label htmlFor="sampleSize" className="block text-sm font-medium text-gray-700 mb-2">
            Sample Size (Number of Comments)
          </label>
          <input
            id="sampleSize"
            type="number"
            min="1"
            max={maxSampleSize}
            value={sampleSize}
            onChange={(e) => setSampleSize(e.target.value)}
            placeholder={`Enter a number (max: ${maxSampleSize})`}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={isSubmitting}
          />
          <p className="mt-2 text-sm text-gray-500">
            The sample will be randomly selected from comments in your chosen posts.
          </p>
        </div>

        {/* Smart Sampling Section */}
        <div className="mb-6 p-6 bg-gray-50 rounded-xl border-2 border-gray-200 text-left">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Smart Sampling
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Enable smart sampling to ensure complete thread context. With smart sampling, samples will be randomly selected,
            but <strong>entire parent threads up to the sampled message are always included</strong>. This prevents isolated
            child comments without context and may slightly increase the sample size beyond your specified limit.
          </p>

          <div className="bg-white p-4 rounded-lg mb-4 border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Example Difference
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold text-red-600 mb-2">❌ Without Smart Sampling</div>
                <div className="space-y-1">
                  <div className="text-gray-400 line-through">Post: "Need help"</div>
                  <div className="text-gray-400 line-through ml-4">└─ Comment: "Try this"</div>
                  <div className="text-gray-700 ml-8">└─ Reply: "Thanks!" ⭐ Selected</div>
                </div>
                <div className="text-gray-500 mt-2 italic">Missing context!</div>
              </div>
              <div>
                <div className="font-semibold text-green-600 mb-2">✓ With Smart Sampling</div>
                <div className="space-y-1">
                  <div className="text-gray-700">Post: "Need help" 📝</div>
                  <div className="text-gray-700 ml-4">└─ Comment: "Try this" 📝</div>
                  <div className="text-gray-700 ml-8">└─ Reply: "Thanks!" ⭐</div>
                </div>
                <div className="text-gray-500 mt-2 italic">Full context included!</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSmartSampling(true)}
              disabled={isSubmitting}
              className={`
                flex-1 p-3 rounded-lg border-2 transition-all duration-200 text-left
                ${smartSampling === true
                  ? 'bg-green-50 border-green-500 border-[3px] shadow-md'
                  : 'bg-white border-gray-300 hover:border-green-400 hover:shadow-md'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${smartSampling === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}
                `}>
                  {smartSampling === true && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Yes, Enable</div>
                  <div className="text-xs text-gray-600">Include full thread context</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSmartSampling(false)}
              disabled={isSubmitting}
              className={`
                flex-1 p-3 rounded-lg border-2 transition-all duration-200 text-left
                ${smartSampling === false
                  ? 'bg-red-50 border-red-500 border-[3px] shadow-md'
                  : 'bg-white border-gray-300 hover:border-red-400 hover:shadow-md'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${smartSampling === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}
                `}>
                  {smartSampling === false && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">No, Standard</div>
                  <div className="text-xs text-gray-600">Sample individually</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !sampleSize || smartSampling === null}
            className="flex-1"
          >
            {isSubmitting ? 'Creating Sample...' : 'Create Sample'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

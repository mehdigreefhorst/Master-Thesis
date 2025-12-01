import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { MediaStrategySkipType } from '@/types/cluster-prep';

interface MediaStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy: (strategy: MediaStrategySkipType) => void;
}

interface StrategyOption {
  type: MediaStrategySkipType;
  title: string;
  percentage: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
}

const strategyOptions: StrategyOption[] = [
  {
    type: 'ignore',
    title: 'Include All Content',
    percentage: '100%',
    description: 'No filtering - analyze all posts and comments, including those with media',
  },
  {
    type: 'skip_units',
    title: 'Skip Media Units Only',
    percentage: '~90%',
    description: 'Skip only comments/posts that contain media. Replies to these are still included',
  },
  {
    type: 'skip_posts_units',
    title: 'Skip Posts with Media',
    percentage: '~30%',
    description: 'Skip entire posts (and all their comments) if the post contains media',
  },
  {
    type: 'skip_thread_units',
    title: 'Skip Media Threads',
    percentage: '~25%',
    description: 'Skip comments with media AND all their replies. Most aggressive filtering',
  },
  {
    type: 'enrich',
    title: 'Enrich Media Content',
    percentage: 'N/A',
    description: 'Process and analyze media content (images, videos) using AI',
    disabled: true,
    disabledReason: 'Coming Soon',
  },
];

// Visual example component showing thread with crossed-out items
interface ThreadExampleProps {
  strategyType: MediaStrategySkipType;
}

const ThreadExample: React.FC<ThreadExampleProps> = ({ strategyType }) => {
  const renderThread = () => {
    switch (strategyType) {
      case 'ignore':
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-700">Post: "Check this out!" 📸</span>
            </div>
            <div className="ml-4 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-gray-600">└─ Comment: "Nice photo!"</span>
            </div>
            <div className="ml-8 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">└─ Reply: "I agree"</span>
            </div>
          </div>
        );

      case 'skip_units':
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1 opacity-40 line-through">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-gray-500">Post: "Check this out!" 📸</span>
            </div>
            <div className="ml-4 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-gray-600">└─ Comment: "Nice photo!"</span>
            </div>
            <div className="ml-8 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">└─ Reply: "I agree"</span>
            </div>
          </div>
        );

      case 'skip_posts_units':
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1 opacity-40 line-through">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-gray-500">Post: "Check this out!" 📸</span>
            </div>
            <div className="ml-4 flex items-center gap-1 opacity-40 line-through">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <span className="text-gray-500">└─ Comment: "Nice photo!"</span>
            </div>
            <div className="ml-8 flex items-center gap-1 opacity-40 line-through">
              <div className="w-1 h-1 rounded-full bg-red-400"></div>
              <span className="text-gray-500">└─ Reply: "I agree"</span>
            </div>
          </div>
        );

      case 'skip_thread_units':
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-700">Post: "My question?"</span>
            </div>
            <div className="ml-4 flex items-center gap-1 opacity-40 line-through">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <span className="text-gray-500">└─ Comment: "See image" 📸</span>
            </div>
            <div className="ml-8 flex items-center gap-1 opacity-40 line-through">
              <div className="w-1 h-1 rounded-full bg-red-400"></div>
              <span className="text-gray-500">└─ Reply: "Thanks!"</span>
            </div>
          </div>
        );

      case 'enrich':
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <span className="text-gray-700">Post: "Check this!" 📸 + AI</span>
            </div>
            <div className="ml-4 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-gray-600">└─ Comment: "Nice!"</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Example Thread
      </div>
      {renderThread()}
    </div>
  );
};

export const MediaStrategyModal: React.FC<MediaStrategyModalProps> = ({
  isOpen,
  onClose,
  onSelectStrategy,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={true} blurBackground={true} maxWidth="max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Select Media Filtering Strategy
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Choose how to handle posts and comments that contain media (images, videos, etc.)
        </p>

        <div className="grid grid-cols-1 gap-4 max-h-[70vh] overflow-y-auto pr-2">
          {strategyOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => !option.disabled && onSelectStrategy(option.type)}
              disabled={option.disabled}
              className={`
                relative text-left p-6 rounded-xl border-2 transition-all duration-200
                ${
                  option.disabled
                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-gray-300 hover:border-blue-500 hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                }
              `}
            >
              {/* Disabled Badge */}
              {option.disabled && option.disabledReason && (
                <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {option.disabledReason}
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
                <div className="ml-4">
                  <div className={`
                    text-2xl font-bold px-4 py-2 rounded-lg
                    ${option.disabled ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'}
                  `}>
                    {option.percentage}
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    data retained
                  </div>
                </div>
              </div>

              {/* Visual Example */}
              <ThreadExample strategyType={option.type} />

              {/* Selection Indicator */}
              {!option.disabled && (
                <div className="absolute bottom-4 right-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Why filter media content?
              </p>
              <p className="text-xs text-blue-800">
                Reddit posts often contain images and videos. Without AI processing (Enrich mode),
                media-heavy content can dilute text analysis. Choose a filtering strategy based on
                your research needs and data quality requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

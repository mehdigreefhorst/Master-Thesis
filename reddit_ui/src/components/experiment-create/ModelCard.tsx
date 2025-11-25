import React from 'react';
import { ModelInfo } from '@/types/model';
import { Heart } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ModelCardProps {
  model: ModelInfo;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  className?: string;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
  className = '',
}) => {
  const formatPrice = (price: number) => price;
  const formatContext = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens ? tokens.toString() : undefined;
  };

  return (
    <Card
      onClick={onSelect}
      className={`
        p-4 cursor-pointer transition-all duration-200 border-2
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'hover:border-gray-300'
        }
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-(--foreground)">
              {model.name}
            </h3>
            {model.supports_reasoning && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                Reasoning
              </Badge>
            )}
            
          </div>
          {model.free_available && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                Free available
              </Badge>
            )}
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            {model.provider}
          </p>
        </div>

        {/* Favorite Heart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-all ${
              isFavorite
                ? 'fill-red-500 stroke-red-500'
                : 'stroke-gray-400 hover:stroke-red-400'
            }`}
          />
        </button>
      </div>

      {/* Description */}
      {model.description && (
        <p className="text-xs text-(--muted-foreground) mb-3">
          {model.description}
        </p>
      )}

      {/* Pricing Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">Input</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatPrice(model.pricing.prompt)}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/1M</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">Output</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatPrice(model.pricing.completion)}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/1M</span>
          </div>
        </div>

        {model.pricing.reasoning && (
          <div className="col-span-2 bg-purple-50 dark:bg-purple-900/20 rounded p-2">
            <div className="text-xs text-purple-600 dark:text-purple-400">Reasoning</div>
            <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              {formatPrice(model.pricing.reasoning)}
              <span className="text-xs font-normal text-purple-600 dark:text-purple-400">/1M</span>
            </div>
          </div>
        )}
      </div>

      {/* Context Window */}
      <div className="flex items-center justify-between pt-2 border-t border-(--border)">
        <span className="text-xs text-(--muted-foreground)">Context</span>
        <span className="text-xs font-medium text-(--foreground)">
          {formatContext(model.max_context)} tokens
        </span>
      </div>
    </Card>
  );
};

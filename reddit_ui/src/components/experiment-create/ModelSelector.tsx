import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ModelCard } from './ModelCard';
import { ModelInfo } from '@/types/model';
import { useAuthFetch } from '@/utils/fetch';
import { modelsApi } from '@/lib/api';
import { useToast } from '../ui/use-toast';
import { ComplexSelector, ComplexSelectorTab, ComplexSelectorGroup } from '../ui';

interface ModelSelectorProps {
  availableModels: ModelInfo[];
  selectedModel?: ModelInfo;
  onModelChange: (model: ModelInfo) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  selectedModel,
  onModelChange,
  className = '',
}) => {
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Fetch favorite models on mount
  useEffect(() => {
    async function fetchFavorites() {
      try {
        setIsLoadingFavorites(true);
        const data = await modelsApi.getFavoriteModels(authFetch);
        setFavoriteModelIds(data.favorite_models || []);
      } catch (err) {
        console.error('Failed to fetch favorite models:', err);
        setFavoriteModelIds([]);
      } finally {
        setIsLoadingFavorites(false);
      }
    }

    fetchFavorites();
  }, [authFetch]);

  const handleToggleFavorite = async (modelId: string) => {
    const isFavorite = favoriteModelIds.includes(modelId);

    // Optimistic update
    setFavoriteModelIds((prev) =>
      isFavorite ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );

    try {
      if (isFavorite) {
        await modelsApi.removeFavoriteModel(authFetch, modelId);
        toast({
          title: `Removed model ${modelId}`,
          description: 'Model successfully removed!',
          variant: 'info',
        });
      } else {
        await modelsApi.addFavoriteModel(authFetch, modelId);
        toast({
          title: `Added model ${modelId}`,
          description: 'Model successfully added to favorites!',
          variant: 'success',
        });
      }
    } catch (err) {
      toast({
        title: `Failed to ${isFavorite ? 'remove' : 'add'} model ${modelId}`,
        description: `Error = ${err}`,
        variant: 'destructive',
      });
      console.error('Failed to toggle favorite:', err);
      // Revert on error
      setFavoriteModelIds((prev) =>
        isFavorite ? [...prev, modelId] : prev.filter((id) => id !== modelId)
      );
    }
  };

  // Define tabs
  const tabs: ComplexSelectorTab<ModelInfo>[] = [
    {
      id: 'all',
      label: 'All Models',
      badge: availableModels.length,
    },
    {
      id: 'favorites',
      label: '❤️ Favorites',
      badge: favoriteModelIds.length > 0 ? favoriteModelIds.length : undefined,
      filter: (model) => favoriteModelIds.includes(model.id),
    },
  ];

  // Group by provider
  const groupByProvider = (models: ModelInfo[]): ComplexSelectorGroup<ModelInfo>[] => {
    const grouped = models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, ModelInfo[]>);

    return Object.entries(grouped).map(([provider, items]) => ({
      id: provider,
      label: provider,
      items,
    }));
  };

  // Search filter
  const searchFilter = (model: ModelInfo, query: string) => {
    const lowerQuery = query.toLowerCase();
    return (
      model.name.toLowerCase().includes(lowerQuery) ||
      model.provider.toLowerCase().includes(lowerQuery) ||
      model.description?.toLowerCase().includes(lowerQuery) ||
      false
    );
  };

  // Render selected item
  const renderSelectedItem = (model: ModelInfo) => (
    <div className="flex items-center gap-2">
      <span className="font-medium">{model.name}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">{model.provider}</span>
      {favoriteModelIds.includes(model.id) && <span className="text-red-500">❤️</span>}
    </div>
  );

  // Render item (model card)
  const renderItem = (model: ModelInfo, isSelected: boolean) => (
    <ModelCard
      model={model}
      isFavorite={favoriteModelIds.includes(model.id)}
      isSelected={isSelected}
      onSelect={() => {}}
      onToggleFavorite={() => handleToggleFavorite(model.id)}
    />
  );

  // Render footer
  const renderFooter = () => (
    <Link
      href="/models"
      className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors py-2"
    >
      <ExternalLink className="w-4 h-4" />
      View Model Statistics & Benchmarks
    </Link>
  );

  // Empty tab text
  const emptyTabText = (tabId: string) => {
    if (tabId === 'favorites' && favoriteModelIds.length === 0) {
      return 'No favorite models yet. Click the ❤️ icon to add models to your favorites';
    }
    return 'No models found';
  };

  return (
    <ComplexSelector<ModelInfo>
      items={availableModels}
      selectedItem={selectedModel || null}
      onSelect={onModelChange}
      tabs={tabs}
      defaultTab="all"
      groupBy={groupByProvider}
      label="Model"
      placeholder="Select a model"
      renderSelectedItem={renderSelectedItem}
      renderItem={renderItem}
      renderFooter={renderFooter}
      enableSearch={true}
      searchPlaceholder="Search models..."
      searchFilter={searchFilter}
      isLoading={isLoadingFavorites}
      className={className}
      dropdownWidth="md:w-[600px]"
      emptyTabText={emptyTabText}
    />
  );
};

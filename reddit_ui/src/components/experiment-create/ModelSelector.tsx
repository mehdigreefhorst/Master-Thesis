import React, { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ModelCard } from './ModelCard';
import { ModelInfo, AVAILABLE_MODELS } from '@/types/model';
import { useAuthFetch } from '@/utils/fetch';
import { modelsApi } from '@/lib/api';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/use-toast';

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onModelChange,
  className = '',
}) => {
  const { toast } = useToast();

  const authFetch = useAuthFetch();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId);

  // Fetch favorite models on mount
  useEffect(() => {
    async function fetchFavorites() {
      try {
        setIsLoadingFavorites(true);
        const data = await modelsApi.getFavoriteModels(authFetch);
        setFavoriteModelIds(data.favorite_models || []);
      } catch (err) {
        console.error('Failed to fetch favorite models:', err);
        // Silently fail - favorites feature is optional
        // User can still use the selector without favorites
        setFavoriteModelIds([]);
      } finally {
        setIsLoadingFavorites(false);
      }
    }

    fetchFavorites();
  }, [authFetch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggleFavorite = async (modelId: string) => {
    const isFavorite = favoriteModelIds.includes(modelId);

    // Optimistic update
    setFavoriteModelIds(prev =>
      isFavorite
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );

    try {
      if (isFavorite) {
        await modelsApi.removeFavoriteModel(authFetch, modelId);
        toast({
          title: `Removed model ${modelId}`,
          description: "Model succesfully removed!",
          variant: "info"
        });
      } else {
        await modelsApi.addFavoriteModel(authFetch, modelId);
        toast({
          title: `Added model ${modelId}`,
          description: "Model succesfully added to favorites!",
          variant: "success"
        });
      }
    } catch (err) {
      toast({
          title: `Failed to ${isFavorite ? "remove" : "add"} model ${modelId}`,
          description: `Error = ${err}`,
          variant: "destructive"
        });
      console.error('Failed to toggle favorite:', err);
      console.warn('Favorites feature may not be available on the backend');
      // Revert on error
      setFavoriteModelIds(prev =>
        isFavorite
          ? [...prev, modelId]
          : prev.filter(id => id !== modelId)
      );
      // Don't show error to user - just log it
    }
  };

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  // Filter models based on search and tab
  const filteredModels = AVAILABLE_MODELS.filter(model => {
    const matchesSearch =
      searchQuery === '' ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'favorites' && favoriteModelIds.includes(model.id));

    return matchesSearch && matchesTab;
  });

  // Group by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Model
      </label>

      {/* Selected Model Display / Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-4 py-2 border border-gray-300 rounded-lg
                 bg-white text-gray-900 text-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 cursor-pointer transition-shadow
                 flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          {selectedModel ? (
            <>
              <span className="font-medium">{selectedModel.name}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{selectedModel.provider}</span>
              {favoriteModelIds.includes(selectedModel.id) && (
                <span className="text-red-500">❤️</span>
              )}
            </>
          ) : (
            <span className="text-gray-400">Select a model</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full md:w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-[panelExpand_200ms_ease-out]">
          {/* Search Bar */}
          <div className="p-3 border-b border-(--border)">
            <Input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              variant="primary"
              className="text-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All Models ({AVAILABLE_MODELS.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'favorites'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span>❤️ Favorites</span>
              {favoriteModelIds.length > 0 && (
                <Badge variant="error" className="px-1.5 py-0.5">
                  {favoriteModelIds.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Models List */}
          <div className="max-h-[500px] overflow-y-auto p-3">
            {Object.keys(groupedModels).length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {activeTab === 'favorites' && favoriteModelIds.length === 0 ? (
                  <div className="space-y-2">
                    <p>No favorite models yet</p>
                    <p className="text-xs">Click the ❤️ icon to add models to your favorites</p>
                  </div>
                ) : (
                  <p>No models found matching "{searchQuery}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedModels).map(([provider, models]) => (
                  <div key={provider}>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {provider}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {models.map(model => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          isFavorite={favoriteModelIds.includes(model.id)}
                          isSelected={model.id === selectedModelId}
                          onSelect={() => handleSelectModel(model.id)}
                          onToggleFavorite={() => handleToggleFavorite(model.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Model Statistics Link */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <Link
              href="/models"
              className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Model Statistics & Benchmarks
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

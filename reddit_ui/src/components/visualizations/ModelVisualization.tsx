// components/ModelVisualization.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { visualizationApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import { useToast } from '@/components/ui/use-toast';

interface ModelSelectData {
  modelId: string;
  modelName: string;
  provider: string;
}

interface ModelVisualizationProps {
  htmlContent?: string; // Optional: if provided, uses this instead of fetching
  onModelSelect?: (model: ModelSelectData) => void;
  onMultipleModelsSelect?: (models: ModelSelectData[]) => void;
  heightPixels?: number;
  className?: string;
}

// Base width the iframe content is designed for
const IFRAME_BASE_WIDTH = 1450;

const ModelVisualization: React.FC<ModelVisualizationProps> = ({
  htmlContent: htmlContentProp,
  onModelSelect,
  onMultipleModelsSelect,
  heightPixels = 900,
  className = ""
}) => {
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>(htmlContentProp || '');
  const [loading, setLoading] = useState<boolean>(!htmlContentProp);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const previousBlobUrlRef = useRef<string | null>(null);
  const [scale, setScale] = useState<number>(heightPixels/IFRAME_BASE_WIDTH);

  // Update htmlContent when prop changes
  useEffect(() => {
    if (htmlContentProp) {
      setHtmlContent(htmlContentProp);
      setLoading(false);
    }
  }, [htmlContentProp]);

  // Fetch the visualization HTML from Flask backend (only if not provided as prop)
  useEffect(() => {
    if (htmlContentProp) return; // Skip fetching if content is provided

    const loadVisualization = async () => {
      try {
        setLoading(true);
        setError(null);
        const htmlList = await visualizationApi.getVisualization(authFetch);
        // Take the first one if fetching directly
        setHtmlContent(htmlList[0] || '');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load visualization';
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadVisualization();
  }, [htmlContentProp]);

  // Handle messages from iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Optional: Add origin check for security
    // if (event.origin !== 'your-expected-origin') return;
    
    if (event.data.type === 'plotly-click') {
      // Single point clicked
      const modelData: ModelSelectData = {
        modelId: event.data.modelId,
        modelName: event.data.modelName,
        provider: event.data.provider
      };
      
      onModelSelect?.(modelData);
    }
    
    if (event.data.type === 'plotly-selected' && event.data.points) {
      // Multiple points selected
      const selectedModels: ModelSelectData[] = event.data.points.map((point: any) => ({
        modelId: point.modelId,
        modelName: point.modelName,
        provider: point.provider
      }));
      
      onMultipleModelsSelect?.(selectedModels);
    }
  }, [onModelSelect, onMultipleModelsSelect]);

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Create blob URL for HTML content
  useEffect(() => {
    if (htmlContent) {
      // Clean up previous blob URL
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
      }

      // Create new blob URL
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const newBlobUrl = URL.createObjectURL(blob);
      previousBlobUrlRef.current = newBlobUrl;
      setBlobUrl(newBlobUrl);
    }

    // Cleanup on unmount
    return () => {
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
      }
    };
  }, [htmlContent]);

  // Measure container and calculate scale
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newScale = containerWidth / IFRAME_BASE_WIDTH;
        setScale(Math.min(newScale, 1)); // Don't scale up, only down
      }
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-lg text-gray-600">Loading visualization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-red-500">
          <p className="font-semibold">Error loading visualization</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return null;
  }

  // Calculate the scaled height to maintain aspect ratio
  const baseHeight = heightPixels || 900;
  const scaledHeight = baseHeight * scale;

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ height: `${scaledHeight}px` }}
    >
      <iframe
        ref={iframeRef}
        src={blobUrl}
        width={IFRAME_BASE_WIDTH}
        height={baseHeight}
        style={{
          border: 'none',
          display: 'block',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        title="Model Performance Visualization"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};


export default ModelVisualization;
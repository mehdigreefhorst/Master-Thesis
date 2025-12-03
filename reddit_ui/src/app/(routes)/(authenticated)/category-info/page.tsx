'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { labelTemplateApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import type { LabelTemplate } from '@/types/category-info';
import { Card } from '@/components/ui/Card';

export default function LabelTemplateViewPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('id');
  const authFetch = useAuthFetch();

  const [labelTemplate, setLabelTemplate] = useState<LabelTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setLabelTemplate(null);
      return;
    }

    const fetchLabelTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await labelTemplateApi.getLabelTemplateById(authFetch, categoryId);
        setLabelTemplate(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch category info');
      } finally {
        setLoading(false);
      }
    };

    fetchLabelTemplate();
  }, [categoryId, authFetch]);

  if (!categoryId) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              Select a category to view
            </h3>
            <p className="mt-2 text-gray-600">
              Choose a category from the sidebar or create a new one
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading category info...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!labelTemplate) {
    return null;
  }
  
  console.log("labelTemplate = ", labelTemplate)

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{labelTemplate.category_name}</h1>
          <p className="mt-2 text-gray-600">{labelTemplate.category_description}</p>
          <div className="mt-4 flex gap-3">
            {labelTemplate.is_public && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                Public
              </span>
            )}
            {labelTemplate.multi_label_possible && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                Multi-label
              </span>
            )}
          </div>
        </div>

        {/* Labels Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Labels</h2>
          <div className="space-y-4">
            {labelTemplate.labels.map((label, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{label.label}</h3>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                    {label.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{label.explanation}</p>
                {label.possible_values.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Possible Values:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {label.possible_values.map((value, i) => (
                        <span
                          key={i}
                          className="inline-flex px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Per-Label Fields Section */}
        {labelTemplate.llm_prediction_fields_per_label.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Per-Label Fields</h2>
            <div className="space-y-4">
              {labelTemplate.llm_prediction_fields_per_label.map((field, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{field.label}</h3>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                      {field.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{field.explanation}</p>
                  {field.possible_values.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        Possible Values:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {field.possible_values.map((value, i) => (
                          <span
                            key={i}
                            className="inline-flex px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

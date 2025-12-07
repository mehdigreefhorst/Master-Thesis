'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { labelTemplateApi } from '@/lib/api';
import { useAuthFetch } from '@/utils/fetch';
import type { LabelTemplate } from '@/types/label-template';

export default function LabelTemplateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const authFetch = useAuthFetch();

  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch all category infos
  useEffect(() => {
    const fetchLabelTemplates = async () => {
      try {
        setLoading(true);
        const data = await labelTemplateApi.getAllLabelTemplates(authFetch);
        setLabelTemplates(data);
      } catch (err) {
        console.error('Failed to fetch category infos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLabelTemplates();
  }, [authFetch]);

  const isCreatePage = pathname.includes('/create');

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Category Info</h2>

          {/* Create Button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/label-template/create')}
          >
            + Create New Category
          </Button>

          {/* Category Info List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Your Categories
            </h3>

            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : labelTemplates.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">
                No categories yet. Create your first one!
              </div>
            ) : (
              <div className="space-y-1">
                
                {labelTemplates.map((info) => (
                  <button
                    key={info.id}
                    onClick={() => {
                      setSelectedId(info.id);
                      router.push(`/label-template?id=${info.id}`);
                    }}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg transition-all
                      ${
                        selectedId === info.id && !isCreatePage
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-900'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    <div className="font-semibold truncate">{info.category_name}</div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {info.labels.length} labels
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Existing Button (shown when on create page) */}
          {isCreatePage && labelTemplates.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/label-template')}
              >
                ← View Category Info
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

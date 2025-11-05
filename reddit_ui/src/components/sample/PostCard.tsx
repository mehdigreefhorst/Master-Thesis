'use client';

import React, { memo } from 'react';
import type { ClusterUnitEntity } from '@/types/cluster-unit';

interface PostCardProps {
  post: ClusterUnitEntity;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const PostCardComponent: React.FC<PostCardProps> = ({ post, isSelected, onToggleSelect }) => {
  const formattedDate = new Date(post.created_utc * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const displayText = post.text.length > 200 ? post.text.substring(0, 200) + '...' : post.text;
  const totalComments = post.thread_path_text?.length || 0;

  return (
    <div
      onClick={() => onToggleSelect(post.id)}
      className={`
        relative flex-shrink-0 w-[320px] h-[450px]
        rounded-xl border-2 p-6
        transition-all duration-300 ease-out
        cursor-pointer
        ${
          isSelected
            ? 'bg-green-50 border-green-500 shadow-[0_8px_24px_rgba(34,197,94,0.25)] scale-[1.02]'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg hover:-translate-y-1'
        }
      `}
    >
      {/* Selection indicator */}
      <div
        className={`
          absolute top-4 right-4 w-6 h-6 rounded-full border-2
          flex items-center justify-center
          transition-all duration-200
          ${
            isSelected
              ? 'bg-green-500 border-green-500 scale-110'
              : 'bg-white border-gray-300'
          }
        `}
      >
        {isSelected && (
          <svg
            className="w-4 h-4 text-white animate-[checkmark_200ms_ease-out]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Post Type Badge */}
      <div className="mb-3">
        <span
          className={`
            inline-block px-3 py-1 text-xs font-semibold rounded-full
            ${
              post.type === 'post'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }
          `}
        >
          {post.type === 'post' ? '📝 Post' : '💬 Comment'}
        </span>
      </div>

      {/* Author */}
      <div className="mb-2 text-sm font-medium text-gray-700">
        u/{post.author}
      </div>

      {/* Content */}
      <div className="mb-4 flex-grow overflow-hidden">
        <p className="text-sm text-gray-800 leading-relaxed line-clamp-6">
          {displayText}
        </p>
      </div>

      {/* Metadata Grid */}
      <div className="mt-auto space-y-2 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">⬆️</span>
            <span className="text-gray-600 font-medium">{post.upvotes}</span>
            <span className="text-gray-400">upvotes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">⬇️</span>
            <span className="text-gray-600 font-medium">{post.downvotes}</span>
            <span className="text-gray-400">downvotes</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">💬</span>
            <span className="text-gray-600 font-medium">{post.total_nested_replies}</span>
            <span className="text-gray-400">comments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">📅</span>
            <span className="text-gray-600 font-medium">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div
        className={`
          absolute inset-0 rounded-xl pointer-events-none
          transition-opacity duration-200
          ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
        }}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render if the post ID or selection state changes
export const PostCard = memo(PostCardComponent, (prev, next) => {
  return prev.post.id === next.post.id && prev.isSelected === next.isSelected;
});

'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { PostCard } from './PostCard';

interface HorizontalScrollGridProps {
  posts: ClusterUnitEntity[];
  selectedPosts: Set<string>;
  onToggleSelect: (id: string) => void;
}

export const HorizontalScrollGrid: React.FC<HorizontalScrollGridProps> = ({
  posts,
  selectedPosts,
  onToggleSelect,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Hide scroll hint after user scrolls
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollLeft > 50) {
        setShowScrollHint(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-hide hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScrollHint(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      {/* Scroll hint */}
      {showScrollHint && posts.length > 3 && (
        <div
          className="
            absolute right-8 top-1/2 -translate-y-1/2 z-10
            bg-blue-500 text-white px-4 py-2 rounded-lg
            shadow-lg animate-[bounce_1s_ease-in-out_infinite]
            pointer-events-none
          "
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Scroll horizontally</span>
            <span className="text-lg">→</span>
          </div>
        </div>
      )}

      {/* Horizontal scroll container */}
      <div
        ref={scrollContainerRef}
        className="
          overflow-x-auto overflow-y-visible
          pb-6 pt-4
          snap-x snap-mandatory
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
        "
        style={{
          scrollbarWidth: 'thin',
          scrollBehavior: 'smooth',
        }}
      >
        {/* Grid of posts */}
        <div className="flex gap-6 px-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="snap-start animate-[slideInRight_400ms_ease-out]"
              style={{
                animationDelay: `${Math.min(index * 50, 500)}ms`,
                animationFillMode: 'both',
              }}
            >
              <PostCard
                post={post}
                isSelected={selectedPosts.has(post.id)}
                onToggleSelect={onToggleSelect}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicators (left/right fade) */}
      <div className="absolute left-0 top-0 bottom-6 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-6 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
    </div>
  );
};

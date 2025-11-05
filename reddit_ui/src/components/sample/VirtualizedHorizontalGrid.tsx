'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { PostCard } from './PostCard';

interface VirtualizedHorizontalGridProps {
  posts: ClusterUnitEntity[];
  selectedPosts: Set<string>;
  onToggleSelect: (id: string) => void;
}

const CARD_WIDTH = 320;
const CARD_GAP = 24;
const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_GAP;
const OVERSCAN_COUNT = 3; // Render extra cards on each side for smooth scrolling

export const VirtualizedHorizontalGrid: React.FC<VirtualizedHorizontalGridProps> = ({
  posts,
  selectedPosts,
  onToggleSelect,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update scroll position and container width
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollLeft(container.scrollLeft);
      if (container.scrollLeft > 50) {
        setShowScrollHint(false);
      }
    };

    const handleResize = () => {
      setContainerWidth(container.clientWidth);
    };

    handleScroll();
    handleResize();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-hide hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScrollHint(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Calculate which posts should be rendered
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollLeft / TOTAL_CARD_WIDTH) - OVERSCAN_COUNT
    );
    const endIndex = Math.min(
      posts.length,
      Math.ceil((scrollLeft + containerWidth) / TOTAL_CARD_WIDTH) + OVERSCAN_COUNT
    );

    return { startIndex, endIndex };
  }, [scrollLeft, containerWidth, posts.length]);

  // Get visible posts with their positions
  const visiblePosts = useMemo(() => {
    return posts
      .slice(visibleRange.startIndex, visibleRange.endIndex)
      .map((post, relativeIndex) => ({
        post,
        index: visibleRange.startIndex + relativeIndex,
        offsetLeft: (visibleRange.startIndex + relativeIndex) * TOTAL_CARD_WIDTH,
      }));
  }, [posts, visibleRange.startIndex, visibleRange.endIndex]);

  // Total width of all posts
  const totalWidth = posts.length * TOTAL_CARD_WIDTH;

  // Memoized toggle handler to prevent recreating on every render
  const handleToggle = useCallback((id: string) => {
    onToggleSelect(id);
  }, [onToggleSelect]);

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
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
        "
        style={{
          scrollbarWidth: 'thin',
          scrollBehavior: 'smooth',
        }}
      >
        {/* Virtual scroll container with total width */}
        <div
          className="relative"
          style={{
            width: `${totalWidth}px`,
            height: '450px',
          }}
        >
          {/* Render only visible posts */}
          {visiblePosts.map(({ post, index, offsetLeft }) => (
            <div
              key={post.id}
              className="absolute top-0 animate-[slideInRight_400ms_ease-out]"
              style={{
                left: `${offsetLeft}px`,
                width: `${CARD_WIDTH}px`,
                animationDelay: `${Math.min(index * 50, 500)}ms`,
                animationFillMode: 'both',
              }}
            >
              <PostCard
                post={post}
                isSelected={selectedPosts.has(post.id)}
                onToggleSelect={handleToggle}
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

import { ClusterUnitEntity } from "@/types/cluster-unit";
import React, { useState, useEffect } from 'react';
import { Button } from "../ui";
import { ThreadBox } from "./ThreadBox";
import { ThreadPost } from "./ThreadPost";
import { ThreadComment } from "./ThreadComment";
import { ThreadTarget } from "./ThreadTarget";
import Link from "next/link";
import { ExternalLink } from "lucide-react";


interface ThreadFromUnitProps {
  clusterUnitEntity: ClusterUnitEntity;
  defaultExpanded?: boolean; // true = show full thread, false = show only target
}

export const ThreadFromUnit: React.FC<ThreadFromUnitProps> = ({
  clusterUnitEntity,
  defaultExpanded = false

}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Reset to default state when clusterUnitEntity changes

  // Toggle between expanded and collapsed view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Render thread from thread_path_text
  const renderThread = () => {
    if (!clusterUnitEntity) return null;

    const threadPath = clusterUnitEntity.thread_path_text || [];
    const threadPathAuthor = clusterUnitEntity.thread_path_author || [];
    const currentText = clusterUnitEntity.text;

    return (
      <ThreadBox>
        {isExpanded && threadPath.map((text, index) => {
          if (index === 0) { 
            return <ThreadPost key={index} username={`u/${threadPathAuthor[index] ?? `u/author${index}`}`} content={text} />;
          }
          return <ThreadComment key={index} username={`u/${threadPathAuthor[index] ?? `u/author${index}`}`} content={text} />;
        })}
        <ThreadTarget username={clusterUnitEntity.author} clusterUnitType={clusterUnitEntity.type } content={currentText} label={clusterUnitEntity.type === "post" ? "⭐ ANALYZING THIS POST" : "⭐ ANALYZING THIS REPLY"}/>
      </ThreadBox>
    );
  };
  // Format date from UTC timestamp
  const formatDate = (utcTimestamp: number) => {
    const date = new Date(utcTimestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate depth from thread_path_text
  const depth = clusterUnitEntity.thread_path_text?.length || 0;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            r/{clusterUnitEntity.type === 'post' ? 'post' : 'comment'} Thread:
          </h2>
          <div className="flex items-center gap-2 text-sm">
            {clusterUnitEntity.type === 'comment' && (
              <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                <span className="font-medium">Depth:</span> {depth}
              </span>
            )}
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
              <span className="font-medium">↑</span> {clusterUnitEntity.upvotes}
            </span>
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              <span className="font-medium">Date:</span> {formatDate(clusterUnitEntity.created_utc)}
            </span>

          <Link 
            href={`https://www.reddit.com${clusterUnitEntity.permalink}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
              <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200 hover:bg-orange-200 transition-colors cursor-pointer">
                <span className="font-medium">View on Reddit</span>
                <ExternalLink className="h-4 w-4" />
            </span>
          </Link>
          </div>
        </div>
        <Button
          className="text-sm text-blue-600"
          variant="invisible"
          onClick={toggleExpanded}
        >
          {isExpanded ? 'View Target Only ▲' : 'View Full Thread ▼'}
        </Button>
      </div>

      {renderThread()}
    </div>
  )

}

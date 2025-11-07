import { ClusterUnitEntity } from "@/types/cluster-unit";
import React from 'react';
import { Button } from "../ui";
import { ThreadBox } from "./ThreadBox";
import { ThreadPost } from "./ThreadPost";
import { ThreadComment } from "./ThreadComment";
import { ThreadTarget } from "./ThreadTarget";


interface ThreadFromUnitProps {
  currentUnit: ClusterUnitEntity;
}

export const ThreadFromUnit: React.FC<ThreadFromUnitProps> = ({
  currentUnit

}) => {
  // Render thread from thread_path_text
  const renderThread = () => {
    if (!currentUnit) return null;

    const threadPath = currentUnit.thread_path_text || [];
    const currentText = currentUnit.text;

    return (
      <ThreadBox>
        {threadPath.map((text, index) => {
          if (index === 0) {
            return <ThreadPost key={index} username={`u/author${index}`} content={text} />;
          }
          return <ThreadComment key={index} username={`u/author${index}`} content={text} />;
        })}
        <ThreadTarget username={currentUnit.author} content={currentText} />
      </ThreadBox>
    );
  };
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">
          r/{currentUnit.type === 'post' ? 'post' : 'comment'} Thread:
        </h2>
        <Button className="text-sm text-blue-600" variant="invisible">
          View Full ▼
        </Button>
      </div>

      {renderThread()}
    </div>  
  )

}

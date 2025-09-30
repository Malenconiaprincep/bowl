import React from 'react';
import type { Block } from "../types/blocks";
import type { ASTNode } from "../types/ast";

// 使用 React.lazy 动态导入
const TextBlock = React.lazy(() => import("../blocks/text"));
const ImageBlock = React.lazy(() => import("../blocks/image"));

interface BlockComponentProps {
  block: Block;
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: ASTNode[]) => void;
  onDeleteBlock?: (blockIndex: number) => void;
  onFindPreviousTextBlock?: (currentIndex: number) => number;
  onFocusBlockAtEnd?: (blockIndex: number) => void;
  onMergeWithPreviousBlock?: (currentIndex: number, currentContent: ASTNode[]) => void;
}

export default function BlockComponent({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock,
  onDeleteBlock,
  onFindPreviousTextBlock,
  onFocusBlockAtEnd,
  onMergeWithPreviousBlock
}: BlockComponentProps) {
  let component = null

  switch (block.type) {
    case "media":
      component = (
        <React.Suspense fallback={<div>Loading...</div>}>
          <ImageBlock
            block={block}
            blockIndex={blockIndex}
          />
        </React.Suspense>
      );
      break;

    case "paragraph":
    case "heading":
      component = (
        <React.Suspense fallback={<div>Loading...</div>}>
          <TextBlock
            block={block}
            blockIndex={blockIndex}
            onInsertBlock={onInsertBlock}
            onUpdateBlock={onUpdateBlock}
            onDeleteBlock={onDeleteBlock}
            onFindPreviousTextBlock={onFindPreviousTextBlock}
            onFocusBlockAtEnd={onFocusBlockAtEnd}
            onMergeWithPreviousBlock={onMergeWithPreviousBlock}
          />
        </React.Suspense>
      );
      break;
    default:
      component = <div>Unknown block type: {(block as Block).type}</div>;
      break;
  }

  return (
    <div key={block.id} className="block-container" data-block-index={blockIndex}>
      {component}
    </div>
  )
}
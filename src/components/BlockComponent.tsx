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
}

export default function BlockComponent({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock
}: BlockComponentProps) {
  let component = null

  console.log(JSON.stringify(block.content), '>>>1')

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
          />
        </React.Suspense>
      );
      break;
    default:
      component = <div>Unknown block type: {(block as Block).type}</div>;
      break;
  }

  return (
    <div key={block.id} className="block-container">
      {component}
    </div>
  )
}
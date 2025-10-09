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

const BlockComponent = React.memo(function BlockComponent({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock,
  onDeleteBlock,
  onFindPreviousTextBlock,
  onFocusBlockAtEnd,
  onMergeWithPreviousBlock
}: BlockComponentProps) {
  // 添加调试信息来监控渲染
  console.log(`BlockComponent ${block.id} 渲染了`)
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
    <div className="block-container" data-block-index={blockIndex}>
      {component}
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数，只有当block内容真正改变时才重新渲染
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.blockIndex === nextProps.blockIndex &&
    JSON.stringify(prevProps.block.content) === JSON.stringify(nextProps.block.content) &&
    prevProps.onInsertBlock === nextProps.onInsertBlock &&
    prevProps.onUpdateBlock === nextProps.onUpdateBlock &&
    prevProps.onDeleteBlock === nextProps.onDeleteBlock &&
    prevProps.onFindPreviousTextBlock === nextProps.onFindPreviousTextBlock &&
    prevProps.onFocusBlockAtEnd === nextProps.onFocusBlockAtEnd &&
    prevProps.onMergeWithPreviousBlock === nextProps.onMergeWithPreviousBlock
  );
});

export default BlockComponent;
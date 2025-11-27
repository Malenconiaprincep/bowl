import React, { useImperativeHandle, useRef, forwardRef } from 'react';
import type { TextBlock } from '../../types/blocks';
import type { ContentNode } from '../../types/ast';
import type { Block } from '../../types/blocks';
import type { BlockComponentMethods } from '../../types/blockComponent';
import RichTextEditor from '../../components/editor/RichTextEditor';
import { BlockWrapper } from '../../components/BlockWrapper';

interface TextBlockProps {
  block: TextBlock & {
    id: string
  };
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: ContentNode[]) => void;
  onDeleteBlock?: (blockIndex: number) => void;
  onFindPreviousTextBlock?: (currentIndex: number) => number;
  onFocusBlockAtEnd?: (blockIndex: number) => void;
  onMergeWithPreviousBlock?: (currentIndex: number, currentContent: ContentNode[]) => void;
}

export interface TextMethods extends BlockComponentMethods {
  // TODO: 后面扩展方法
  setSelection: (selection: { start: number; end: number }) => void;
  // 格式化方法
  applyBold: () => void;
  applyItalic: () => void;
  applyUnderline: () => void;
  applyStrikethrough: () => void;
}

const TextBlockComponent = React.memo(forwardRef<TextMethods, TextBlockProps>(({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock,
  onDeleteBlock,
  onFindPreviousTextBlock,
  onFocusBlockAtEnd,
  onMergeWithPreviousBlock
}, ref) => {
  const editorRef = useRef<TextMethods>(null);

  // 暴露聚焦方法，直接转发到 RichTextEditor
  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    },
    blur: () => {
      editorRef.current?.blur();
    },
    getElement: () => {
      return editorRef.current?.getElement() || null;
    },
    setSelection: (selection: { start: number; end: number }) => {
      editorRef.current?.setSelection?.(selection);
    },
    // 格式化方法
    applyBold: () => {
      editorRef.current?.applyBold?.();
    },
    applyItalic: () => {
      editorRef.current?.applyItalic?.();
    },
    applyUnderline: () => {
      editorRef.current?.applyUnderline?.();
    },
    applyStrikethrough: () => {
      editorRef.current?.applyStrikethrough?.();
    }
  }));

  const handleContentChange = (newContent: ContentNode[]) => {
    onUpdateBlock?.(blockIndex, newContent);
  };

  return (
    <RichTextEditor
      ref={editorRef}
      initialContent={block.content}
      onChange={handleContentChange}
      blockId={block.id}
      blockIndex={blockIndex}
      onInsertBlock={onInsertBlock}
      onDeleteBlock={onDeleteBlock}
      onFindPreviousTextBlock={onFindPreviousTextBlock}
      onFocusBlockAtEnd={onFocusBlockAtEnd}
      onMergeWithPreviousBlock={onMergeWithPreviousBlock}
    />
  );
}), (prevProps, nextProps) => {
  // 简化的比较函数：由于回调函数已经通过useMemo稳定化，主要比较数据变化
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.blockIndex === nextProps.blockIndex &&
    JSON.stringify(prevProps.block.content) === JSON.stringify(nextProps.block.content)
    // 回调函数引用已经稳定，不需要比较
  );
});

// 使用高阶组件包裹 TextBlock
const TextBlock = BlockWrapper(TextBlockComponent);
TextBlock.displayName = 'TextBlock';

export default TextBlock;
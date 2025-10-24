import React, { useImperativeHandle, useRef, forwardRef } from 'react';
import type { TextBlock } from '../../types/blocks';
import type { ASTNode } from '../../types/ast';
import type { Block } from '../../types/blocks';
import type { BlockComponentMethods } from '../../types/blockComponent';
import ASTEditor from '../../components/editor/AstRichTextEditor';
import { BlockWrapper } from '../../components/BlockWrapper';

interface TextBlockProps {
  block: TextBlock & {
    id: string
  };
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: ASTNode[]) => void;
  onDeleteBlock?: (blockIndex: number) => void;
  onFindPreviousTextBlock?: (currentIndex: number) => number;
  onFocusBlockAtEnd?: (blockIndex: number) => void;
  onMergeWithPreviousBlock?: (currentIndex: number, currentContent: ASTNode[]) => void;
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
  const astEditorRef = useRef<TextMethods>(null);

  // 暴露聚焦方法，直接转发到 ASTEditor
  useImperativeHandle(ref, () => ({
    focus: () => {
      astEditorRef.current?.focus();
    },
    blur: () => {
      astEditorRef.current?.blur();
    },
    getElement: () => {
      return astEditorRef.current?.getElement() || null;
    },
    setSelection: (selection: { start: number; end: number }) => {
      astEditorRef.current?.setSelection?.(selection);
    },
    // 格式化方法
    applyBold: () => {
      astEditorRef.current?.applyBold?.();
    },
    applyItalic: () => {
      astEditorRef.current?.applyItalic?.();
    },
    applyUnderline: () => {
      astEditorRef.current?.applyUnderline?.();
    },
    applyStrikethrough: () => {
      astEditorRef.current?.applyStrikethrough?.();
    }
  }));

  const handleASTChange = (newAST: ASTNode[]) => {
    onUpdateBlock?.(blockIndex, newAST);
  };

  return (
    <ASTEditor
      ref={astEditorRef}
      initialAST={block.content}
      onChange={handleASTChange}
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
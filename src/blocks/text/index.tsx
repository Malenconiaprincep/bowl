import { useImperativeHandle, useRef, forwardRef } from 'react';
import type { TextBlock } from '../../types/blocks';
import type { ASTNode } from '../../types/ast';
import type { Block } from '../../types/blocks';
import type { BlockComponentMethods } from '../../types/blockComponent';
import ASTEditor from '../../components/editor/AstRichTextEditor';
import { BlockWrapper } from '../../components/BlockWrapper';

interface TextBlockProps {
  block: TextBlock;
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: ASTNode[]) => void;
}

export interface TextMethods extends BlockComponentMethods {
  // TODO: 后面扩展方法
  setSelection: (selection: { start: number; end: number }) => void;
}

const TextBlockComponent = forwardRef<TextMethods, TextBlockProps>(({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock
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
    }
  }));

  const handleASTChange = (newAST: ASTNode[]) => {
    onUpdateBlock?.(blockIndex, newAST);
  };

  return (
    <div>
      <ASTEditor
        ref={astEditorRef}
        initialAST={block.content}
        onChange={handleASTChange}
        blockIndex={blockIndex}
        onInsertBlock={onInsertBlock}
      />
    </div>
  );
});

// 使用高阶组件包裹 TextBlock
const TextBlock = BlockWrapper(TextBlockComponent);
TextBlock.displayName = 'TextBlock';

export default TextBlock;
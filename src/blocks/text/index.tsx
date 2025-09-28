import { useImperativeHandle, useRef } from 'react';
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

function TextBlockComponent({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock
}: TextBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // 暴露聚焦方法
  useImperativeHandle(useRef<BlockComponentMethods>(null), () => ({
    focus: () => {
      // 聚焦到编辑器
      const editor = editorRef.current?.querySelector('[contenteditable]') as HTMLElement;
      if (editor) {
        editor.focus();
      }
    },
    blur: () => {
      // 失焦
      const editor = editorRef.current?.querySelector('[contenteditable]') as HTMLElement;
      if (editor) {
        editor.blur();
      }
    },
    getElement: () => {
      return editorRef.current;
    }
  }));

  const handleASTChange = (newAST: ASTNode[]) => {
    onUpdateBlock?.(blockIndex, newAST);
  };

  return (
    <div ref={editorRef}>
      <ASTEditor
        initialAST={block.content}
        onChange={handleASTChange}
        blockIndex={blockIndex}
        onInsertBlock={onInsertBlock}
      />
    </div>
  );
}

// 使用高阶组件包裹 TextBlock
const TextBlock = BlockWrapper(TextBlockComponent);
TextBlock.displayName = 'TextBlock';

export default TextBlock;
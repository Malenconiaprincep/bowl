import type { TextBlock } from '../../types/blocks';
import type { ASTNode } from '../../types/ast';
import type { Block } from '../../types/blocks';
import ASTEditor from '../../components/editor/AstRichTextEditor';

interface TextBlockProps {
  block: TextBlock;
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: ASTNode[]) => void;
}

export default function TextBlock({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock
}: TextBlockProps) {
  const handleASTChange = (newAST: ASTNode[]) => {
    onUpdateBlock?.(blockIndex, newAST);
  };

  return <div>
    <ASTEditor
      initialAST={block.content}
      onChange={handleASTChange}
      blockIndex={blockIndex}
      onInsertBlock={onInsertBlock}
    />
  </div>;
}